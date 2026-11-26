"""Avatarın boy, göğüs, bel, kalça, kol boyu, iç bacak (cm) ve kilo (kg) ölçülerini çıkarır.

Çevreler mezura gibi ölçülür: vücut yatay bir düzlemle kesilir, gövdeye ait kesit seçilir
ve dışbükey zarfının çevresi alınır (mezura da girintilerin üzerinden geçer).
Kilo, mesh'in kapladığı hacimden hesaplanır.

Çevrelerin arandığı yükseklikler boyun oranıyla değil kasık–koltuk altı arasıyla tanımlıdır;
böylece bacak ve kol uzunluğu değişince göğüs/bel/kalça ölçüleri yerinden kaymaz.

Girdiler numpy dizileridir, bpy gerekmez:
  koseler  (N, 3) metre, +Z yukarı (Blender ekseni)
  ucgenler (T, 3) köşe indisleri
"""

import numpy as np

# Kesitlerin aranacağı yükseklik aralıkları (kasık = 0, koltuk altı = 1), seçim kuralı ve
# koltuk altında durulup durulmayacağı
ARALIKLAR = {
    "gogus": (0.75, 1.06, max, True),
    "bel": (0.43, 0.71, min, False),
    "kalca": (0.0, 0.36, max, False),
}
ADIM_M = 0.005
KOL_SICRAMASI = 1.15
OMUZ_BASI_ORANI = 0.26  # omuz başı, koltuk altından gövde boyunun (kasık–koltuk) ~%26'sı yukarıda
YOGUNLUK_KG_L = 1.0  # insan vücudu ≈ 1,0–1,06; tutarlılık için 1 alındı (kalibrasyon farkı taşır)


def _kesit_parcalari(koseler, ucgenler, z):
    """z yüksekliğindeki kesiti bağlı parçalara ayırır; her parça (K, 2) xy noktalarıdır."""
    zs = koseler[ucgenler][:, :, 2]
    secili = ucgenler[(zs.min(axis=1) < z) & (zs.max(axis=1) > z)]

    nokta = {}
    ebeveyn = {}

    def kok(k):
        while ebeveyn[k] != k:
            ebeveyn[k] = ebeveyn[ebeveyn[k]]
            k = ebeveyn[k]
        return k

    for ucgen in secili:
        kesenler = []
        for i, j in ((ucgen[0], ucgen[1]), (ucgen[1], ucgen[2]), (ucgen[2], ucgen[0])):
            zi, zj = koseler[i, 2], koseler[j, 2]
            if (zi - z) * (zj - z) < 0:
                anahtar = (min(i, j), max(i, j))
                if anahtar not in nokta:
                    t = (z - zi) / (zj - zi)
                    nokta[anahtar] = koseler[i, :2] + t * (koseler[j, :2] - koseler[i, :2])
                    ebeveyn[anahtar] = anahtar
                kesenler.append(anahtar)
        for a, b in zip(kesenler, kesenler[1:]):
            ebeveyn[kok(a)] = kok(b)

    gruplar = {}
    for anahtar, xy in nokta.items():
        gruplar.setdefault(kok(anahtar), []).append(xy)
    return [np.array(g) for g in gruplar.values()]


def zarf(xy):
    """Dışbükey zarfın köşeleri, saat yönünün tersine (monotone chain); 3'ten az noktada boş."""
    p = sorted(map(tuple, xy))
    if len(p) < 3:
        return np.empty((0, 2))

    def yarim(noktalar):
        zincir = []
        for q in noktalar:
            while len(zincir) >= 2:
                (ax, ay), (bx, by) = zincir[-2], zincir[-1]
                if (bx - ax) * (q[1] - ay) - (by - ay) * (q[0] - ax) > 0:
                    break
                zincir.pop()
            zincir.append(q)
        return zincir

    return np.array(yarim(p)[:-1] + yarim(p[::-1])[:-1])


def cevre(cokgen):
    """Kapalı çokgenin çevresi."""
    if len(cokgen) < 3:
        return 0.0
    return float(np.linalg.norm(cokgen - np.roll(cokgen, 1, axis=0), axis=1).sum())


def _zarf_cevresi(xy):
    return cevre(zarf(xy))


def govde_kesiti(koseler, ucgenler, z):
    """z yüksekliğinde gövdenin (çevre, genişlik) değeri (m); kesit orta çizgiyi kesmiyorsa None.

    Ayrık duran kollar ve bacaklar orta çizginin yanında kaldığı için elenir.
    """
    for parca in _kesit_parcalari(koseler, ucgenler, z):
        if parca[:, 0].min() < 0 < parca[:, 0].max():
            return _zarf_cevresi(parca), float(np.ptp(parca[:, 0]))
    return None


def hacim_litre(koseler, ucgenler):
    """Mesh'in hacmi (L): her üçgenin orijinle oluşturduğu dört yüzlülerin işaretli toplamı.

    Göz ve ağız gibi küçük açıklıklar hacmi ancak birkaç mililitre etkiler.
    """
    a, b, c = (koseler[ucgenler[:, i]] for i in range(3))
    return abs(float(np.einsum("ij,ij->i", a, np.cross(b, c)).sum())) / 6 * 1000


