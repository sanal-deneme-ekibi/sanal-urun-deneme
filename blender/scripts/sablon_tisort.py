"""Tişört şablonunu avatarın üzerine kurar: assets/models/sablon_tisort.glb, .calib.json, .keypoints.json

Çalıştırma (repo kökünden; avatar_kadin.glb hazır olmalı):
    blender --background --python blender/scripts/sablon_tisort.py

Yöntem:
  1. Avatar GLB'si okunur; tabanı ve 5 vücut key'i ayrı ayrı vücut olarak alınır.
  2. Gövde: vücut yatay düzlemlerle kesilir, her kesitin dışbükey zarfına bolluk payı eklenir
     ve zarf sabit sayıda noktaya bölünür. Göğsün altında kumaş göğüsten düz iner (bele oturmaz).
  3. Kollar: kol ekseni boyunca, eksene dik kesitlerle aynı şekilde örülür.
  4. Her halka aynı sayıda noktadan oluştuğu için bütün vücutlar ve ürün ölçüleri aynı
     topolojide çıkar; farkları shape key olur.
  5. UV düzeni ve anahtar noktalar sözleşmedeki gibidir (docs/glb-sozlesmesi.md).

Ayarlar aşağıdaki URUN sözlüğünde: her ürün key'inin 0 ve 1 değeri.
"""

import json
import random
import sys
from datetime import date
from pathlib import Path

import bpy
import numpy as np

BETIK_KLASORU = Path(__file__).resolve().parent
REPO = BETIK_KLASORU.parents[1]
sys.path.insert(0, str(BETIK_KLASORU))

import olcum  # noqa: E402

MODEL = "sablon_tisort"
AVATAR_YOLU = REPO / "assets" / "models" / "avatar_kadin.glb"
GLB_YOLU = REPO / "assets" / "models" / f"{MODEL}.glb"
KALIB_YOLU = REPO / "assets" / "models" / f"{MODEL}.calib.json"
NOKTA_YOLU = REPO / "assets" / "models" / f"{MODEL}.keypoints.json"

VUCUT_KEYLER = ["height", "chest", "waist", "hip", "weight"]

# Ürün key'leri: (0 değeri, 1 değeri)
URUN = {
    # Etek hizası: 0 = bel hizası (kısa), 1 = kasık hizası (uzun); arası doğrusal
    "length": (0.0, 1.0),
    # Göğüs çevresine eklenen bolluk payı (cm): 0 = dar, 1 = çok bol
    "width": (4.0, 30.0),
    # Kol boyu, omuz dikişinden manşete, boyun oranı olarak: 0 = kısa kol, 1 = bilek
    "sleeve": (0.08, 0.33),
}
URUN_OLCU = {"length": "boy", "width": "en", "sleeve": "kol"}

GOVDE_SATIR = 40
GOVDE_CEYREK = 16  # gövde halkası 4 çeyrek × 16 nokta
KOL_SATIR = 14
KOL_CEYREK = 8
KOL_BINDIRME_M = 0.04  # kol, kol yuvasını kapatmak için gövdenin içinden başlar
KOL_REF_M = 0.14  # bu noktaya kadar kol kesiti sabit alınır (omuzda kesit gövdeye karışır)
EN_AZ_PAY_M = 0.006  # kumaş ile ten arası en az boşluk
KOL_EN_AZ_PAY_M = 0.012  # kol ekseni dirsekte kıvrıldığı için kolda daha geniş tutulur
ORNEK_SAYISI = 6

# UV (Blender ekseni, v yukarı): gövde v 0.27–1, kollar v 0–0.25 (sözleşme: Standart UV düzeni)
GOVDE_V = (0.27, 1.0)
KOL_V = (0.0, 0.25)


# ---------------------------------------------------------------------------
# Kesitler
# ---------------------------------------------------------------------------

