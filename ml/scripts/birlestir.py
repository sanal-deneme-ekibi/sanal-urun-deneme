"""CVAT'ın Datumaro dışa aktarmasını tek bir COCO dosyasına çevirir.

Neden gerekli (ölçülerek bulundu, 25.11.2026, deneme görevi `deneme-format-kontrolu`):

| Biçim              | maske | 7 nokta            | gorunum/kirpik |
|--------------------|-------|--------------------|----------------|
| COCO 1.0           | var   | **sessizce düşer** | var            |
| COCO Keypoints 1.0 | yok   | var                | yok            |
| Datumaro 1.0       | var   | var                | var            |

COCO 1.0'ın davranışı tehlikeli: nokta adları `categories` içinde görünür, bu yüzden
dosyaya bakınca noktalar varmış gibi durur, ama `annotations` içinde tek bir anahtar
nokta yoktur. Bu yüzden dışa aktarma Datumaro 1.0 ile yapılır ve bu betikle COCO'ya
çevrilir; eğitim tarafı standart COCO okumaya devam eder.

Sebep CVAT'ta bir kurulum hatası değil: CVAT iskeleti ayrı bir etiket türü olarak
tutar (`tisort_noktalar`), poligon etiketinin içine nokta gömülemez. İki etiketi
birleştirmek dışa aktarıcıların değil, bizim işimiz.

Maske ile iskeletini eşleştirme (protokol bölüm 6):

- Etiketlerken maske ve iskeleti **aynı gruba** alınır; grup numarası Datumaro'da korunur.
- Gruplanmamış şekiller `group: 0` ile gelir. Bir görselde tek maske ve tek iskelet
  varsa bunlar eşleştirilir; birden çoksa eşleştirme belirsizdir ve betik hata verir.

Kullanım:
    python ml/scripts/birlestir.py etiketli/train/annotations/default.json -o etiketli/train/annotations.json
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

TURLER = ["tisort", "pantolon", "gomlek", "elbise", "etek"]
NOKTALAR = ["yaka_orta", "omuz_sol", "omuz_sag", "kol_sol", "kol_sag", "etek_sol", "etek_sag"]
# Hangi türün iskeleti hangi etiket adıyla kuruldu (1. dönem yalnızca tişört).
ISKELETLER = {"tisort": "tisort_noktalar"}
# COCO'ya taşınacak nitelikler; CVAT'ın kendi ekledikleri (occluded, keyframe) dışarıda kalır.
NITELIKLER = ["gorunum", "kirpik"]


def kutu(noktalar: list[float]) -> tuple[list[float], float]:
    """Poligondan COCO bbox [x, y, en, boy] ve ayakkabı bağı (shoelace) alanı."""
    xs = noktalar[0::2]
    ys = noktalar[1::2]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    iki_alan = 0.0
    for i in range(len(xs)):
        j = (i + 1) % len(xs)
        iki_alan += xs[i] * ys[j] - xs[j] * ys[i]
    return [x0, y0, x1 - x0, y1 - y0], abs(iki_alan) / 2


def esle(sekiller: list[dict], gorsel: str) -> list[tuple[dict, dict | None]]:
    """Her maskeyi kendi iskeletiyle eşler. Döndürdüğü ikinci öğe iskelet yoksa None."""
    maskeler = [s for s in sekiller if s["type"] == "polygon"]
    iskeletler = [s for s in sekiller if s["type"] == "skeleton"]

    gruplu = [s for s in maskeler + iskeletler if s.get("group")]
    if gruplu:
        gruba: dict[int, dict[str, list[dict]]] = defaultdict(lambda: {"maske": [], "iskelet": []})
        for s in gruplu:
            gruba[s["group"]]["maske" if s["type"] == "polygon" else "iskelet"].append(s)
        for no, g in gruba.items():
            if len(g["maske"]) != 1 or len(g["iskelet"]) > 1:
                raise ValueError(
                    f"{gorsel}: grup {no} içinde {len(g['maske'])} maske, "
                    f"{len(g['iskelet'])} iskelet var; her grupta tam 1 maske olmalı"
                )
        ciftler = [(g["maske"][0], (g["iskelet"] or [None])[0]) for g in gruba.values()]
        kalan_maske = [m for m in maskeler if not m.get("group")]
        kalan_iskelet = [i for i in iskeletler if not i.get("group")]
        if kalan_iskelet:
            raise ValueError(
                f"{gorsel}: bazı şekiller gruplanmış ama {len(kalan_iskelet)} iskelet "
                "gruplanmamış; ya hepsi gruplanmalı ya hiçbiri"
            )
        return ciftler + [(m, None) for m in kalan_maske]

    # Hiç gruplama yok: yalnızca tek maske + tek iskelet varsa eşleştirme kesindir.
    if len(iskeletler) > 1 or (iskeletler and len(maskeler) > 1):
        raise ValueError(
            f"{gorsel}: {len(maskeler)} maske ve {len(iskeletler)} iskelet gruplanmamış; "
            "hangi noktaların hangi maskeye ait olduğu belirsiz (protokol bölüm 6: gruplayın)"
        )
    return [(maskeler[0], iskeletler[0])] if maskeler and iskeletler else [(m, None) for m in maskeler]


def cevir(veri: dict) -> tuple[dict, list[str]]:
    uyarilar: list[str] = []
    etiketler = veri["categories"]["label"]["labels"]
    adlar = [e["name"] for e in etiketler]

    bilinmeyen = sorted({a for a, e in zip(adlar, etiketler) if not e["parent"]} - set(TURLER) - set(ISKELETLER.values()))
    if bilinmeyen:
        uyarilar.append(f"Listede olmayan etiket, atlandı: {', '.join(bilinmeyen)}")

    # Datumaro'nun iskelet tanımı nokta sırasını taşır; sözleşmeyle karşılaştırılır.
    nokta_sirasi: dict[str, list[str]] = {}
    for oge in veri["categories"].get("points", {}).get("items", []):
        nokta_sirasi[adlar[oge["label_id"]]] = list(oge["labels"])

    kategoriler = []
    tur_no = {}
    for i, tur in enumerate(TURLER, start=1):
        tur_no[tur] = i
        k = {"id": i, "name": tur, "supercategory": ""}
        iskelet_adi = ISKELETLER.get(tur)
        if iskelet_adi:
            gelen = nokta_sirasi.get(iskelet_adi, NOKTALAR)
            if gelen != NOKTALAR:
                uyarilar.append(
                    f"{iskelet_adi}: CVAT'taki nokta sırası sözleşmedekinden farklı; "
                    "noktalar isimle eşleştirildi"
                )
            k["keypoints"] = NOKTALAR
            k["skeleton"] = []
        kategoriler.append(k)

    gorseller, etiket_cikti = [], []
    for gorsel_no, oge in enumerate(veri["items"], start=1):
        yol = oge["image"]["path"]
        boy, en = oge["image"]["size"]  # Datumaro [yukseklik, genislik] verir
        gorseller.append({"id": gorsel_no, "width": en, "height": boy, "file_name": yol})

        sekiller = [a for a in oge["annotations"] if a["type"] in ("polygon", "skeleton")]
        for maske, iskelet in esle(sekiller, yol):
            tur = adlar[maske["label_id"]]
            if tur not in tur_no:
                continue
            noktalar = [float(p) for p in maske["points"]]
            bbox, alan = kutu(noktalar)
            ann = {
                "id": len(etiket_cikti) + 1,
                "image_id": gorsel_no,
                "category_id": tur_no[tur],
                "segmentation": [noktalar],
                "area": alan,
                "bbox": bbox,
                "iscrowd": 0,
                "attributes": {n: maske["attributes"].get(n) for n in NITELIKLER},
            }
            if ISKELETLER.get(tur):
                if iskelet is None:
                    uyarilar.append(f"{yol}: {tur} maskesinin iskeleti yok, anahtar nokta yazılmadı")
                else:
                    gelen = nokta_sirasi.get(adlar[iskelet["label_id"]], NOKTALAR)
                    ham = [float(p) for p in iskelet["points"]]
                    # Noktalar İSİMLE eşleştirilir, sırayla değil (docs/glb-sozlesmesi.md).
                    konum = {ad: ham[i * 3 : i * 3 + 3] for i, ad in enumerate(gelen)}
                    eksik = [n for n in NOKTALAR if n not in konum]
                    if eksik:
                        raise ValueError(f"{yol}: iskelette eksik nokta: {', '.join(eksik)}")
                    kp: list[float] = []
                    for ad in NOKTALAR:
                        x, y, g = konum[ad]
                        kp += [x, y, int(g)]
                    ann["keypoints"] = kp
                    ann["num_keypoints"] = sum(1 for i in range(2, len(kp), 3) if kp[i] > 0)
            etiket_cikti.append(ann)

    return {
        "licenses": [{"name": "", "id": 0, "url": ""}],
        "info": {"description": "sanal-urun-deneme, Datumaro'dan birlestir.py ile üretildi"},
        "categories": kategoriler,
        "images": gorseller,
        "annotations": etiket_cikti,
    }, uyarilar


def main() -> int:
    ayrıştırıcı = argparse.ArgumentParser(description="Datumaro dışa aktarmasını COCO'ya çevirir.")
    ayrıştırıcı.add_argument("girdi", type=Path, help="Datumaro default.json")
    ayrıştırıcı.add_argument("-o", "--cikti", type=Path, required=True, help="yazılacak annotations.json")
    args = ayrıştırıcı.parse_args()

    if not args.girdi.exists():
        sys.exit(f"Yok: {args.girdi}")

    veri = json.loads(args.girdi.read_text(encoding="utf-8"))
    try:
        coco, uyarilar = cevir(veri)
    except ValueError as hata:
        sys.exit(f"HATA: {hata}")

    args.cikti.parent.mkdir(parents=True, exist_ok=True)
    args.cikti.write_text(json.dumps(coco, ensure_ascii=False, indent=1), encoding="utf-8")

    noktali = sum(1 for a in coco["annotations"] if "keypoints" in a)
    print(f"{len(coco['images'])} görsel, {len(coco['annotations'])} etiket yazıldı ({noktali} tanesi noktalı).")
    for u in uyarilar:
        print(f"UYARI : {u}")
    print(f"\n{args.cikti}\nSonraki adım: python ml/scripts/dogrula.py {args.cikti}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
