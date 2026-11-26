"""Elle kaydedilen görselleri protokole göre adlandırır; kaynak ve beden tablolarını doldurur.

Protokol (ml/veri-protokolu.md, bölüm 2 ve 3): görseller elle alınır, bu betik hiçbir şey
indirmez. Yalnızca `gelen/` klasörüne kaydedilmiş dosyaları ve `gelen/giris.csv` satırlarını işler.

Akış:
  1. Ürün sayfasındaki görseli `<veri>/gelen/` klasörüne kaydet (adı önemli değil).
  2. `<veri>/gelen/giris.csv`'ye satır ekle (Excel veya Google Sheets):
       dosya, url, gorunum, beden, boy_cm, en_cm, kol_cm, bel_cm, kalca_cm, ic_bacak_cm, cevre, not
     - Birden çok beden: aynı dosyayla birden çok satır, her satırda o bedenin ölçüleri.
     - Aynı ürünün ikinci fotoğrafı: başka dosya, aynı url (beden sütunları boş kalabilir).
     - Site göğüs/bel/kalça için çevre veriyorsa `cevre` sütununa `evet`: betik ikiye böler.
  3. Çalıştır:
       python ml/scripts/topla.py <veri> --tur tisort --toplayan tugce --dene   # önce bak
       python ml/scripts/topla.py <veri> --tur tisort --toplayan tugce
     → ham/<tur>/<tur>_<site>_<sira>.jpg, kaynak.csv, beden-tablolari.csv, siteler-<toplayan>.csv;
       işlenen dosyalar ve satırlar gelen/islendi/ altına taşınır, hatalı satırlar giris.csv'de kalır.
  4. Durum: python ml/scripts/topla.py <veri> --durum

Betiği tekrar çalıştırmak güvenlidir: aynı görsel (içerik özeti aynı) iki kez eklenmez.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import shutil
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow gerekli: pip install -r ml/scripts/requirements.txt")

from bol import urun_anahtari  # aynı ürünün fotoğraflarını bol.py ile aynı kuralla eşleştirmek için

TURLER = ("tisort", "pantolon", "gomlek", "elbise", "etek")
HEDEF = {"tisort": (200, 300), "pantolon": (200, 300), "gomlek": (150, 250), "elbise": (150, 250), "etek": (100, 200)}
GORUNUMLER = ("duz", "manken", "insan")
EN_KUCUK_PX = 400
URUN_BASINA_EN_COK = 2  # aynı üründen en çok 2 fotoğraf

GIRIS_SUTUNLARI = ["dosya", "url", "gorunum", "beden", "boy_cm", "en_cm", "kol_cm",
                   "bel_cm", "kalca_cm", "ic_bacak_cm", "cevre", "not"]
KAYNAK_SUTUNLARI = ["dosya", "url", "tarih", "toplayan", "gorunum", "not"]
BEDEN_SUTUNLARI = ["urun_id", "beden", "boy_cm", "en_cm", "kol_cm", "bel_cm", "kalca_cm", "ic_bacak_cm"]
OLCULER = BEDEN_SUTUNLARI[2:]
DUZ_GENISLIK = ("en_cm", "bel_cm", "kalca_cm")  # çevre verilirse ikiye bölünenler

# Türe göre dolması gereken ölçüler (protokol bölüm 3, beden-tablolari.csv)
GEREKEN = {
    "tisort": ("boy_cm", "en_cm", "kol_cm"),
    "gomlek": ("boy_cm", "en_cm", "kol_cm"),
    "elbise": ("boy_cm", "en_cm", "bel_cm", "kalca_cm"),
    "pantolon": ("boy_cm", "bel_cm", "kalca_cm", "ic_bacak_cm"),
    "etek": ("boy_cm", "bel_cm", "kalca_cm"),
}
# Akla yatkın aralık (cm, düz serili); dışındaki değer yazım hatası ya da çevre olabilir
ARALIK = {"boy_cm": (30, 160), "en_cm": (25, 80), "kol_cm": (5, 85), "bel_cm": (20, 75),
          "kalca_cm": (25, 85), "ic_bacak_cm": (40, 100)}


# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------

def csv_oku(yol: Path) -> list[dict]:
    """Türkçe Excel `;` ile, Google Sheets `,` ile kaydeder; ikisini de okur."""
    if not yol.exists():
        return []
    metin = yol.read_text(encoding="utf-8-sig")
    if not metin.strip():
        return []
    ayrac = ";" if metin.splitlines()[0].count(";") > metin.splitlines()[0].count(",") else ","
    return [{(k or "").strip(): (v or "").strip() for k, v in satir.items()}
            for satir in csv.DictReader(metin.splitlines(), delimiter=ayrac)]


def csv_yaz(yol: Path, sutunlar: list[str], satirlar: list[dict], excel: bool = False) -> None:
    """Veri dosyaları `,` ve BOM'suz yazılır; elle doldurulan giris.csv Excel için `;` ve BOM'lu."""
    yol.parent.mkdir(parents=True, exist_ok=True)
    with yol.open("w", encoding="utf-8-sig" if excel else "utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=sutunlar, delimiter=";" if excel else ",", extrasaction="ignore")
        w.writeheader()
        w.writerows(satirlar)


def sayi(metin: str) -> float | None:
    """'52', '52,5' ve '52.5' → 52.5; boş → None."""
    metin = metin.replace(",", ".").strip()
    return float(metin) if metin else None


def yuvarla(x: float) -> str:
    return f"{x:.1f}".rstrip("0").rstrip(".")


# ---------------------------------------------------------------------------
# Kayıtlar
# ---------------------------------------------------------------------------

def ozet(yol: Path) -> str:
    return hashlib.md5(yol.read_bytes()).hexdigest()


def site_kodu(siteler: list[dict], url: str) -> str:
    """Alan adına göre tr01, tr02… kodu; yeni site sona eklenir."""
    alan = urlparse(url).netloc.lower().removeprefix("www.")
    for s in siteler:
        if s["alan_adi"] == alan:
            return s["kod"]
    kod = f"tr{len(siteler) + 1:02d}"
    siteler.append({"kod": kod, "alan_adi": alan})
    return kod


def beden_satiri(satir: dict, tur: str, urun_id: str) -> tuple[dict | None, list[str], str]:
    """giris satırından beden-tablolari satırı; (satır, uyarılar, kaynak notu)."""
    if not satir["beden"]:
        return None, [], ""
    uyarilar, not_ = [], ""
    cikti = {"urun_id": urun_id, "beden": satir["beden"].upper()}
    cevre = satir.get("cevre", "").lower() in ("evet", "e", "1", "x")
    for sutun in OLCULER:
        # Excel'de "abc" gibi bir yazım hatası bütün çalışmayı düşürmesin; ölçü boş sayılır
        try:
            deger = sayi(satir.get(sutun, ""))
        except ValueError:
            uyarilar.append(f"{sutun}='{satir.get(sutun, '').strip()}' sayı değil, boş sayıldı")
            cikti[sutun] = ""
            continue
        if deger is None:
            cikti[sutun] = ""
            continue
        if cevre and sutun in DUZ_GENISLIK:
            deger /= 2
            not_ = "sitede çevre verilmişti, ikiye bölündü"
        alt, ust = ARALIK[sutun]
        if not alt <= deger <= ust:
            ipucu = " (çevre olabilir: cevre sütununa 'evet' yaz)" if sutun in DUZ_GENISLIK and deger > ust else ""
            uyarilar.append(f"{sutun}={yuvarla(deger)} beklenen aralıkta değil ({alt}–{ust}){ipucu}")
        cikti[sutun] = yuvarla(deger)
    eksik = [s for s in GEREKEN[tur] if not cikti[s]]
    if eksik:
        uyarilar.append(f"{satir['beden']} bedeninde eksik ölçü: {', '.join(eksik)}")
    return cikti, uyarilar, not_


# ---------------------------------------------------------------------------
# İşleme
# ---------------------------------------------------------------------------

def isle(kok: Path, tur: str, toplayan: str, dene: bool) -> int:
    gelen = kok / "gelen"
    giris_yolu = gelen / "giris.csv"
    giris = csv_oku(giris_yolu)
    if not giris:
        print(f"{giris_yolu} boş ya da yok. Şablonu oluşturmak için: --sablon")
        return 0

    # Site kodları kişi başına ayrı dosyada: Drive'da iki kişi aynı anda yazınca biri kaybolmasın
    siteler_yolu = kok / f"siteler-{toplayan}.csv"
    siteler = csv_oku(siteler_yolu)
    kaynak = csv_oku(kok / "kaynak.csv")
    bedenler = csv_oku(kok / "beden-tablolari.csv")
    ham = kok / "ham" / tur

    url_urun = {s["url"]: urun_anahtari(s["dosya"]) for s in kaynak}
    urun_foto = Counter(urun_anahtari(s["dosya"]) for s in kaynak)
    # Kopya denetimi: ham/'daki JPEG'ler yeniden kodlandığı için özetleri değişir; asıl
    # karşılaştırma gelen/islendi/'de saklanan orijinallerle yapılır
    var_olan = {ozet(p): p.name for p in ham.glob("*.jpg")} if ham.exists() else {}
    if (gelen / "islendi").exists():
        var_olan |= {ozet(p): p.name for p in (gelen / "islendi").iterdir()
                     if p.is_file() and p.suffix.lower() != ".csv"}
    sira = defaultdict(int)
    for s in kaynak:
        parca = urun_anahtari(s["dosya"]).split("_")
        if len(parca) == 3 and parca[2].isdigit():
            sira[(parca[0], parca[1])] = max(sira[(parca[0], parca[1])], int(parca[2]))
    beden_var = {(b["urun_id"], b["beden"]) for b in bedenler}

    # Aynı dosyanın birden çok beden satırı tek görsel olarak işlenir
    gruplar: dict[str, list[dict]] = defaultdict(list)
    for satir in giris:
        gruplar[satir.get("dosya", "")].append(satir)

    islenen_satirlar, kalan, islenen_dosyalar = [], [], []
    yeni_gorsel = yeni_beden = 0
    for dosya, satirlar in gruplar.items():
        ilk = satirlar[0]

        def birak(neden: str) -> None:
            print(f"  ATLANDI {dosya or '(dosya adı yok)'}: {neden}")
            kalan.extend(satirlar)

        kaynak_yol = gelen / dosya
        if not dosya or not kaynak_yol.is_file():
            birak("gelen/ içinde böyle bir dosya yok")
            continue
        if not ilk["url"].startswith("http"):
            birak("url eksik; kaynağı belirsiz görsel sete girmez")
            continue
        if ilk.get("gorunum") and ilk["gorunum"] not in GORUNUMLER:
            birak(f"gorunum '{ilk['gorunum']}' geçersiz, {'/'.join(GORUNUMLER)} olmalı")
            continue
        try:
            with Image.open(kaynak_yol) as gorsel:
                gorsel.load()
                en, boy = gorsel.size
                rgb = gorsel.convert("RGB")
        except OSError:
            birak("görsel açılamadı")
            continue
        if min(en, boy) < EN_KUCUK_PX:
            birak(f"{en}×{boy} piksel; en az {EN_KUCUK_PX}×{EN_KUCUK_PX} olmalı")
            continue
        o = ozet(kaynak_yol)
        if o in var_olan:
            birak(f"aynı görsel zaten var: {var_olan[o]}")
            continue

        # Ürün kimliği: aynı url daha önce görüldüyse aynı ürün, ikinci fotoğraf "-2" alır
        if ilk["url"] in url_urun:
            urun_id = url_urun[ilk["url"]]
            if urun_foto[urun_id] >= URUN_BASINA_EN_COK:
                birak(f"{urun_id} için zaten {URUN_BASINA_EN_COK} fotoğraf var")
                continue
            hedef_ad = f"{urun_id}-{urun_foto[urun_id] + 1}.jpg"
        else:
            kod = site_kodu(siteler, ilk["url"])
            sira[(tur, kod)] += 1
            urun_id = f"{tur}_{kod}_{sira[(tur, kod)]:04d}"
            hedef_ad = f"{urun_id}.jpg"
            url_urun[ilk["url"]] = urun_id
        urun_foto[urun_id] += 1

        notlar, uyarilar = [ilk.get("not", "")], []
        for satir in satirlar:
            b, u, n = beden_satiri(satir, tur, urun_id)
            uyarilar += u
            notlar.append(n)
            if b and (urun_id, b["beden"]) not in beden_var:
                bedenler.append(b)
                beden_var.add((urun_id, b["beden"]))
                yeni_beden += 1
        for u in uyarilar:
            print(f"  UYARI {hedef_ad}: {u}")

        print(f"  {dosya} → {hedef_ad} ({en}×{boy})")
        if not dene:
            ham.mkdir(parents=True, exist_ok=True)
            rgb.save(ham / hedef_ad, "JPEG", quality=95)
        var_olan[o] = hedef_ad
        kaynak.append({"dosya": hedef_ad, "url": ilk["url"], "tarih": date.today().isoformat(),
                       "toplayan": toplayan, "gorunum": ilk.get("gorunum", ""),
                       "not": "; ".join(n for n in dict.fromkeys(notlar) if n)})
        islenen_satirlar.extend(satirlar)
        islenen_dosyalar.append(kaynak_yol)
        yeni_gorsel += 1

    print(f"\n{yeni_gorsel} görsel, {yeni_beden} beden satırı eklendi; {len(kalan)} satır giris.csv'de kaldı.")
    if dene:
        print("--dene açıktı, hiçbir dosya değiştirilmedi.")
        return 0

    csv_yaz(siteler_yolu, ["kod", "alan_adi"], siteler)
    csv_yaz(kok / "kaynak.csv", KAYNAK_SUTUNLARI, kaynak)
    csv_yaz(kok / "beden-tablolari.csv", BEDEN_SUTUNLARI, bedenler)
    islendi = gelen / "islendi"
    islendi.mkdir(exist_ok=True)
    for yol in islenen_dosyalar:
        shutil.move(str(yol), islendi / yol.name)
    gecmis = csv_oku(islendi / "giris-islenen.csv")
    csv_yaz(islendi / "giris-islenen.csv", GIRIS_SUTUNLARI, gecmis + islenen_satirlar, excel=True)
    csv_yaz(giris_yolu, GIRIS_SUTUNLARI, kalan, excel=True)
    if yeni_gorsel:
        print("Sıradaki adım: yüzleri bulanıklaştır → python ml/scripts/yuz_bulanik.py "
              f"{kok / 'ham' / tur} --dene")
    return 1 if kalan else 0


def durum(kok: Path) -> int:
    kaynak = csv_oku(kok / "kaynak.csv")
    bedenler = csv_oku(kok / "beden-tablolari.csv")
    beden_urun = {b["urun_id"] for b in bedenler}
    tur_foto, tur_urun, gorunum, toplayan = Counter(), defaultdict(set), defaultdict(Counter), defaultdict(Counter)
    for s in kaynak:
        tur = s["dosya"].split("_")[0]
        tur_foto[tur] += 1
        tur_urun[tur].add(urun_anahtari(s["dosya"]))
        gorunum[tur][s.get("gorunum") or "?"] += 1
        toplayan[tur][s.get("toplayan") or "?"] += 1

    print(f"{'tür':<9} {'görsel':>6} {'hedef':>9} {'ürün':>5} {'bedensiz':>8}   görünüm (düz/manken/insan/?)")
    print("-" * 78)
    for tur in TURLER:
        alt, ust = HEDEF[tur]
        g = gorunum[tur]
        bedensiz = len(tur_urun[tur] - beden_urun)
        isaret = "✓" if tur_foto[tur] >= alt else " "
        print(f"{tur:<9} {tur_foto[tur]:>6} {f'{alt}–{ust}':>9} {len(tur_urun[tur]):>5} {bedensiz:>8}   "
              f"{g['duz']}/{g['manken']}/{g['insan']}/{g['?']} {isaret}")
        # Protokol: tür başına en az %30 düz ve en az %30 manken/insan
        if tur_foto[tur]:
            az = []
            if g["duz"] < 0.3 * tur_foto[tur]:
                az.append("düz")
            if g["manken"] + g["insan"] < 0.3 * tur_foto[tur]:
                az.append("manken+insan")
            if az:
                print(f"{'':<9} uyarı: {', '.join(az)} %30'un altında")
    if toplayan:
        print("\nToplayanlar: " + "; ".join(f"{t}: {dict(c)}" for t, c in toplayan.items()))
    return 0


def sablon(kok: Path) -> int:
    for klasor in ("gelen", *(f"ham/{t}" for t in TURLER), "kendi-kiyafetlerimiz"):
        (kok / klasor).mkdir(parents=True, exist_ok=True)
    giris = kok / "gelen" / "giris.csv"
    if not giris.exists():
        csv_yaz(giris, GIRIS_SUTUNLARI, [], excel=True)
    for ad, sutunlar in (("kaynak.csv", KAYNAK_SUTUNLARI), ("beden-tablolari.csv", BEDEN_SUTUNLARI)):
        if not (kok / ad).exists():
            csv_yaz(kok / ad, sutunlar, [])
    print(f"Klasörler ve boş tablolar hazır: {kok}")
    return 0


def main() -> int:
    a = argparse.ArgumentParser(description="Elle toplanan görselleri adlandırır, kaynak ve beden tablolarını doldurur.")
    a.add_argument("kok", type=Path, help="veri klasörü (sanal-urun-deneme-veri)")
    a.add_argument("--tur", choices=TURLER, help="gelen/ içindeki görsellerin türü")
    a.add_argument("--toplayan", help="kaynak.csv'ye yazılacak ad, ör. tugce")
    a.add_argument("--dene", action="store_true", help="dosyalara dokunmadan ne yapacağını yaz")
    a.add_argument("--durum", action="store_true", help="türlere göre sayıları ve eksikleri göster")
    a.add_argument("--sablon", action="store_true", help="klasör düzenini ve boş tabloları oluştur")
    args = a.parse_args()

    if args.sablon:
        return sablon(args.kok)
    if not args.kok.is_dir():
        sys.exit(f"Klasör yok: {args.kok} (önce --sablon)")
    if args.durum:
        return durum(args.kok)
    if not (args.tur and args.toplayan):
        sys.exit("--tur ve --toplayan gerekli (ya da --durum)")
    return isle(args.kok, args.tur, args.toplayan, args.dene)


if __name__ == "__main__":
    raise SystemExit(main())