def parcalar(k, u, d):
    """d (köşe başına işaretli uzaklık) = 0 yüzeyindeki kesiti bağlı parçalara ayırır; (K, 3) noktalar."""
    du = d[u]
    secili = u[(du.min(axis=1) < 0) & (du.max(axis=1) > 0)]
    nokta, ebeveyn = {}, {}

    def kok(a):
        while ebeveyn[a] != a:
            ebeveyn[a] = ebeveyn[ebeveyn[a]]
            a = ebeveyn[a]
        return a

    for ucgen in secili:
        kesen = []
        for i, j in ((ucgen[0], ucgen[1]), (ucgen[1], ucgen[2]), (ucgen[2], ucgen[0])):
            if d[i] * d[j] < 0:
                a = (min(i, j), max(i, j))
                if a not in nokta:
                    t = d[i] / (d[i] - d[j])
                    nokta[a] = k[i] + t * (k[j] - k[i])
                    ebeveyn[a] = a
                kesen.append(a)
        for a, b in zip(kesen, kesen[1:]):
            ebeveyn[kok(a)] = kok(b)

    gruplar = {}
    for a, p in nokta.items():
        gruplar.setdefault(kok(a), []).append(p)
    return [np.array(g) for g in gruplar.values()]


def govde_kesiti(k, u, z):
    """z yüksekliğinde orta çizgiyi (x=0) kesen parçanın xy noktaları; yoksa None."""
    for p in parcalar(k, u, k[:, 2] - z - 1e-7):
        if p[:, 0].min() < 0 < p[:, 0].max():
            return p[:, :2]
    return None


def kirp(xy, x_sinir):
    return xy[np.abs(xy[:, 0]) <= x_sinir]


def ote(cokgen, pay):
    """Saat yönünün tersine dışbükey çokgeni her köşesinden dışa doğru pay kadar büyütür."""
    onceki, sonraki = np.roll(cokgen, 1, axis=0), np.roll(cokgen, -1, axis=0)

    def dis_normal(a, b):
        t = b - a
        n = np.stack([t[:, 1], -t[:, 0]], axis=1)
        return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)

    n1, n2 = dis_normal(onceki, cokgen), dis_normal(cokgen, sonraki)
    m = n1 + n2
    m /= np.maximum(np.linalg.norm(m, axis=1, keepdims=True), 1e-12)
    olcek = 1 / np.maximum((m * n1).sum(axis=1), 0.3)
    return cokgen + m * (pay * olcek)[:, None]


def yeniden_orn(cokgen, merkez, yonler, ceyrek):
    """Çokgeni 4 ışının kestiği noktalardan çeyreklere böler, her çeyrekte eşit yay boyunda örnekler.

    yonler saat yönünün tersine sıralı 4 birim vektördür; dönen noktalar ilk ışından başlar.
    Böylece her vücutta aynı indis aynı yere (ön orta, yan dikiş...) düşer.
    """
    a, b = cokgen, np.roll(cokgen, -1, axis=0)
    boy = np.linalg.norm(b - a, axis=1)
    birikim = np.concatenate([[0.0], np.cumsum(boy)])
    toplam = birikim[-1]

    def isin_yayi(r):
        for i in range(len(a)):
            e = b[i] - a[i]
            m = np.array([[r[0], -e[0]], [r[1], -e[1]]])
            if abs(np.linalg.det(m)) < 1e-12:
                continue
            t, lam = np.linalg.solve(m, a[i] - merkez)
            if t > 0 and -1e-9 <= lam < 1 + 1e-9:
                return birikim[i] + lam * boy[i]
        raise RuntimeError("Işın çokgeni kesmedi")

    def yaydaki_nokta(s):
        s %= toplam
        i = min(np.searchsorted(birikim, s, side="right") - 1, len(a) - 1)
        return a[i] + (s - birikim[i]) / max(boy[i], 1e-12) * (b[i] - a[i])

    yaylar = [isin_yayi(np.asarray(r, dtype=float)) for r in yonler]
    noktalar = []
    for q in range(4):
        bas, son = yaylar[q], yaylar[(q + 1) % 4]
        if son <= bas:
            son += toplam
        noktalar += [yaydaki_nokta(bas + (son - bas) * j / ceyrek) for j in range(ceyrek)]
    return np.array(noktalar)


# ---------------------------------------------------------------------------
# Vücut işaretleri
# ---------------------------------------------------------------------------

