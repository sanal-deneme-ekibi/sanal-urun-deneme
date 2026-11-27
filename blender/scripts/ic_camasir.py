"""Avatarın cilt dokusuna iç çamaşırı boyar: kadında sütyen + üçgen külot, erkekte boxer.

Avatarlar iç çamaşırlı görünür (göğüs, kalça ve kilo büyütülünce çıplak görüntü hoş durmuyordu).
Çamaşır ayrı bir mesh değil, UV dokusudur: avatar tek mesh kalır, shape key'lerle birlikte
gerilir, ölçüleri ve GLB sözleşmesi değişmez.

Bölgeler taban vücudun 3B konumlarından tanımlanır (kasık, koltuk altı, göğüs ucu); doku, her
UV üçgeni taranıp her pikselin 3B yeri bu tanımla sınıflandırılarak çizilir.
"""

import bpy
import numpy as np

import olcum

BOYUT = 2048  # doku çözünürlüğü (piksel)
ORNEKLEME = 2  # kenarları yumuşatmak için piksel başına 2×2 örnek

# sRGB renkler (0–255)
TEN = (231, 207, 192)  # eski düz cilt rengi (lineer 0,80 / 0,62 / 0,52)
KUMAS = (58, 60, 66)  # koyu gri: her ten rengiyle uyar, tişörtün altından belli olmaz
LASTIK = (38, 39, 44)  # bel lastiği, sütyen bandı ve askılar

TURLER = {"kadin": "sutyen_kulot", "erkek": "boxer"}


def _yan_sinir(k):
    """Her yükseklikte gövde+bacak yarı genişliği (m): kollar ve eller bunun dışında kalır.

    Bir yükseklik dilimindeki köşelerin |x| değerleri sıralanır; ortadan dışarı giderken ilk büyük
    boşluk gövde (ya da bacak) ile kol arasıdır.
    """
    dilim = 0.02
    z0 = k[:, 2].min()
    sinir = {}
    for b in range(int(np.ptp(k[:, 2]) / dilim) + 1):
        s = (k[:, 2] >= z0 + b * dilim) & (k[:, 2] < z0 + (b + 1) * dilim)
        xs = np.sort(np.abs(k[s, 0]))
        if len(xs) < 2:
            continue
        bosluk = np.flatnonzero((np.diff(xs) > 0.03) & (xs[:-1] > 0.06))
        sinir[b] = xs[bosluk[0]] + 0.005 if len(bosluk) else xs[-1] + 0.005
    dizi = np.array([sinir.get(b, 0.0) for b in range(max(sinir) + 1)])
    # Seyrek köşeli bir dilimde boşluk yanlışlıkla gövdenin içinde bulunabilir: komşu dilimlerin
    # en büyüğü alınır (kol, gövdeden en az bir dilim boyunca ayrı durur)
    dizi = np.max([np.roll(dizi, i) for i in (-1, 0, 1)], 0)
    return lambda z: dizi[np.clip(((z - z0) / dilim).astype(int), 0, len(dizi) - 1)]


def isaretler(k, u):
    """Çamaşır bölgelerinin dayandığı noktalar (taban vücutta)."""
    isr = olcum.isaretler(k, u)
    zc, za = isr["kasik"], isr["koltuk"]
    # Göğüs ucu: koltuk altının hemen altında, gövdenin en öndeki noktası (vücut −Y'ye bakar)
    s = (k[:, 2] > za - 0.2) & (k[:, 2] < za) & (np.abs(k[:, 0]) < isr["x_sinir"])
    gogus = k[np.flatnonzero(s)[np.argmin(k[s, 1])]]
    # Gövdenin ön/arka ayrımı: orta çizgideki köşelerin y ortası, yüksekliğe göre
    orta = k[np.abs(k[:, 0]) < 0.02]
    zler = np.linspace(zc - 0.2, za + 0.3, 60)
    y_orta = []
    for z in zler:
        d = orta[np.abs(orta[:, 2] - z) < 0.02]
        y_orta.append((d[:, 1].min() + d[:, 1].max()) / 2 if len(d) > 1 else np.nan)
    y_orta = np.array(y_orta)
    gecerli = ~np.isnan(y_orta)
    return {
        "zc": zc, "za": za, "d": za - zc, "x_sinir": isr["x_sinir"],
        "xb": abs(gogus[0]), "zb": gogus[2],
        "yan": _yan_sinir(k),
        "y_orta": lambda z: np.interp(z, zler[gecerli], y_orta[gecerli]),
    }


