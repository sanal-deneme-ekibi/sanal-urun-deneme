"""Etiketli veriyi eğitim / doğrulama / test bölümlerine ayırır.

Protokol (ml/veri-protokolu.md, bölüm 5):

- Oranlar %70 / %15 / %15.
- Bölme **ürün bazındadır**: aynı ürünün iki fotoğrafı farklı bölümlere düşmez, yoksa test
  sonucu olduğundan iyi çıkar.
- Bölme **tür + görünüm ikilisine göre katmanlıdır**: az sayıda olan kombinasyonlar
  (ör. etek + insan) tek bölüme yığılmasın diye her kutu kendi içinde bölünür.
- Sabit `seed` ile tekrarlanabilir.

Ürün anahtarı dosya adından çıkar: `tisort_tr01_0042.jpg` → `tisort_tr01_0042`. Aynı ürünün
ikinci fotoğrafı `-2` ekiyle yazılır (`tisort_tr01_0042-2.jpg`) ve aynı ürün sayılır.

Çıktı, görselleri kopyalamaz; hangi görselin hangi bölüme düştüğünü JSON olarak yazar.
`annotations.json` bu listeye göre bölünür.

Kullanım:
    python ml/scripts/bol.py etiketli/annotations.json --cikti etiketli/bolme.json
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from collections import defaultdict
from pathlib import Path

ORANLAR = {"train": 0.70, "val": 0.15, "test": 0.15}
EK_DESENI = re.compile(r"-\d+$")


def urun_anahtari(dosya_adi: str) -> str:
    """tisort_tr01_0042-2.jpg → tisort_tr01_0042"""
    return EK_DESENI.sub("", Path(dosya_adi).stem)


def kutular(veri: dict) -> dict[tuple[str, str], set[str]]:
    """(tür, görünüm) → o kutudaki ürün anahtarları."""
    gorseller = {g["id"]: g for g in veri["images"]}
    turler = {k["id"]: k["name"] for k in veri["categories"]}
    sonuc: dict[tuple[str, str], set[str]] = defaultdict(set)

    for ann in veri["annotations"]:
        bilgi = gorseller.get(ann["image_id"])
        tur = turler.get(ann["category_id"])
        if bilgi is None or tur is None:
            continue
        nitelikler = ann.get("attributes") or {}
        gorunum = nitelikler.get("gorunum") or "bilinmiyor"
        sonuc[(tur, gorunum)].add(urun_anahtari(bilgi["file_name"]))
    return sonuc


def kutuyu_bol(urunler: list[str], rastgele: random.Random) -> dict[str, list[str]]:
    """Bir kutuyu %70/15/15 böler. Küçük kutularda önce train, sonra test, sonra val dolar."""
    urunler = sorted(urunler)
    rastgele.shuffle(urunler)
    n = len(urunler)
    n_test = round(n * ORANLAR["test"])
    n_val = round(n * ORANLAR["val"])
    # Tek ürünlü kutu eğitime gider; iki ürünlü kutuda biri eğitime biri teste.
    if n >= 2 and n_test == 0:
        n_test = 1
    if n - n_test - n_val < 1:
        n_val = max(0, n - n_test - 1)
    return {
        "test": urunler[:n_test],
        "val": urunler[n_test : n_test + n_val],
        "train": urunler[n_test + n_val :],
    }


def bol(veri: dict, seed: int) -> tuple[dict[str, list[str]], list[str]]:
    rastgele = random.Random(seed)
    bolumler: dict[str, set[str]] = {b: set() for b in ORANLAR}
    uyarilar: list[str] = []

    print(f"{'tür':<10} {'görünüm':<12} {'ürün':>5} {'train':>6} {'val':>5} {'test':>5}")
    print("-" * 50)
    for (tur, gorunum), urunler in sorted(kutular(veri).items()):
        parca = kutuyu_bol(list(urunler), rastgele)
        for bolum, liste in parca.items():
            bolumler[bolum].update(liste)
        print(
            f"{tur:<10} {gorunum:<12} {len(urunler):>5} "
            f"{len(parca['train']):>6} {len(parca['val']):>5} {len(parca['test']):>5}"
        )
        if not parca["test"]:
            uyarilar.append(f"{tur} + {gorunum}: test payı boş ({len(urunler)} ürün var)")

    # Bir ürün birden fazla kutuda görünebilir (çok ürünlü görsel); ilk düştüğü bölüm geçerli.
    sirali = ["test", "val", "train"]
    gorulen: set[str] = set()
    temiz: dict[str, list[str]] = {}
    for bolum in sirali:
        temiz[bolum] = sorted(bolumler[bolum] - gorulen)
        gorulen.update(temiz[bolum])
    return {b: temiz[b] for b in ORANLAR}, uyarilar


def main() -> int:
    ayrıştırıcı = argparse.ArgumentParser(description="Etiketli veriyi train/val/test olarak böler.")
    ayrıştırıcı.add_argument("annotations", type=Path, help="CVAT'tan dışa aktarılan annotations.json")
    ayrıştırıcı.add_argument("--cikti", type=Path, default=Path("bolme.json"), help="bölme listesinin yazılacağı dosya")
    ayrıştırıcı.add_argument("--seed", type=int, default=42, help="tekrarlanabilirlik için sabit tohum")
    args = ayrıştırıcı.parse_args()

    if not args.annotations.exists():
        sys.exit(f"Yok: {args.annotations}")

    veri = json.loads(args.annotations.read_text(encoding="utf-8"))
    bolme, uyarilar = bol(veri, args.seed)

    toplam = sum(len(v) for v in bolme.values())
    print("-" * 50)
    for bolum, urunler in bolme.items():
        oran = len(urunler) / toplam * 100 if toplam else 0
        print(f"{bolum:<6} {len(urunler):>5} ürün  (%{oran:.1f})")

    args.cikti.write_text(
        json.dumps({"seed": args.seed, "bolumler": bolme}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nBölme yazıldı: {args.cikti}")

    for uyari in uyarilar:
        print(f"UYARI: {uyari}")
    return 1 if uyarilar else 0


if __name__ == "__main__":
    raise SystemExit(main())
