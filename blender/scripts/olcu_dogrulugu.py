"""Ölçü doğruluğu testi (#34), 2. adım: çözücünün ağırlıklarıyla avatarı kurar, gerçekten ölçer, raporlar.

Girdi: ml/results/olcu-dogrulugu/setler.json (ANSUR II'den 20 kişi, ml/scripts/olcu_setleri.py)
       ml/results/olcu-dogrulugu/cozumler.json (uygulamanın çözücüsü, apps/web/scripts/olcu-dogrulugu.ts)
Çıktı: ml/results/olcu-dogrulugu/sonuclar.csv ve rapor.md

Çalıştırma (repo kökünden):
    blender --background --python blender/scripts/olcu_dogrulugu.py

Avatar GLB'den okunur (uygulamanın gördüğü dosya); shape key'ler doğrusal karıştırılır, sonra
olcum.py ile kalibrasyondaki aynı yöntemle ölçülür. Üç fark raporlanır:
  hedef farkı  = ölçülen − kullanıcının girdiği (asıl sonuç: avatar kişiye ne kadar benziyor)
  model farkı  = ölçülen − çözücünün tahmini (kalibrasyonun doğrusal varsayımı ne kadar tutuyor)
  kilo farkı   = avatarın hacimden kilosu − ANSUR'daki gerçek kilo (kilo hedef olarak verilmez)
"""

import csv
import json
import statistics
import sys
from pathlib import Path

import bpy  # noqa: F401  (Blender içinde çalışır)
import numpy as np

BETIK_KLASORU = Path(__file__).resolve().parent
REPO = BETIK_KLASORU.parents[1]
sys.path.insert(0, str(BETIK_KLASORU))

import olcum  # noqa: E402
import sablon_tisort  # noqa: E402  (GLB'den kaynaklı avatar okuma: UV dikişlerindeki köşeler birleştirilir)

KLASOR = REPO / "ml" / "results" / "olcu-dogrulugu"
OLCULER = ["boy", "gogus", "bel", "kalca", "kol_boyu", "ic_bacak"]
ESIK_CM = 1.0
ESIK_KG = 4.0


def avatar(model):
    """(vücutlar, üçgenler, yoğunluk): kilo, kalibrasyondaki yoğunlukla hesaplanır."""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    sablon_tisort.model_sec(model)
    kalib = json.loads((REPO / "assets" / "models" / f"avatar_{model}.calib.json").read_text(encoding="utf-8"))
    return (*sablon_tisort.avatar_vucutlari(), kalib.get("yogunluk_kg_l", olcum.YOGUNLUK_KG_L))