def isaretler(k, u):
    """Şablonun kurulduğu yükseklikler ve kol yuvası sınırı (m)."""
    boy = k[:, 2].max()
    adim = 0.005

    # Kasık: gövde kesitinin orta çizgiyi kestiği en alçak yer
    z_kasik = next(z for z in np.arange(0.35 * boy, 0.6 * boy, adim) if govde_kesiti(k, u, z) is not None)

    # Koltuk altı: kollar gövdeye karışınca genişlik birden sıçrar
    onceki = None
    for z in np.arange(0.62 * boy, 0.85 * boy, adim):
        g = np.ptp(govde_kesiti(k, u, z)[:, 0])
        if onceki and g > onceki * olcum.KOL_SICRAMASI:
            break
        onceki, z_koltuk = g, z
    x_sinir = onceki / 2 + 0.01

    def kirpik_cevre(z):
        return olcum.cevre(olcum.zarf(kirp(govde_kesiti(k, u, z), x_sinir)))

    z_bel = min(np.arange(0.58 * boy, 0.66 * boy, adim), key=lambda z: olcum.cevre(olcum.zarf(govde_kesiti(k, u, z))))
    z_gogus = max(np.arange(z_koltuk - 0.12, z_koltuk, adim), key=kirpik_cevre)

    # Yaka: boyun çevresinin 1,3 katına inilen ilk yükseklik
    boyun = min(kirpik_cevre(z) for z in np.arange(0.84 * boy, 0.88 * boy, adim))
    z_ust = next(z for z in np.arange(z_koltuk + 0.03, 0.9 * boy, adim) if kirpik_cevre(z) <= 1.3 * boyun)

    # Omuz dikişi: kesitin kol yuvası sınırına hâlâ uzandığı en yüksek yer
    z_omuz = z_koltuk
    for z in np.arange(z_koltuk, z_ust, adim):
        if np.abs(govde_kesiti(k, u, z)[:, 0]).max() >= x_sinir:
            z_omuz = z

    return {"boy": boy, "kasik": z_kasik, "bel": z_bel, "gogus": z_gogus, "koltuk": z_koltuk,
            "omuz": z_omuz, "ust": z_ust, "x_sinir": x_sinir}


# ---------------------------------------------------------------------------
# Gövde ve kollar
# ---------------------------------------------------------------------------

GOVDE_YONLER = [(-1, 0), (0, -1), (1, 0), (0, 1)]  # sağ yan → ön orta → sol yan → arka orta


def govde_payi(z, isr, pay_cm):
    """Halkanın dışa ötelenme miktarı (m); koltuk altından yakaya doğru azalır."""
    e = pay_cm / 100 / (2 * np.pi)
    if z > isr["koltuk"]:
        e *= 1 - 0.85 * min(1.0, (z - isr["koltuk"]) / (isr["ust"] - isr["koltuk"]))
    return max(EN_AZ_PAY_M, e)


def govde_halkasi(k, u, z, isr, pay_cm, gogus_xy):
    xy = kirp(govde_kesiti(k, u, z), isr["x_sinir"])
    if z < isr["gogus"]:
        xy = np.vstack([xy, gogus_xy])  # kumaş göğüsten düz iner
    cokgen = ote(olcum.zarf(xy), govde_payi(z, isr, pay_cm))
    return yeniden_orn(cokgen, cokgen.mean(axis=0), GOVDE_YONLER, GOVDE_CEYREK)


def etek_hizasi(isr, length):
    """Etek yüksekliği: 0 = bel hizası, 1 = kasığın hemen üstü (kasık–koltuk arası oranla)."""
    bel_orani = 0.42  # bel, kasıkla koltuk altı arasının yaklaşık bu oranında
    oran = bel_orani + length * (0.02 - bel_orani)
    return isr["kasik"] + oran * (isr["koltuk"] - isr["kasik"])


def govde(k, u, isr, urun):
    """(GOVDE_SATIR, 64, 3) gövde noktaları, etekten yakaya."""
    z_etek = etek_hizasi(isr, urun["length"])
    gogus_xy = kirp(govde_kesiti(k, u, isr["gogus"]), isr["x_sinir"])
    satirlar = []
    for i in range(GOVDE_SATIR):
        z = z_etek + (isr["ust"] - z_etek) * i / (GOVDE_SATIR - 1)
        halka = govde_halkasi(k, u, z, isr, urun["width"], gogus_xy)
        satirlar.append(np.column_stack([halka, np.full(len(halka), z)]))
    return np.array(satirlar), z_etek


