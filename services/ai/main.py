"""Sanal Ürün Deneme – yapay zekâ servisi.

Uç noktalar: sağlık kontrolü ve tür tahmini. Segmentasyon, anahtar nokta,
desen bükme, link okuma ve OCR buraya eklenecek.

Tür tahmini şu an SAHTE cevap döner: Model 1 henüz eğitilmedi (#33). Uç noktanın
sözleşmesi şimdiden sabit, böylece arayüz bağlanabilir ve model gelince yalnızca
`_tahmin_et` değişir.
"""

import os
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

SURUM = "0.1.0"

# Sözleşmeyle aynı sırada ve yazımda (docs/glb-sozlesmesi.md, ml/veri-protokolu.md).
TURLER = ("tisort", "pantolon", "gomlek", "elbise", "etek")

AZAMI_BOYUT = 5 * 1024 * 1024  # 5 MB
GORSEL_TURLERI = {"image/jpeg", "image/png"}

# Tarayıcıdan çağıracak arayüzün adresleri. Virgülle ayrılmış liste olarak
# AI_CORS_ORIGINS ortam değişkeninden okunur.
_VARSAYILAN_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS = [
    o.strip() for o in os.getenv("AI_CORS_ORIGINS", _VARSAYILAN_ORIGINS).split(",") if o.strip()
]

app = FastAPI(
    title="Sanal Ürün Deneme – yapay zekâ servisi",
    version=SURUM,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SaglikYaniti(BaseModel):
    durum: str
    surum: str


class TurYaniti(BaseModel):
    tur: str = Field(description="tisort | pantolon | gomlek | elbise | etek")
    guven: float = Field(ge=0.0, le=1.0, description="0–1; model eğitilmeden önce 0.0")
    model_hazir: bool = Field(description="false ise cevap sahtedir, Model 1 henüz yok")


@app.get("/health", response_model=SaglikYaniti, summary="Servis ayakta mı?")
def health() -> SaglikYaniti:
    return SaglikYaniti(durum="ok", surum=SURUM)


def _gorseli_dogrula(gorsel: UploadFile, icerik: bytes) -> None:
    if gorsel.content_type not in GORSEL_TURLERI:
        raise HTTPException(400, f"Yalnızca JPEG ve PNG kabul edilir (gelen: {gorsel.content_type}).")
    if not icerik:
        raise HTTPException(400, "Dosya boş.")
    if len(icerik) > AZAMI_BOYUT:
        raise HTTPException(400, f"Görsel {AZAMI_BOYUT // (1024 * 1024)} MB'ı aşamaz.")
    # JPEG ve PNG imzaları; uzantısı doğru ama içeriği bozuk dosyaları burada eliyoruz.
    if not (icerik.startswith(b"\xff\xd8\xff") or icerik.startswith(b"\x89PNG\r\n\x1a\n")):
        raise HTTPException(400, "Dosya geçerli bir JPEG veya PNG değil.")


def _tahmin_et(icerik: bytes) -> tuple[str, float, bool]:
    """Model 1 gelince burası değişir; uç noktanın sözleşmesi aynı kalır.

    Şimdilik hep ilk türü ve 0 güveni döner. Rastgele tür dönmüyoruz: arayüzü
    yazan kişi sahte cevabı gerçek sanmasın.
    """
    return TURLER[0], 0.0, False


# 400 yanıtını OpenAPI'ye de yazıyoruz; yoksa /docs sayfasında "Undocumented" görünüyor ve
# arayüzü yazan kişi hangi hataların gelebileceğini oradan göremiyor.
HATA_YANITLARI = {
    400: {
        "description": "Geçersiz dosya: desteklenmeyen içerik türü, boş dosya, boyut aşımı ya da bozuk görsel",
        "content": {
            "application/json": {
                "example": {"detail": "Yalnızca JPEG ve PNG kabul edilir (gelen: text/plain)."}
            }
        },
    }
}


@app.post("/tur", response_model=TurYaniti, responses=HATA_YANITLARI, summary="Görseldeki kıyafetin türü")
async def tur(gorsel: Annotated[UploadFile, File(description="JPEG veya PNG, en çok 5 MB")]) -> TurYaniti:
    icerik = await gorsel.read()
    _gorseli_dogrula(gorsel, icerik)
    tahmin, guven, hazir = _tahmin_et(icerik)
    return TurYaniti(tur=tahmin, guven=guven, model_hazir=hazir)
