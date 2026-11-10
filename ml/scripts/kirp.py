"""COCO maskelerinden Model 1'in eğitim girdisini üretir: kırpılmış ürün görselleri.

Protokol (ml/veri-protokolu.md, bölüm 4.1): Model 1'in gördüğü girdi görselin tamamı değil,
maskenin sınırlayıcı kutusudur (%5 pay). Çok ürünlü bir görsel böylece her maske için ayrı
eğitim örneği verir.

Çıktı düzeni sınıf klasörleri hâlindedir, PyTorch ImageFolder doğrudan okuyabilir:

    cikti/tisort/tisort_tr01_0042_a7.jpg
    cikti/pantolon/...

Kullanım:
    python ml/scripts/kirp.py etiketli/train/annotations.json ham/ kirpik/train/
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow gerekli: pip install -r ml/scripts/requirements.txt")

PAY = 0.05  # kutunun her kenarına eklenen oran


def pay_ekle(kutu: tuple[float, float, float, float], en: int, boy: int) -> tuple[int, int, int, int]:
    """COCO bbox (x, y, genişlik, yükseklik) → paylı ve görselin içinde kalan (sol, ust, sag, alt)."""
    x, y, g, b = kutu
    px, py = g * PAY, b * PAY
    sol = max(0, int(round(x - px)))
    ust = max(0, int(round(y - py)))
    sag = min(en, int(round(x + g + px)))
    alt = min(boy, int(round(y + b + py)))
    return sol, ust, sag, alt


def kirp(annotations: Path, gorsel_koku: Path, cikti: Path, en_kucuk: int = 32) -> tuple[int, int]:
    veri = json.loads(annotations.read_text(encoding="utf-8"))
    gorseller = {g["id"]: g for g in veri["images"]}
    turler = {k["id"]: k["name"] for k in veri["categories"]}

    yazilan = atlanan = 0
    for ann in veri["annotations"]:
        bilgi = gorseller.get(ann["image_id"])
        tur = turler.get(ann["category_id"])
        if bilgi is None or tur is None or "bbox" not in ann:
            atlanan += 1
            continue

        kaynak = gorsel_koku / bilgi["file_name"]
        if not kaynak.exists():
            # file_name alt klasör taşımıyorsa türe göre ara.
            kaynak = gorsel_koku / tur / Path(bilgi["file_name"]).name
        if not kaynak.exists():
            print(f"  görsel bulunamadı: {bilgi['file_name']}")
            atlanan += 1
            continue

        with Image.open(kaynak) as gorsel:
            gorsel = gorsel.convert("RGB")
            sol, ust, sag, alt = pay_ekle(tuple(ann["bbox"]), gorsel.width, gorsel.height)
            if sag - sol < en_kucuk or alt - ust < en_kucuk:
                print(f"  çok küçük kutu, atlandı: {bilgi['file_name']} ann={ann['id']}")
                atlanan += 1
                continue
            parca = gorsel.crop((sol, ust, sag, alt))

        klasor = cikti / tur
        klasor.mkdir(parents=True, exist_ok=True)
        parca.save(klasor / f"{Path(bilgi['file_name']).stem}_{ann['id']}.jpg", quality=95)
        yazilan += 1

    return yazilan, atlanan


def main() -> int:
    ayrıştırıcı = argparse.ArgumentParser(description="COCO maskelerinden kırpılmış ürün görselleri üretir.")
    ayrıştırıcı.add_argument("annotations", type=Path, help="CVAT'tan dışa aktarılan annotations.json")
    ayrıştırıcı.add_argument("gorsel_koku", type=Path, help="ham görsellerin kökü")
    ayrıştırıcı.add_argument("cikti", type=Path, help="kırpılmışların yazılacağı klasör")
    ayrıştırıcı.add_argument("--en-kucuk", type=int, default=32, help="bu boyuttan küçük kutular atlanır (px)")
    args = ayrıştırıcı.parse_args()

    for yol in (args.annotations, args.gorsel_koku):
        if not yol.exists():
            sys.exit(f"Yok: {yol}")

    yazilan, atlanan = kirp(args.annotations, args.gorsel_koku, args.cikti, args.en_kucuk)
    print(f"\n{yazilan} kırpma yazıldı, {atlanan} tanesi atlandı. Çıktı: {args.cikti}")
    return 0 if yazilan else 1


if __name__ == "__main__":
    raise SystemExit(main())