def duzlem_cercevesi(d):
    """Kola dik düzlemde (ön, yukarı) birim vektörleri."""
    on = np.array([0.0, -1.0, 0.0])
    on -= (on @ d) * d
    yukari = np.array([0.0, 0.0, 1.0])
    yukari -= (yukari @ d) * d
    return on / np.linalg.norm(on), yukari / np.linalg.norm(yukari)


def kol_kesiti(k, u, merkez, d, yaricap):
    """Merkezden geçen, d'ye dik düzlemde merkeze en yakın parçanın, yarıçap içindeki noktaları."""
    adaylar = []
    for p in parcalar(k, u, (k - merkez) @ d):
        p = p[np.linalg.norm(p - merkez, axis=1) <= yaricap]
        if len(p) >= 3:
            adaylar.append(p)
    if not adaylar:
        return None
    return min(adaylar, key=lambda p: np.linalg.norm(p.mean(axis=0) - merkez))


def kol_hatti(k, u, isr, isaret):
    """Kolun orta hattı: omuz dikişinden (s=0) bileğe doğru (s, merkez, yön) listesi.

    Koltuk altının altında kol gövdeden ayrı durur; yatay kesitlerindeki kol parçasının
    merkezleri kolun eksenini verir. Eksen yukarı, kol yuvası sınırına (x_sinir) kadar uzatılır.
    """
    merkezler = []
    for z in np.arange(isr["koltuk"] - 0.02, isr["koltuk"] - 0.6, -0.01):
        adaylar = [p for p in parcalar(k, u, k[:, 2] - z - 1e-7)
                   if isaret * p[:, 0].mean() > isr["x_sinir"] and not p[:, 0].min() < 0 < p[:, 0].max()]
        if not adaylar:
            break
        onceki = merkezler[-1] if merkezler else None
        p = min(adaylar, key=lambda p: np.linalg.norm(p.mean(axis=0) - onceki) if onceki is not None
                else -isaret * p[:, 0].mean())
        merkezler.append(p.mean(axis=0))
        if len(merkezler) == 1:
            yaricap = 1.4 * np.linalg.norm(p - p.mean(axis=0), axis=1).mean()
    # Eğik kolun yatay kesitleri dirsekte titrer; merkezler 5'li kayan ortalamayla yumuşatılır
    merkezler = np.array(merkezler)
    dolgu = np.pad(merkezler, ((2, 2), (0, 0)), mode="edge")
    merkezler = np.mean([dolgu[i:i + len(merkezler)] for i in range(5)], axis=0)

    ust = merkezler[:10]
    d0 = np.linalg.svd(ust - ust.mean(axis=0))[2][0]
    if isaret * d0[0] < 0:
        d0 = -d0
    p0 = ust.mean(axis=0) + d0 * ((isaret * isr["x_sinir"] - ust.mean(axis=0)[0]) / d0[0])

    noktalar = np.vstack([p0, merkezler[(merkezler - p0) @ d0 > 0]])
    yonler = np.diff(noktalar, axis=0)
    adimlar = np.linalg.norm(yonler, axis=1)
    s = np.concatenate([[0.0], np.cumsum(adimlar)])
    yonler = np.vstack([yonler / adimlar[:, None], yonler[-1:] / adimlar[-1]])
    return [(s[i], noktalar[i], yonler[i]) for i in range(len(noktalar))], yaricap


def hattaki_yer(hat, s):
    s = min(max(s, hat[0][0]), hat[-1][0])
    i = min(int(np.searchsorted([h[0] for h in hat], s, side="right")) - 1, len(hat) - 2)
    (s0, c0, d0), (s1, c1, d1) = hat[i], hat[i + 1]
    t = (s - s0) / (s1 - s0)
    d = (1 - t) * d0 + t * d1
    return (1 - t) * c0 + t * c1, d / np.linalg.norm(d)


KOL_YONLER = [(0, -1), (1, 0), (0, 1), (-1, 0)]  # koltuk altı → ön → üst → arka


