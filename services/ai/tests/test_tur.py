import io

import pytest
from fastapi.testclient import TestClient

from main import AZAMI_BOYUT, TURLER, app

istemci = TestClient(app)

JPEG_BASI = b"\xff\xd8\xff\xe0"
PNG_BASI = b"\x89PNG\r\n\x1a\n"


def gonder(icerik: bytes, ad: str = "urun.jpg", tur: str = "image/jpeg"):
    return istemci.post("/tur", files={"gorsel": (ad, io.BytesIO(icerik), tur)})


def test_gecerli_jpeg_tur_doner():
    yanit = gonder(JPEG_BASI + b"0" * 100)

    assert yanit.status_code == 200, yanit.text
    veri = yanit.json()
    assert veri["tur"] in TURLER
    assert 0.0 <= veri["guven"] <= 1.0
    assert veri["model_hazir"] is False  # Model 1 eğitilene kadar sahte cevap


def test_gecerli_png_kabul_edilir():
    yanit = gonder(PNG_BASI + b"0" * 100, ad="urun.png", tur="image/png")

    assert yanit.status_code == 200, yanit.text


@pytest.mark.parametrize(
    ("ad", "icerik_turu"),
    [("urun.gif", "image/gif"), ("urun.txt", "text/plain"), ("urun.pdf", "application/pdf")],
)
def test_desteklenmeyen_tur_400(ad, icerik_turu):
    yanit = gonder(JPEG_BASI + b"0" * 10, ad=ad, tur=icerik_turu)

    assert yanit.status_code == 400
    assert "JPEG" in yanit.json()["detail"]


def test_boyut_asimi_400():
    yanit = gonder(JPEG_BASI + b"0" * (AZAMI_BOYUT + 1))

    assert yanit.status_code == 400
    assert "MB" in yanit.json()["detail"]


def test_bozuk_icerik_400():
    """Uzantı ve içerik türü doğru ama dosya JPEG değil."""
    yanit = gonder(b"bu bir gorsel degil" * 10)

    assert yanit.status_code == 400
    assert "JPEG" in yanit.json()["detail"] or "PNG" in yanit.json()["detail"]


def test_bos_dosya_400():
    yanit = gonder(b"")

    assert yanit.status_code == 400


def test_dosya_zorunlu():
    assert istemci.post("/tur").status_code == 422
