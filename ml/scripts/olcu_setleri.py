"""Ölçü doğruluğu testi (#34) için ANSUR II'den 20 gerçek kişi seçer: kadın 10, erkek 10.

ANSUR II (2012, ABD ordusu) herkese açık ölçüm verisidir; ham CSV'ler repoya konmaz:
    https://www.openlab.psu.edu/ansur2/  →  ANSUR_II_FEMALE_Public.csv, ANSUR_II_MALE_Public.csv

Seçim (her cinsiyet için):
  - Genel beden: boy, göğüs, bel ve kalçanın z-puanı ortalaması; %5, %25, %50, %75, %95'teki kişi
  - Vücut tipleri: uzun-zayıf, kısa-dolu, armut (kalça > bel), elma (bel > kalça), uzun bacaklı.
    Her tip bir puanla sıralanır, aykırı tek kişi seçilmesin diye puanın %95'indeki kişi alınır.

Ölçüler (cm, kilo kg), sözleşmedeki adlarla:
  boy = stature · gogus = chestcircumference · bel = waistcircumference
  kalca = buttockcircumference · ic_bacak = crotchheight
  kol_boyu = acromionradialelength + radialestylionlength (omuz başından bileğe)
  kilo = weightkg (CSV'de hektogram, ondan 10'a bölünür)

Kullanım:
    python ml/scripts/olcu_setleri.py <ANSUR_II_FEMALE_Public.csv> <ANSUR_II_MALE_Public.csv> \\
        --cikti ml/results/olcu-dogrulugu/setler.json
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from pathlib import Path

ALANLAR = {
    "boy": ("stature",),
    "gogus": ("chestcircumference",),
    "bel": ("waistcircumference",),
    "kalca": ("buttockcircumference",),
    "ic_bacak": ("crotchheight",),
    "kol_boyu": ("acromionradialelength", "radialestylionlength"),
}

TIPLER = {
    "uzun_zayif": ("uzun ve zayıf", lambda z: z["boy"] - z["bel"]),
    "kisa_dolu": ("kısa ve dolu", lambda z: z["bel"] - z["boy"]),
    "armut": ("armut (kalça bele göre geniş)", lambda z: z["kalca"] - z["bel"]),
    "elma": ("elma (bel kalçaya göre geniş)", lambda z: z["bel"] - z["kalca"]),
    "uzun_bacak": ("uzun bacaklı", lambda z: z["ic_bacak"] - z["boy"]),
}


def oku(yol: Path) -> list[dict]:
    with yol.open(encoding="latin-1", newline="") as f:
        satirlar = list(csv.DictReader(f))
    kisiler = []
    for s in satirlar:
        s = {k.lower(): v for k, v in s.items()}
        olcu = {ad: sum(float(s[a]) for a in alanlar) / 10 for ad, alanlar in ALANLAR.items()}
        olcu["kilo"] = float(s["weightkg"]) / 10
        kisiler.append({"ansur_id": s["subjectid"], "olculer": {k: round(v, 1) for k, v in olcu.items()}})
    return kisiler


def z_puanlari(kisiler: list[dict]) -> None:
    for ad in ALANLAR:
        degerler = [k["olculer"][ad] for k in kisiler]
        ort, sap = statistics.fmean(degerler), statistics.pstdev(degerler)
        for k in kisiler:
            k.setdefault("z", {})[ad] = (k["olculer"][ad] - ort) / sap


def yuzdelikteki(kisiler: list[dict], puan, yuzde: float) -> dict:
    sirali = sorted(kisiler, key=puan)
    return sirali[round(yuzde / 100 * (len(sirali) - 1))]


def sec(kisiler: list[dict], model: str) -> list[dict]:
    z_puanlari(kisiler)
    beden = lambda k: statistics.fmean(k["z"][a] for a in ("boy", "gogus", "bel", "kalca"))  # noqa: E731
    secilen = []
    for yuzde in (5, 25, 50, 75, 95):
        secilen.append((f"{model}_p{yuzde:02d}", f"genel beden %{yuzde}", yuzdelikteki(kisiler, beden, yuzde)))
    for ad, (aciklama, puan) in TIPLER.items():
        secilen.append((f"{model}_{ad}", aciklama, yuzdelikteki(kisiler, lambda k: puan(k["z"]), 95)))

    setler, gorulen = [], set()
    for kimlik, aciklama, kisi in secilen:
        if kisi["ansur_id"] in gorulen:  # aynı kişi iki kez seçilmesin
            raise SystemExit(f"{kimlik}: {kisi['ansur_id']} daha önce seçildi, seçim kuralını değiştirin")
        gorulen.add(kisi["ansur_id"])
        setler.append({"id": kimlik, "model": model, "aciklama": aciklama, "ansur_id": kisi["ansur_id"],
                       "olculer": kisi["olculer"]})
    return setler


def main() -> int:
    a = argparse.ArgumentParser(description="ANSUR II'den ölçü doğruluğu testi için 20 kişi seçer.")
    a.add_argument("kadin_csv", type=Path)
    a.add_argument("erkek_csv", type=Path)
    a.add_argument("--cikti", type=Path, default=Path("ml/results/olcu-dogrulugu/setler.json"))
    args = a.parse_args()

    setler = sec(oku(args.kadin_csv), "kadin") + sec(oku(args.erkek_csv), "erkek")
    args.cikti.parent.mkdir(parents=True, exist_ok=True)
    args.cikti.write_text(json.dumps({
        "kaynak": "ANSUR II (2012), https://www.openlab.psu.edu/ansur2/",
        "birim": "cm (kilo kg)",
        "setler": setler,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for s in setler:
        print(f"{s['id']:<18} {s['aciklama']:<32} {s['olculer']}")
    print(f"\n{len(setler)} set yazıldı: {args.cikti}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