def kol(k, u, isr, urun, isaret):
    """(KOL_SATIR, 32, 3) kol noktaları, omuzdan manşete."""
    hat, yaricap = kol_hatti(k, u, isr, isaret)
    pay = max(KOL_EN_AZ_PAY_M, 0.4 * govde_payi(isr["koltuk"], isr, urun["width"]) + 0.004)
    son = min(urun["sleeve"] * isr["boy"], hat[-1][0])

    def halka(s):
        merkez, d = hattaki_yer(hat, max(s, KOL_REF_M))
        kesit = kol_kesiti(k, u, merkez, d, yaricap)
        if kesit is None:
            raise RuntimeError(f"Kol kesiti bulunamadı (s={s:.2f} m)")
        on, yukari = duzlem_cercevesi(d)
        ab = np.column_stack([(kesit - merkez) @ on, (kesit - merkez) @ yukari])
        cokgen = ote(olcum.zarf(ab), pay)
        if s < KOL_REF_M:  # omuz başı: referans kesit, kol yuvasını örtecek kadar genişletilmiş
            cokgen = cokgen * (1 + 0.12 * (KOL_REF_M - s) / (KOL_REF_M + KOL_BINDIRME_M))
            merkez, d = hat[0][1] + hat[0][2] * s, hat[0][2]
            on, yukari = duzlem_cercevesi(d)
        ab = yeniden_orn(cokgen, np.zeros(2), KOL_YONLER, KOL_CEYREK)
        return merkez + ab[:, :1] * on + ab[:, 1:] * yukari, d

    satirlar = []
    for j in range(KOL_SATIR):
        s = -KOL_BINDIRME_M + (son + KOL_BINDIRME_M) * j / (KOL_SATIR - 1)
        satirlar.append(halka(s)[0])
    return np.array(satirlar), son, hat[0][2]


# ---------------------------------------------------------------------------
# Şablon
# ---------------------------------------------------------------------------

def urun_ayari(agirliklar):
    return {key: a + agirliklar.get(key, 0.0) * (b - a) for key, (a, b) in URUN.items()}


def sablon(k, u, agirliklar):
    """Bir vücut ve ürün key'leri için bütün köşeler (tek dizi) ve ölçüler."""
    isr = isaretler(k, u)
    urun = urun_ayari(agirliklar)
    g, z_etek = govde(k, u, isr, urun)
    kol_sol, kol_boy, d_sol = kol(k, u, isr, urun, +1)
    kol_sag, _, d_sag = kol(k, u, isr, urun, -1)

    # Ürün ölçüleri: beden tablosuyla aynı tanımlar (ml/veri-protokolu.md)
    gogus_xy = kirp(govde_kesiti(k, u, isr["gogus"]), isr["x_sinir"])
    en_halka = govde_halkasi(k, u, isr["koltuk"] - 0.025, isr, urun["width"], gogus_xy)
    olculer = {
        "boy": round((g[-1][:, 2].max() - z_etek) * 100, 1),
        "en": round(olcum.cevre(en_halka) / 2 * 100, 1),
        "kol": round(kol_boy * 100, 1),
    }
    return np.concatenate([g.reshape(-1, 3), kol_sol.reshape(-1, 3), kol_sag.reshape(-1, 3)]), olculer, (d_sol, d_sag)


def izgara(satir, sutun, bas, ters):
    """satir × sutun noktalı kapalı tüpün dörtgenleri (her satırın son sütunu ilkine bağlanır)."""
    yuzler = []
    for i in range(satir - 1):
        for j in range(sutun):
            a, b = bas + i * sutun + j, bas + i * sutun + (j + 1) % sutun
            c, e = b + sutun, a + sutun
            yuzler.append((a, e, c, b) if ters else (a, b, c, e))
    return yuzler


def uv_izgara(satir, sutun, u_aralik, v_aralik, ters_v):
    """Her dörtgenin köşe UV'leri; dikiş sütunu u'nun iki ucunda ayrı UV alır."""
    uvler = []
    for i in range(satir - 1):
        for j in range(sutun):
            def uv(ii, jj):
                u = u_aralik[0] + (u_aralik[1] - u_aralik[0]) * jj / sutun
                t = ii / (satir - 1)
                v = v_aralik[0] + (v_aralik[1] - v_aralik[0]) * ((1 - t) if ters_v else t)
                return (u, v)
            uvler.append([uv(i, j), uv(i, j + 1), uv(i + 1, j + 1), uv(i + 1, j)])
    return uvler


