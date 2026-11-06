"""Avatarın boy, göğüs, bel, kalça (cm) ve kilo (kg) ölçülerini çıkarır.

Çevreler mezura gibi ölçülür: vücut yatay bir düzlemle kesilir, gövdeye ait kesit seçilir
ve dışbükey zarfının çevresi alınır (mezura da girintilerin üzerinden geçer).
Kilo, mesh'in kapladığı hacimden hesaplanır.

Girdiler numpy dizileridir, bpy gerekmez:
  koseler  (N, 3) metre, +Z yukarı (Blender ekseni)
  ucgenler (T, 3) köşe indisleri
"""

import numpy as np

# Kesitlerin aranacağı yükseklik aralıkları (boyun oranı olarak), seçim kuralı ve
# koltuk altında durulup durulmayacağı
ARALIKLAR = {
    "gogus": (0.68, 0.76, max, True),
    "bel": (0.58, 0.66, min, False),
    "kalca": (0.46, 0.56, max, False),
}
ADIM_M = 0.005
KOL_SICRAMASI = 1.15
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


def _zarf_cevresi(xy):
    """Dışbükey zarfın çevresi (monotone chain)."""
    p = sorted(map(tuple, xy))
    if len(p) < 3:
        return 0.0

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

    zarf = np.array(yarim(p)[:-1] + yarim(p[::-1])[:-1])
    return float(np.linalg.norm(zarf - np.roll(zarf, 1, axis=0), axis=1).sum())


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


def olc(koseler, ucgenler):
    """{"boy", "gogus", "bel", "kalca"} → cm, "kilo" → kg (bir ondalık)."""
    koseler = np.asarray(koseler, dtype=np.float64)
    ucgenler = np.asarray(ucgenler)
    taban, tepe = koseler[:, 2].min(), koseler[:, 2].max()
    boy = tepe - taban

    sonuc = {"boy": round(float(boy) * 100, 1)}
    for ad, (alt, ust, sec, kolda_dur) in ARALIKLAR.items():
        cevreler = []
        onceki_genislik = None
        for z in np.arange(taban + alt * boy, taban + ust * boy, ADIM_M):
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
    return sonuc
