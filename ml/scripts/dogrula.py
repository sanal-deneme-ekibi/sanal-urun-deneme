"""CVAT'tan dışa aktarılan etiket dosyasını denetler.

Protokol (ml/veri-protokolu.md, bölüm 6): her dışa aktarma sonrası çalıştırılır.

Denetlenenler:

- Tür adları 5 türün listesine uyuyor mu (`docs/glb-sozlesmesi.md` ile aynı yazım).
- Her tişört maskesinin 7 anahtar noktası var mı ve sıra doğru mu.
- Poligonlar kapalı mı: en az 3 nokta, koordinat sayısı çift.
- `gorunum` ve `kirpik` nitelikleri dolu ve geçerli değerde mi.
- Bir görselde aynı türden iki maske varsa uyarı (genelde etiketleme hatası).

Çıkış kodu: hata varsa 1, yalnızca uyarı varsa 0.

Kullanım:
    python ml/scripts/dogrula.py etiketli/train/annotations.json
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

TURLER = {"tisort", "pantolon", "gomlek", "elbise", "etek"}
NOKTALAR = ["yaka_orta", "omuz_sol", "omuz_sag", "kol_sol", "kol_sag", "etek_sol", "etek_sag"]
# Dışa aktarmada noktalar İSİMLE eşleştirilir, sırayla değil: CVAT sıra olarak iskeleti
# çizerken kullanılan noktalama sırasını yazıyor ve bu sözleşmedeki sırayla aynı olmak zorunda değil.
# Denetlenen şey yedi ismin tam olarak bulunması; sıra farklıysa uyarı verilir, hata değil.
NOKTALI_TURLER = {"tisort"}  # 1. dönem; diğerleri 2. dönemde eklenir
GORUNUMLER = {"duz", "manken", "insan"}
KIRPIK = {"evet", "hayir"}


def denetle(veri: dict) -> tuple[list[str], list[str]]:
    hatalar: list[str] = []
    uyarilar: list[str] = []

    gorseller = {g["id"]: g.get("file_name", f"id={g['id']}") for g in veri.get("images", [])}
    turler = {k["id"]: k["name"] for k in veri.get("categories", [])}

    bilinmeyen = sorted(set(turler.values()) - TURLER)
    if bilinmeyen:
        hatalar.append(f"Listede olmayan tür adı: {', '.join(bilinmeyen)}")
    eksik = sorted(TURLER - set(turler.values()))
    if eksik:
        uyarilar.append(f"Bu dosyada hiç örneği olmayan tür: {', '.join(eksik)}")

    # Skeleton noktalarının adları categories içinde taşınır.
    for kategori in veri.get("categories", []):
        if kategori["name"] in NOKTALI_TURLER and "keypoints" in kategori:
            gelen = list(kategori["keypoints"])
            eksik_nokta = [n for n in NOKTALAR if n not in gelen]
            fazla_nokta = [n for n in gelen if n not in NOKTALAR]
            if eksik_nokta:
                hatalar.append(f"{kategori['name']}: eksik anahtar nokta: {', '.join(eksik_nokta)}")
            if fazla_nokta:
                hatalar.append(f"{kategori['name']}: tanınmayan anahtar nokta: {', '.join(fazla_nokta)}")
            if not eksik_nokta and not fazla_nokta and gelen != NOKTALAR:
                uyarilar.append(
                    f"{kategori['name']}: nokta sırası sözleşmedekinden farklı. "
                    "Sorun değil, noktalar isimle eşleştirilir; ama eğitim kodu sırayla değil "
                    f"isimle okumalı.\n        sözleşme: {NOKTALAR}\n        dosya   : {gelen}"
                )

    gorsel_tur = Counter()
    for ann in veri.get("annotations", []):
        ad = gorseller.get(ann.get("image_id"), "?")
        tur = turler.get(ann.get("category_id"), "?")
        yer = f"{ad} (ann={ann.get('id')}, {tur})"

        for poligon in ann.get("segmentation") or []:
            if not isinstance(poligon, list):
                continue  # RLE maskesi, poligon denetimi geçerli değil
            if len(poligon) % 2:
                hatalar.append(f"{yer}: poligon koordinat sayısı tek ({len(poligon)})")
            elif len(poligon) < 6:
                hatalar.append(f"{yer}: poligon {len(poligon) // 2} noktalı, en az 3 olmalı")

        if tur in NOKTALI_TURLER:
            noktalar = ann.get("keypoints")
            if not noktalar:
                hatalar.append(f"{yer}: anahtar nokta yok, {len(NOKTALAR)} nokta bekleniyor")
            elif len(noktalar) != len(NOKTALAR) * 3:
                hatalar.append(f"{yer}: {len(noktalar) // 3} nokta var, {len(NOKTALAR)} olmalı")

        nitelikler = ann.get("attributes") or {}
        gorunum = nitelikler.get("gorunum")
        if gorunum not in GORUNUMLER:
            hatalar.append(f"{yer}: gorunum '{gorunum}' geçersiz, {sorted(GORUNUMLER)} olmalı")
        if nitelikler.get("kirpik") not in KIRPIK:
            uyarilar.append(f"{yer}: kirpik niteliği boş veya geçersiz")

        gorsel_tur[(ann.get("image_id"), tur)] += 1

    for (gorsel_id, tur), adet in gorsel_tur.items():
        if adet > 1:
            uyarilar.append(f"{gorseller.get(gorsel_id, '?')}: aynı görselde {adet} adet {tur} maskesi")

    return hatalar, uyarilar


def main() -> int:
    ayrıştırıcı = argparse.ArgumentParser(description="CVAT dışa aktarmasını denetler.")
    ayrıştırıcı.add_argument("annotations", type=Path, help="annotations.json")
    args = ayrıştırıcı.parse_args()

    if not args.annotations.exists():
        sys.exit(f"Yok: {args.annotations}")

    veri = json.loads(args.annotations.read_text(encoding="utf-8"))
    hatalar, uyarilar = denetle(veri)

    print(f"{len(veri.get('images', []))} görsel, {len(veri.get('annotations', []))} etiket denetlendi.\n")
    for hata in hatalar:
        print(f"HATA  : {hata}")
    for uyari in uyarilar:
        print(f"UYARI : {uyari}")
    if not hatalar and not uyarilar:
        print("Temiz.")
    elif not hatalar:
        print(f"\n{len(uyarilar)} uyarı, hata yok.")
    else:
        print(f"\n{len(hatalar)} hata, {len(uyarilar)} uyarı.")
    return 1 if hatalar else 0


if __name__ == "__main__":
    raise SystemExit(main())