def mesh_kur(koseler, d_sol):
    gs, gc = GOVDE_SATIR, 4 * GOVDE_CEYREK
    ks, kc = KOL_SATIR, 4 * KOL_CEYREK
    on, yukari = duzlem_cercevesi(d_sol)
    sol_ters = np.cross(on, yukari) @ d_sol < 0  # kol halkasının dönüş yönü sağ ve sol kolda ters

    yuzler = izgara(gs, gc, 0, False)
    yuzler += izgara(ks, kc, gs * gc, sol_ters)
    yuzler += izgara(ks, kc, gs * gc + ks * kc, not sol_ters)

    # UV: gövdede u = sağ yan (0) → ön → sol yan (0,5) → arka → sağ yan (1); v etekten yakaya.
    # Kollarda u = koltuk altı → ön → üst → arka; sağ kol 0–0,5, sol kol 0,5–1; v omuzdan (0,25) manşete (0).
    def kol_uv(u_aralik, ters):
        # Ters sargılı kolda dörtgenin köşe sırası (a, e, c, b) olur; UV'ler de aynı sırayla
        return [[a, e, c, b] if ters else [a, b, c, e]
                for a, b, c, e in uv_izgara(ks, kc, u_aralik, KOL_V, True)]

    uvler = uv_izgara(gs, gc, (0.0, 1.0), GOVDE_V, False)
    uvler += kol_uv((0.5, 1.0), sol_ters)
    uvler += kol_uv((0.0, 0.5), not sol_ters)

    mesh = bpy.data.meshes.new("Garment")
    mesh.from_pydata(koseler.tolist(), [], yuzler)
    katman = mesh.uv_layers.new(name="UVMap")
    for f, poly in enumerate(mesh.polygons):
        for n, dongu in enumerate(poly.loop_indices):
            katman.data[dongu].uv = uvler[f][n]
    for p in mesh.polygons:
        p.use_smooth = True
    nesne = bpy.data.objects.new("Garment", mesh)
    bpy.context.collection.objects.link(nesne)
    return nesne


def anahtar_noktalar(isr):
    """Sözleşmedeki 7 noktanın UV'si; GLB'deki gibi (glTF: sol üst köşe 0,0, v aşağı)."""
    t_omuz = (isr["omuz"] - isr["etek"]) / (isr["ust"] - isr["etek"])
    v_omuz = GOVDE_V[0] + (GOVDE_V[1] - GOVDE_V[0]) * t_omuz
    blender = {
        "yaka_orta": (0.25, GOVDE_V[1]),
        "omuz_sol": (0.5, v_omuz),
        "omuz_sag": (0.0, v_omuz),
        "kol_sol": (0.5 + 0.5 * 0.25, KOL_V[0]),
        "kol_sag": (0.5 * 0.25, KOL_V[0]),
        "etek_sol": (0.5, GOVDE_V[0]),
        "etek_sag": (0.0, GOVDE_V[0]),
    }
    return {ad: [round(u, 4), round(1 - v, 4)] for ad, (u, v) in blender.items()}


# ---------------------------------------------------------------------------

def avatar_vucutlari():
    """Avatar GLB'sinden taban ve her vücut key'i 1'deki köşeler + üçgenler (Blender ekseni)."""
    bpy.ops.import_scene.gltf(filepath=str(AVATAR_YOLU))
    av = bpy.data.objects["Avatar"]
    mesh = av.data
    mesh.calc_loop_triangles()
    u = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int64)
    mesh.loop_triangles.foreach_get("vertices", u)
    m = np.array(av.matrix_world)
    vucut = {}
    for blok in mesh.shape_keys.key_blocks:
        k = np.empty(len(mesh.vertices) * 3)
        blok.data.foreach_get("co", k)
        vucut["taban" if blok.name == "Basis" else blok.name] = k.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]
    bpy.data.objects.remove(av, do_unlink=True)

    # GLB, UV dikişlerindeki köşeleri ikiye böler (ör. sırt orta çizgisi); kesitler parçalanmasın
    # diye aynı yerdeki köşeler birleştirilir.
    _, ilk, yeni = np.unique(np.round(vucut["taban"], 6), axis=0, return_index=True, return_inverse=True)
    vucut = {ad: k[ilk] for ad, k in vucut.items()}
    return vucut, yeni.ravel()[u.reshape(-1, 3)]