def main():
    setler = {s["id"]: s for s in json.loads((KLASOR / "setler.json").read_text(encoding="utf-8"))["setler"]}
    cozumler = json.loads((KLASOR / "cozumler.json").read_text(encoding="utf-8"))["cozumler"]

    satirlar, vucutlar = [], {}
    for c in cozumler:
        if c["model"] not in vucutlar:
            vucutlar[c["model"]] = avatar(c["model"])
        vucut, u, yogunluk = vucutlar[c["model"]]
        k = vucut["taban"] + sum(w * (vucut[key] - vucut["taban"]) for key, w in c["agirliklar"].items())
        olculen = olcum.olc(k, u, yogunluk)
        gercek = setler[c["id"]]["olculer"]

        satir = {"id": c["id"], "model": c["model"], "senaryo": c["senaryo"], "sinirda": " ".join(c["sinirda"])}
        for o in OLCULER:
            satir[f"{o}_girilen"] = c["hedef"].get(o, "")
            satir[f"{o}_gercek"] = gercek[o]
            satir[f"{o}_olculen"] = olculen[o]
            satir[f"{o}_hedef_farki"] = round(olculen[o] - c["hedef"][o], 1) if o in c["hedef"] else ""
            satir[f"{o}_model_farki"] = round(olculen[o] - c["tahmin"][o], 1)
        satir["kilo_gercek"] = gercek["kilo"]
        satir["kilo_olculen"] = olculen["kilo"]
        satir["kilo_farki"] = round(olculen["kilo"] - gercek["kilo"], 1)
        satirlar.append(satir)
        print(f"  {c['id']:<18} {c['senaryo']:<6} " + " ".join(
            f"{o}:{satir[f'{o}_hedef_farki']}" for o in OLCULER if o in c["hedef"]) + f" kilo:{satir['kilo_farki']}")

    with (KLASOR / "sonuclar.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(satirlar[0]))
        w.writeheader()
        w.writerows(satirlar)
    (KLASOR / "rapor.md").write_text(rapor(satirlar), encoding="utf-8")
    print(f"Yazıldı: {KLASOR / 'sonuclar.csv'}, {KLASOR / 'rapor.md'}")


def ozet(degerler):
    d = [abs(x) for x in degerler if x != ""]
    return (statistics.fmean(d), max(d)) if d else (None, None)


def sayi(x):
    return "—" if x is None else f"{x:.1f}".replace(".", ",")


def rapor(satirlar):
    parca = ["# Ölçü doğruluğu testi (#34)", "",
             "Uygulamanın ölçü çözücüsü, ANSUR II'den seçilen 20 gerçek kişinin (10 kadın, 10 erkek) "
             "ölçüleriyle çalıştırıldı; bulunan ağırlıklarla avatar kurulup Blender'da gerçekten ölçüldü. "
             "Seçim ve yöntem: `ml/scripts/olcu_setleri.py`, `apps/web/scripts/olcu-dogrulugu.ts`, "
             "`blender/scripts/olcu_dogrulugu.py`. Ham sonuçlar: `sonuclar.csv`.", "",
             "Senaryolar: **tam** = boy, göğüs, bel, kalça, kol boyu, iç bacak girilmiş; "
             "**temel** = yalnızca boy, göğüs, bel, kalça. Kilo iki senaryoda da girilmedi.", ""]

    parca += ["## Avatar kişiye ne kadar benziyor (ölçülen − girilen, cm)", "",
              "Ortalama / en büyük mutlak fark. Eşik 1 cm.", "",
              "| Model | Senaryo | " + " | ".join(OLCULER) + " |",
              "|---|---|" + "---|" * len(OLCULER)]
    for model in ("kadin", "erkek"):
        for senaryo in ("tam", "temel"):
            grup = [s for s in satirlar if s["model"] == model and s["senaryo"] == senaryo]
            hucre = []
            for o in OLCULER:
                ort, enb = ozet([s[f"{o}_hedef_farki"] for s in grup])
                hucre.append("girilmedi" if ort is None else
                             (f"**{sayi(ort)} / {sayi(enb)}**" if ort > ESIK_CM else f"{sayi(ort)} / {sayi(enb)}"))
            parca.append(f"| {model} | {senaryo} | " + " | ".join(hucre) + " |")

    parca += ["", "## Doğrusal model ne kadar tutuyor (ölçülen − çözücünün tahmini, cm)", "",
              "Kalibrasyondaki `taban + Σ etki × ağırlık` varsayımının gerçek karışımlardaki hatası.", "",
              "| Model | " + " | ".join(OLCULER) + " |", "|---|" + "---|" * len(OLCULER)]
    for model in ("kadin", "erkek"):
        grup = [s for s in satirlar if s["model"] == model]
        parca.append(f"| {model} | " + " | ".join(
            "{} / {}".format(*map(sayi, ozet([s[f"{o}_model_farki"] for s in grup]))) for o in OLCULER) + " |")

    parca += ["", "## Kilo (avatarın hacimden kilosu − gerçek kilo, kg)", "",
              "Kilo hedef olarak verilmediği için avatarın kilosu diğer ölçülerden çıkar. Eşik 4 kg.", "",
              "| Model | ortalama fark | ortalama mutlak | en büyük | gerçek / avatar oranı |", "|---|---|---|---|---|"]
    for model in ("kadin", "erkek"):
        grup = [s for s in satirlar if s["model"] == model and s["senaryo"] == "tam"]
        farklar = [s["kilo_farki"] for s in grup]
        oran = statistics.fmean(s["kilo_gercek"] / s["kilo_olculen"] for s in grup)
        parca.append(f"| {model} | {sayi(statistics.fmean(farklar))} | {sayi(statistics.fmean(map(abs, farklar)))} | "
                     f"{sayi(max(map(abs, farklar)))} | {f'{oran:.2f}'.replace('.', ',')} |")

    parca += ["", "## Sınırda kalan setler", "",
              "Çözücünün bir ağırlığı 0'a ya da 1'e dayandı: avatar bu kişinin vücuduna o yönde tam ulaşamıyor.", "",
              "| Set | Senaryo | Sınıra dayanan key'ler | En büyük hedef farkı |", "|---|---|---|---|"]
    for s in satirlar:
        if s["sinirda"]:
            enb = max((abs(s[f"{o}_hedef_farki"]), o) for o in OLCULER if s[f"{o}_hedef_farki"] != "")
            parca.append(f"| {s['id']} | {s['senaryo']} | {s['sinirda']} | {sayi(enb[0])} cm ({enb[1]}) |")
    parca.append("")
    return "\n".join(parca)


main()