def _kulot(p, m):
    """Üçgen kesim külot: 0 ten, 1 kumaş, 2 lastik."""
    x, y, z = np.abs(p[:, 0]), p[:, 1], p[:, 2]
    zc, d = m["zc"], m["d"]
    ust = zc + 0.27 * d
    on = y < m["y_orta"](z)
    kalca = float(m["yan"](np.array([zc + 0.15 * d]))[0])
    # Bacak ağzı: kasıkta en alçak, yana doğru yükselir; arkada kalçayı daha çok örter
    egim = (ust - 0.025 - (zc - 0.02)) / (kalca - 0.02)
    alt = zc - 0.02 + np.where(on, 1.0, 0.55) * egim * np.maximum(x - 0.02, 0)
    ic = (z >= alt) & (z <= ust) & (x <= m["yan"](z))
    sonuc = ic.astype(np.uint8)
    sonuc[ic & (z > ust - 0.01)] = 2
    return sonuc


def _sutyen(p, m):
    """Sütyen: iki kap, kapların altında gövdeyi saran bant ve omuzdan banda inen askılar."""
    x, y, z = np.abs(p[:, 0]), p[:, 1], p[:, 2]
    xb, zb, gs = m["xb"], m["zb"], m["x_sinir"]
    on = y < m["y_orta"](z)
    govde = x < gs
    rx, rz = xb + 0.012, 0.6 * xb + 0.03  # kap yarı genişliği ve alt yarı yüksekliği
    bant_alt, bant_ust = zb - rz - 0.012, zb - rz + 0.022
    # Kap: alt yarısı elips; üst yarısı askıya doğru daralan üçgen
    kap_ust = zb + 0.9 * rz
    t = np.clip((z - zb) / (kap_ust - zb), 0, 1)
    xs = xb + 0.008  # askının x'i
    merkez = xb + (xs - xb) * t
    yari = rx * (1 - t) + 0.007 * t
    kap_alt = ((x - xb) / rx) ** 2 + ((z - zb) / rz) ** 2 < 1
    kap = on & govde & np.where(z < zb, kap_alt, (np.abs(x - merkez) < yari) & (z <= kap_ust))
    bant = govde & (z >= bant_alt) & (z <= bant_ust)
    omuz = m["za"] + 0.35 * m["d"]  # askı omuzun üstünde biter (yukarısı boyun ve baş)
    aski = govde & (np.abs(x - xs) < 0.0065) & (z < omuz) & np.where(on, z > kap_ust - 0.01, z > bant_alt)
    sonuc = np.zeros(len(p), np.uint8)
    sonuc[kap] = 1
    sonuc[bant | aski] = 2
    return sonuc


def _boxer(p, m):
    """Boxer: bel lastiğinden uyluğun üst üçte birine kadar, düz paçalı."""
    z = p[:, 2]
    zc, d = m["zc"], m["d"]
    ust, alt = zc + 0.32 * d, zc - 0.30 * d
    ic = (z >= alt) & (z <= ust) & (np.abs(p[:, 0]) <= m["yan"](z))
    sonuc = ic.astype(np.uint8)
    sonuc[ic & (z > ust - 0.03)] = 2
    sonuc[ic & (z < alt + 0.008)] = 2  # paça dikişi
    return sonuc