def main():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)

    print("[1/5] Avatar okunuyor")
    vucut, u = avatar_vucutlari()

    print("[2/5] Taban şablon kuruluyor")
    taban, taban_olcu, (d_sol, _) = sablon(vucut["taban"], u, {})
    isr = isaretler(vucut["taban"], u)
    isr["etek"] = etek_hizasi(isr, 0.0)
    print(f"      {len(taban)} köşe · ölçüler {taban_olcu}")

    nesne = mesh_kur(taban, d_sol)
    nesne.shape_key_add(name="Basis", from_mix=False)
    ucgen = sum(len(p.vertices) - 2 for p in nesne.data.polygons)
    print(f"      {ucgen} üçgen")

    print("[3/5] Shape key'ler")
    deltalar, govde_etki = {}, {}
    for key in VUCUT_KEYLER:
        k_key, olcu, _ = sablon(vucut[key], u, {})
        deltalar[key] = k_key - taban
        govde_etki[key] = {o: round(olcu[o] - taban_olcu[o], 1) for o in taban_olcu}
        print(f"      {key}: {govde_etki[key]}")
    etki = {}
    for key in URUN:
        k_key, olcu, _ = sablon(vucut["taban"], u, {key: 1.0})
        deltalar[key] = k_key - taban
        etki[key] = {o: round(olcu[o] - taban_olcu[o], 1) for o in taban_olcu}
        print(f"      {key}: {etki[key]}")
    for key, delta in deltalar.items():
        blok = nesne.shape_key_add(name=key, from_mix=False)
        blok.data.foreach_set("co", (taban + delta).ravel())
        blok.value = 0.0

    print("[4/5] Kalibrasyon ve anahtar noktalar")
    rastgele = random.Random(42)
    ornekler, hatalar = [], {o: [] for o in taban_olcu}
    for _ in range(ORNEK_SAYISI):
        agirliklar = {key: round(rastgele.random(), 2) for key in URUN}
        _, olculen, _ = sablon(vucut["taban"], u, agirliklar)
        for o in taban_olcu:
            tahmin = taban_olcu[o] + sum(etki[key][o] * agirliklar[key] for key in URUN)
            hatalar[o].append(abs(tahmin - olculen[o]))
        ornekler.append({"agirliklar": agirliklar, "olculen": olculen})
    kalib = {
        "surum": 1,
        "model": MODEL,
        "betik": "blender/scripts/sablon_tisort.py",
        "tarih": date.today().isoformat(),
        "birim": "cm",
        "keyler": list(URUN),
        "olcumler": [URUN_OLCU[key] for key in URUN],
        "taban": taban_olcu,
        "etki": etki,
        "ornekler": ornekler,
        # Sözleşmede yok, öneri: vücut key'leri şablonun ölçülerini de değiştirir
        "govde_etki": govde_etki,
    }
    KALIB_YOLU.write_text(json.dumps(kalib, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    hata = {o: round(float(np.mean(h)), 2) for o, h in hatalar.items()}
    print(f"      doğrusal model ortalama hatası: {hata}")

    noktalar = {
        "surum": 1,
        "model": MODEL,
        "uv_ekseni": "glTF: (0,0) sol üst köşe, v aşağı doğru (GLB'deki TEXCOORD_0 ile aynı)",
        "sira": list(anahtar_noktalar(isr)),
        "uv": anahtar_noktalar(isr),
    }
    NOKTA_YOLU.write_text(json.dumps(noktalar, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("[5/5] GLB dışa aktarılıyor")
    malzeme = bpy.data.materials.new("Kumas")
    malzeme.use_nodes = True
    malzeme.use_backface_culling = False  # yakadan içi görünür: çift yüzlü
    bsdf = malzeme.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.92, 0.92, 0.92, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.8
    nesne.data.materials.append(malzeme)
    nesne.data.shape_keys.use_relative = True

    bpy.ops.object.select_all(action="DESELECT")
    nesne.select_set(True)
    bpy.context.view_layer.objects.active = nesne
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_YOLU), export_format="GLB", use_selection=True, export_yup=True,
        export_apply=False, export_morph=True, export_morph_normal=True, export_skins=False,
        export_animations=False, export_draco_mesh_compression_enable=True,
    )
    print(f"      {GLB_YOLU.relative_to(REPO)} ({GLB_YOLU.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