def isaretler(koseler, ucgenler):
    """Ölçümlerin dayandığı yükseklikler (m): taban, boy, kasık, koltuk altı ve kol yuvası sınırı.

    Kasık: gövde kesitinin orta çizgiyi ilk kestiği yükseklik. Koltuk altı: kollar gövdeye
    karışınca kesit genişliği birden sıçrar. Kol yuvası sınırı (x_sinir): koltuk altının hemen
    altındaki gövde genişliğinin yarısı + 1 cm; tişört şablonundaki kol başıyla aynı yer.
    """
    taban, boy = koseler[:, 2].min(), np.ptp(koseler[:, 2])
    kasik = next(z for z in np.arange(taban + 0.3 * boy, taban + 0.65 * boy, ADIM_M / 5)
                 if govde_kesiti(koseler, ucgenler, z + 1e-7))
    onceki = None
    for z in np.arange(kasik + 0.1 * boy, taban + 0.9 * boy, ADIM_M):
        kesit = govde_kesiti(koseler, ucgenler, z + 1e-7)
        if onceki and kesit[1] > onceki * KOL_SICRAMASI:
            break
        onceki, koltuk = kesit[1], z
    return {"taban": taban, "boy": boy, "kasik": kasik, "koltuk": koltuk, "x_sinir": onceki / 2 + 0.01}


def kol_boyu(koseler, ucgenler, isr=None):
    """Omuz başından bileğe kol boyu (m), iki kolun ortalaması.

    Omuz başı, kol ekseninin koltuk altından OMUZ_BASI_ORANI × gövde boyu yukarıdaki noktası
    (terzinin mezurayı başlattığı yer); toplam boya bağlansaydı bacak uzayınca kol da uzardı. Bilek, kolun alt yarısında kesit çevresinin en dar olduğu
    yer (altında el genişler). Koltuk altının altında kol gövdeden ayrı durduğu için ekseni yatay
    kesitlerdeki kol parçasının merkezleri verir.
    """
    isr = isr or isaretler(koseler, ucgenler)
    boy, z_koltuk, x_sinir = isr["boy"], isr["koltuk"], isr["x_sinir"]

    boylar = []
    for isaret in (1, -1):
        merkezler, cevreler = [], []
        for z in np.arange(z_koltuk - 0.02, z_koltuk - 0.7 * boy, -0.005):
            adaylar = [p for p in _kesit_parcalari(koseler, ucgenler, z + 1e-7)
                       if isaret * p[:, 0].mean() > x_sinir and not p[:, 0].min() < 0 < p[:, 0].max()]
            if not adaylar:
                break
            if merkezler:
                yakin = [p for p in adaylar if np.linalg.norm(p.mean(axis=0) - merkezler[-1][:2]) < 0.08]
                if len(yakin) != 1:  # parmaklar ayrıldı (ya da kol kayboldu): el başladı, dur
                    break
                p = yakin[0]
            else:
                p = max(adaylar, key=lambda p: isaret * p[:, 0].mean())
            merkezler.append(np.append(p.mean(axis=0), z))
            cevreler.append(_zarf_cevresi(p))
        m = np.array(merkezler)
        m = np.mean([np.pad(m, ((2, 2), (0, 0)), mode="edge")[i:i + len(m)] for i in range(5)], axis=0)

        ust = m[:20]
        d = np.linalg.svd(ust - ust.mean(axis=0))[2][0]
        if isaret * d[0] < 0:
            d = -d
        # Omuz başı gövde genişliğine bağlı değil: göğüs ve kilo büyüyünce kol boyu kaymaz
        z_omuz = z_koltuk + OMUZ_BASI_ORANI * (z_koltuk - isr["kasik"])
        omuz = ust.mean(axis=0) + d * ((z_omuz - ust.mean(axis=0)[2]) / d[2])
        s = np.concatenate([[np.linalg.norm(m[0] - omuz)], np.linalg.norm(np.diff(m, axis=0), axis=1)]).cumsum()
        alt_yari = np.flatnonzero(s >= s[-1] / 2)
        bilek = alt_yari[np.argmin(np.array(cevreler)[alt_yari])]
        boylar.append(s[bilek])
    return float(np.mean(boylar))


def olc(koseler, ucgenler):
    """{"boy", "gogus", "bel", "kalca", "kol_boyu", "ic_bacak"} → cm, "kilo" → kg (bir ondalık)."""
    koseler = np.asarray(koseler, dtype=np.float64)
    ucgenler = np.asarray(ucgenler)
    isr = isaretler(koseler, ucgenler)
    govde = isr["koltuk"] - isr["kasik"]

    sonuc = {"boy": round(float(isr["boy"]) * 100, 1)}
    for ad, (alt, ust, sec, kolda_dur) in ARALIKLAR.items():
        cevreler = []
        onceki_genislik = None
        for z in np.arange(isr["kasik"] + alt * govde, isr["kasik"] + ust * govde, ADIM_M):
            kesit = govde_kesiti(koseler, ucgenler, z + 1e-7)
            if not kesit:
                continue
            cevre, genislik = kesit
            # Koltuk altında kollar gövdeye bağlanınca genişlik birden sıçrar; orada dur
            if kolda_dur and onceki_genislik and genislik > onceki_genislik * KOL_SICRAMASI:
                break
            onceki_genislik = genislik
            cevreler.append(cevre)
        sonuc[ad] = round(sec(cevreler) * 100, 1)
    sonuc["kilo"] = round(hacim_litre(koseler, ucgenler) * YOGUNLUK_KG_L, 1)
    sonuc["kol_boyu"] = round(kol_boyu(koseler, ucgenler, isr) * 100, 1)
    sonuc["ic_bacak"] = round(float(isr["kasik"] - isr["taban"]) * 100, 1)
    return sonuc