def sinif(p, m, tur):
    if tur == "boxer":
        return _boxer(p, m)
    kulot, sutyen = _kulot(p, m), _sutyen(p, m)
    return np.maximum(kulot, sutyen)


def doku_ciz(k, mesh, tur):
    """(BOYUT, BOYUT, 4) RGBA dokusu (0–1, satır 0 = UV v=0)."""
    mesh.calc_loop_triangles()
    u = np.array([t.vertices[:] for t in mesh.loop_triangles])
    m = isaretler(k, u)
    uv_katman = mesh.uv_layers.active.data
    n = BOYUT * ORNEKLEME
    renk_sec = np.array([TEN, KUMAS, LASTIK], np.float32) / 255
    birikim = np.zeros((n, n, 3), np.float32)
    dolu = np.zeros((n, n), bool)

    for t in mesh.loop_triangles:
        uv = np.array([uv_katman[l].uv[:] for l in t.loops]) * n - 0.5
        uc = k[list(t.vertices)]
        x0, y0 = np.floor(uv.min(0)).astype(int)
        x1, y1 = np.ceil(uv.max(0)).astype(int)
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, n - 1), min(y1, n - 1)
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        q = np.stack([gx.ravel(), gy.ravel()], 1).astype(np.float64)
        a, b, c = uv
        m2 = np.array([b - a, c - a]).T
        if abs(np.linalg.det(m2)) < 1e-12:
            continue
        lb = np.linalg.solve(m2, (q - a).T).T  # (v, w)
        w0 = 1 - lb[:, 0] - lb[:, 1]
        ic = (w0 >= -1e-3) & (lb[:, 0] >= -1e-3) & (lb[:, 1] >= -1e-3)
        if not ic.any():
            continue
        bary = np.stack([w0, lb[:, 0], lb[:, 1]], 1)[ic]
        p = bary @ uc
        px, py = q[ic, 0].astype(int), q[ic, 1].astype(int)
        birikim[py, px] = renk_sec[sinif(p, m, tur)]
        dolu[py, px] = True

    # UV adalarının dışını komşu renkle doldur (doku süzgecinde dikiş çizgisi çıkmasın)
    for _ in range(8 * ORNEKLEME):
        bos = ~dolu
        if not bos.any():
            break
        toplam = np.zeros_like(birikim)
        sayi = np.zeros((n, n), np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            kay_d = np.roll(dolu, (dy, dx), (0, 1))
            toplam += np.roll(birikim, (dy, dx), (0, 1)) * kay_d[..., None]
            sayi += kay_d
        yeni = bos & (sayi > 0)
        birikim[yeni] = toplam[yeni] / sayi[yeni, None]
        dolu |= yeni
    birikim[~dolu] = renk_sec[0]

    kucuk = birikim.reshape(BOYUT, ORNEKLEME, BOYUT, ORNEKLEME, 3).mean((1, 3))
    return np.concatenate([kucuk, np.ones((BOYUT, BOYUT, 1), np.float32)], 2)


def uygula(nesne, model):
    """Nesnenin taban köşelerine göre dokuyu çizer, cilt malzemesine bağlar."""
    mesh = nesne.data
    k = np.array([v.co[:] for v in mesh.vertices])
    piksel = doku_ciz(k, mesh, TURLER[model])

    resim = bpy.data.images.new("Cilt", BOYUT, BOYUT, alpha=False)
    resim.colorspace_settings.name = "sRGB"
    resim.pixels.foreach_set(piksel.ravel())
    resim.file_format = "PNG"
    resim.pack()

    malzeme = bpy.data.materials.new("Cilt")
    malzeme.use_nodes = True
    agac = malzeme.node_tree
    bsdf = agac.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.6
    dugum = agac.nodes.new("ShaderNodeTexImage")
    dugum.image = resim
    agac.links.new(dugum.outputs["Color"], bsdf.inputs["Base Color"])
    mesh.materials.clear()
    mesh.materials.append(malzeme)
    return resim
