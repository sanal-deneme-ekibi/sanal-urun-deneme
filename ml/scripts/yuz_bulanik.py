"""Toplanan görsellerdeki yüzleri bulanıklaştırır.

Protokol (ml/veri-protokolu.md, bölüm 2): yüz görünen görsel atılmaz, yüzü bulanıklaştırılır.
Kırpma yapılmaz; yakadan kesilen bir tişörtte `yaka_orta` anahtar noktası kaybolur.

Bulanıklaştırılmış görsel orijinalinin yerine yazılır. Betiğin kaçırdığı yüzler etiketleme
sırasında görülürse elle bulanıklaştırılır.

Kullanım:
    python ml/scripts/yuz_bulanik.py ham/ --dene        # ne yapacağını yazar, dosyaya dokunmaz
    python ml/scripts/yuz_bulanik.py ham/               # bulanıklaştırır
    python ml/scripts/yuz_bulanik.py ham/ --yedek eski/ # orijinalleri önce buraya kopyalar
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

try:
    import cv2
except ImportError:  # pragma: no cover
    sys.exit("opencv-python gerekli: pip install -r ml/scripts/requirements.txt")

UZANTILAR = {".jpg", ".jpeg", ".png"}


KASKAD_ADI = "haarcascade_frontalface_default.xml"


def _kaskad_yollari() -> list[Path]:
    """Kaskad dosyasının olabileceği yerler. opencv-python 4.x cv2.data ile getirir."""
    adaylar = []
    veri = getattr(cv2, "data", None)
    if veri is not None and getattr(veri, "haarcascades", None):
        adaylar.append(Path(veri.haarcascades) / KASKAD_ADI)
    adaylar.append(Path(cv2.__file__).parent / "data" / KASKAD_ADI)
    adaylar.append(Path(__file__).parent / KASKAD_ADI)
    return adaylar


def _bulucu(yol: Path | None = None) -> cv2.CascadeClassifier:
    adaylar = [yol] if yol else _kaskad_yollari()
    for aday in adaylar:
        if aday and aday.exists():
            bulucu = cv2.CascadeClassifier(str(aday))
            if not bulucu.empty():
                return bulucu
    sys.exit(
        "Yüz bulucu bulunamadı. Aranan yerler:\n"
        + "\n".join(f"  {a}" for a in adaylar if a)
        + "\n\nopencv-python 4.x bu dosyayı kendisi getirir:\n"
        "  pip install -r ml/scripts/requirements.txt\n"
        f"Elinizde varsa yolunu verin: --kaskad <yol>/{KASKAD_ADI}"
    )


def yuzleri_bul(gorsel, bulucu) -> list[tuple[int, int, int, int]]:
    gri = cv2.cvtColor(gorsel, cv2.COLOR_BGR2GRAY)
    gri = cv2.equalizeHist(gri)
    # minSize: ürün üzerindeki küçük desenleri yüz sanmasın diye.
    return [tuple(map(int, k)) for k in bulucu.detectMultiScale(gri, 1.1, 6, minSize=(40, 40))]


def bulaniklastir(gorsel, kutular) -> None:
    """Her kutuyu yerinde bulanıklaştırır. Çekirdek kutu boyutuna göre seçilir."""
    for x, y, g, y_boy in kutular:
        parca = gorsel[y : y + y_boy, x : x + g]
        if parca.size == 0:
            continue
        k = max(9, (min(g, y_boy) // 2) | 1)  # tek sayı olmalı
        gorsel[y : y + y_boy, x : x + g] = cv2.GaussianBlur(parca, (k, k), 0)


def gorselleri_bul(kok: Path) -> list[Path]:
    return sorted(p for p in kok.rglob("*") if p.suffix.lower() in UZANTILAR and p.is_file())


def main() -> int:
    ayrıştırıcı = argparse.ArgumentParser(description="Görsellerdeki yüzleri bulanıklaştırır.")
    ayrıştırıcı.add_argument("kok", type=Path, help="görsellerin bulunduğu klasör (alt klasörler dahil)")
    ayrıştırıcı.add_argument("--dene", action="store_true", help="dosyaya dokunmadan ne yapacağını yaz")
    ayrıştırıcı.add_argument("--yedek", type=Path, help="orijinalleri önce bu klasöre kopyala")
    ayrıştırıcı.add_argument("--kaskad", type=Path, help=f"{KASKAD_ADI} dosyasının yolu (bulunamazsa)")
    args = ayrıştırıcı.parse_args()

    if not args.kok.is_dir():
        sys.exit(f"Klasör yok: {args.kok}")

    bulucu = _bulucu(args.kaskad)
    gorseller = gorselleri_bul(args.kok)
    if not gorseller:
        print(f"{args.kok} içinde görsel yok.")
        return 0

    bulunan = degisen = okunamayan = 0
    for yol in gorseller:
        gorsel = cv2.imread(str(yol))
        if gorsel is None:
            print(f"  okunamadı: {yol}")
            okunamayan += 1
            continue
        kutular = yuzleri_bul(gorsel, bulucu)
        if not kutular:
            continue
        bulunan += len(kutular)
        print(f"  {yol.relative_to(args.kok)}: {len(kutular)} yüz")
        if args.dene:
            continue
        if args.yedek:
            hedef = args.yedek / yol.relative_to(args.kok)
            hedef.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(yol, hedef)
        bulaniklastir(gorsel, kutular)
        cv2.imwrite(str(yol), gorsel)
        degisen += 1

    print(
        f"\n{len(gorseller)} görsel tarandı, {bulunan} yüz bulundu, "
        f"{degisen} dosya değiştirildi, {okunamayan} dosya okunamadı."
    )
    if args.dene:
        print("--dene açıktı, hiçbir dosya değiştirilmedi.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
