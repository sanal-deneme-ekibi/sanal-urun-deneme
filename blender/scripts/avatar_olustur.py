"""Kadın avatarını MPFB ile üretir: assets/models/avatar_kadin.glb ve .calib.json

Çalıştırma (repo kökünden; Blender açık olmasa da olur):
    blender --background --python blender/scripts/avatar_olustur.py

Yöntem:
  1. MPFB ile beş vücut üretilir: taban (bütün key'ler 0) ve her key için o ölçünün
     en büyük hali (o key 1, diğerleri 0).
  2. Taban vücut ≤ 20.000 üçgene sadeleştirilir. Sade mesh'in her köşesi tam çözünürlüklü
     yüzeydeki bir üçgene bağlanır (MakeHuman proxy'leri gibi).
  3. Aynı bağ diğer dört vücuda uygulanır; böylece hepsi aynı topolojide shape key olur.
  4. Sade mesh ölçülür, kalibrasyon dosyası yazılır, GLB dışa aktarılır.

Kurallar docs/glb-sozlesmesi.md içinde. Ayarlar aşağıdaki TABAN ve KEYLER sözlüklerinde.
"""

import json
import random
import sys
from datetime import date
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

BETIK_KLASORU = Path(__file__).resolve().parent
REPO = BETIK_KLASORU.parents[1]
sys.path.insert(0, str(BETIK_KLASORU))

import olcum  # noqa: E402
from bl_ext.blender_org.mpfb.services import HumanService, TargetService  # noqa: E402

MODEL = "avatar_kadin"
GLB_YOLU = REPO / "assets" / "models" / f"{MODEL}.glb"
KALIB_YOLU = REPO / "assets" / "models" / f"{MODEL}.calib.json"
UCGEN_BUTCESI = 19_000  # sözleşme sınırı 20.000; sadeleştirme tam tutmadığı için pay bırakıldı

# Taban vücut: MPFB makroları (0–1) ve ölçü hedefleri (eksi = küçült, artı = büyüt)
TABAN = {
    "makro": {
        "gender": 0.0,  # 0 kadın
        "age": 0.5,  # 25 yaş
        "muscle": 0.5,
        "weight": 0.0,
        "proportions": 0.5,
        "height": 0.3,  # MPFB'de 0 cüce, 1 dev; 0.3 ≈ 145 cm
        "cupsize": 0.3,
        "firmness": 0.5,
    },
    "hedefler": {
        "measure-bust-circ": -0.5,
        "measure-waist-circ": -0.8,
        "measure-hips-circ": -0.6,
        # Manken görünümü: meme uçları düzleştirilir
        "nipple-point": -1.0,
        "nipple-size": -1.0,
    },
}

# Her key'in 1 değeri: tabanın üzerine yazılan ayarlar. "olcek" verilirse key, tabandan
# o ayara olan farkın o kadar katıdır (MPFB makrosunun sınırının ötesine geçmek için).
# "fark_yumusat" verilirse bu fark o kadar tekrar yumuşatılır: büyütülen kilo hedefindeki
# topaklar (selülit benzeri) gider, hacim artışı kalır.
# Genel dolgunluk weight'te; diğer key'ler yalnızca kendi bölgesini değiştirir.
KEYLER = {
    "height": {"makro": {"height": 0.72}},  # ≈ 190 cm
    "chest": {"makro": {"cupsize": 0.75}, "hedefler": {"measure-bust-circ": 1.0}},
    "waist": {"hedefler": {"measure-waist-circ": 1.5}},
    "hip": {"hedefler": {"measure-hips-circ": 1.0}},
    "weight": {"makro": {"weight": 1.0}, "olcek": 3.0, "fark_yumusat": 40},
}

# Kalibrasyon sözleşmesindeki adlar: key → kendi ölçüsü
KEY_OLCU = {"height": "boy", "chest": "gogus", "waist": "bel", "hip": "kalca", "weight": "kilo"}
ORNEK_SAYISI = 10

# Manken görünümü: bu bölgelerdeki anatomik ayrıntılar Laplace yumuşatmasıyla silinir.
# merkez taban vücutta bulunur; aynı köşeler bütün vücutlarda aynı şekilde yumuşatılır.
YUMUSATMA = {
    "kasik": {"yaricap_m": 0.07, "tekrar": 40},
    "yuz": {"yaricap_m": 0.08, "tekrar": 6},
}


def sahneyi_temizle():
    for nesne in list(bpy.data.objects):
        bpy.data.objects.remove(nesne, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)


def ayar_birlestir(ek):
    return {
        "makro": {**TABAN["makro"], **ek.get("makro", {})},
        "hedefler": {**TABAN["hedefler"], **ek.get("hedefler", {})},
    }


def vucut_olustur(ayar):
    """Ayardaki vücudu üretir; yardımcı geometrisi atılmış, ayakları yerde bir mesh döner."""
    makro = TargetService.get_default_macro_info_dict()
    makro.update(ayar["makro"])
    insan = HumanService.create_human(feet_on_ground=False, macro_detail_dict=makro)

    for hedef, deger in ayar["hedefler"].items():
        if deger == 0:
            continue
        ad = f"{hedef}-{'incr' if deger > 0 else 'decr'}"
        anahtar = TargetService.load_target(insan, TargetService.target_full_path(ad), name=ad)
        anahtar.slider_max = 10.0
        anahtar.value = abs(deger)

    # Shape key karışımı ve "Hide helpers" maskesi uygulanmış hali
    mesh = bpy.data.meshes.new_from_object(insan.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(insan, do_unlink=True)

    en_alt = min(v.co.z for v in mesh.vertices)
    for v in mesh.vertices:
        v.co.z -= en_alt
    return mesh


def koseler(mesh):
    dizi = np.empty(len(mesh.vertices) * 3)
    mesh.vertices.foreach_get("co", dizi)
    return dizi.reshape(-1, 3)


def kenarlar(mesh):
    dizi = np.empty(len(mesh.edges) * 2, dtype=np.int64)
    mesh.edges.foreach_get("vertices", dizi)
    return dizi.reshape(-1, 2)


def yumusatma_bolgeleri(k):
    """Taban vücutta her bölge için (köşe ağırlıkları, tekrar) döner. Ağırlık merkezde 1, kenarda 0."""
    boy = k[:, 2].max()
    orta = np.abs(k[:, 0]) < 0.004
    # Kasık: orta çizgide, gövdenin en alt noktası
    govde = orta & (k[:, 2] > 0.40 * boy) & (k[:, 2] < 0.56 * boy)
    kasik = k[np.flatnonzero(govde)[np.argmin(k[govde, 2])]]
    # Yüz: başın orta çizgisinde en öndeki nokta (burun ucu); vücut -Y yönüne bakar
    bas = orta & (k[:, 2] > 0.88 * boy)
    yuz = k[np.flatnonzero(bas)[np.argmin(k[bas, 1])]]

    bolgeler = []
    for merkez, ayar in ((kasik, YUMUSATMA["kasik"]), (yuz, YUMUSATMA["yuz"])):
        t = np.clip(1 - np.linalg.norm(k - merkez, axis=1) / ayar["yaricap_m"], 0, 1)
        bolgeler.append((t * t * (3 - 2 * t), ayar["tekrar"]))
    return bolgeler


def yumusat(k, kenar, bolgeler):
    """Her köşeyi komşularının ortalamasına, bölge ağırlığı kadar yaklaştırır."""
    k = k.copy()
    derece = np.bincount(kenar.ravel(), minlength=len(k))[:, None]
    for agirlik, tekrar in bolgeler:
        for _ in range(tekrar):
            toplam = np.zeros_like(k)
            np.add.at(toplam, kenar[:, 0], k[kenar[:, 1]])
            np.add.at(toplam, kenar[:, 1], k[kenar[:, 0]])
            k += 0.5 * agirlik[:, None] * (toplam / np.maximum(derece, 1) - k)
    return k


def ucgenler(mesh):
    mesh.calc_loop_triangles()
    dizi = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int64)
    mesh.loop_triangles.foreach_get("vertices", dizi)
    return dizi.reshape(-1, 3)


def sadelestir(tam):
    """Taban mesh'in ≤ UCGEN_BUTCESI üçgenlik kopyası (UV'ler korunur)."""
    tam_ucgen = len(ucgenler(tam))
    nesne = bpy.data.objects.new(MODEL, tam.copy())
    bpy.context.collection.objects.link(nesne)
    if tam_ucgen > UCGEN_BUTCESI:
        mod = nesne.modifiers.new("Sadelestir", "DECIMATE")
        mod.ratio = UCGEN_BUTCESI / tam_ucgen
        mod.use_symmetry = True
        mod.symmetry_axis = "X"
        bpy.context.view_layer.objects.active = nesne
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return nesne


def bagla(sade_koseler, tam_koseler, tam_ucgenler):
    """Her sade köşe için en yakın tam çözünürlüklü üçgeni bulur."""
    agac = BVHTree.FromPolygons([Vector(k) for k in tam_koseler], tam_ucgenler.tolist())
    return [agac.find_nearest(Vector(k))[2] for k in sade_koseler]


def bagi_uygula(bag, sade_koseler, tam_taban, tam_hedef, tam_ucgenler):
    """Sade köşeleri, taban yüzeyindeki yerlerini koruyarak hedef vücuda taşır."""
    sonuc = np.empty_like(sade_koseler)
    for i, (k, u) in enumerate(zip(sade_koseler, bag)):
        a, b, c = (Vector(tam_taban[j]) for j in tam_ucgenler[u])
        x, y, z = (Vector(tam_hedef[j]) for j in tam_ucgenler[u])
        sonuc[i] = barycentric_transform(Vector(k), a, b, c, x, y, z)
    return sonuc


def malzeme_ekle(nesne):
    malzeme = bpy.data.materials.new("Cilt")
    malzeme.use_nodes = True
    bsdf = malzeme.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.80, 0.62, 0.52, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.6
    nesne.data.materials.clear()
    nesne.data.materials.append(malzeme)


def kalibrasyon(taban_k, deltalar, sade_ucgen):
    """Sözleşmedeki biçimde: taban + etki + karışık ağırlıklı örnekler."""
    def olc(agirliklar):
        k = taban_k + sum(agirliklar[key] * deltalar[key] for key in KEYLER)
        return olcum.olc(k, sade_ucgen)

    sifir = {key: 0.0 for key in KEYLER}
    taban = olc(sifir)
    etki = {}
    for key in KEYLER:
        tam = olc({**sifir, key: 1.0})
        etki[key] = {o: round(tam[o] - taban[o], 1) for o in taban}

    rastgele = random.Random(42)
    ornekler, hatalar = [], {o: [] for o in taban}
    for _ in range(ORNEK_SAYISI):
        agirliklar = {key: round(rastgele.random(), 2) for key in KEYLER}
        olculen = olc(agirliklar)
        for o in taban:
            tahmin = taban[o] + sum(etki[key][o] * agirliklar[key] for key in KEYLER)
            hatalar[o].append(abs(tahmin - olculen[o]))
        ornekler.append({"agirliklar": agirliklar, "olculen": olculen})

    return {
        "surum": 1,
        "model": MODEL,
        "betik": "blender/scripts/avatar_olustur.py",
        "tarih": date.today().isoformat(),
        "birim": "cm",
        "birim_kilo": "kg",
        "keyler": list(KEYLER),
        "olcumler": list(KEY_OLCU.values()),
        "taban": taban,
        "etki": etki,
        "ornekler": ornekler,
    }, {o: round(float(np.mean(h)), 2) for o, h in hatalar.items()}


def disa_aktar(nesne):
    for diger in list(bpy.data.objects):
        if diger is not nesne:
            bpy.data.objects.remove(diger, do_unlink=True)
    nesne.name = "Avatar"
    nesne.data.name = "Avatar"
    nesne.data.shape_keys.use_relative = True
    for p in nesne.data.polygons:
        p.use_smooth = True

    bpy.ops.object.select_all(action="DESELECT")
    nesne.select_set(True)
    bpy.context.view_layer.objects.active = nesne
    GLB_YOLU.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_YOLU),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_morph=True,
        export_morph_normal=True,
        export_skins=False,
        export_animations=False,
        export_draco_mesh_compression_enable=True,
    )


def main():
    sahneyi_temizle()

    print("[1/5] Taban vücut üretiliyor")
    tam_taban_mesh = vucut_olustur(TABAN)
    tam_kenar = kenarlar(tam_taban_mesh)
    bolgeler = yumusatma_bolgeleri(koseler(tam_taban_mesh))
    tam_taban = yumusat(koseler(tam_taban_mesh), tam_kenar, bolgeler)
    tam_taban_mesh.vertices.foreach_set("co", tam_taban.ravel())
    tam_ucgen = ucgenler(tam_taban_mesh)
    print(f"      tam çözünürlük: {len(tam_taban)} köşe, {len(tam_ucgen)} üçgen")

    print("[2/5] Sadeleştiriliyor ve bağlanıyor")
    nesne = sadelestir(tam_taban_mesh)
    sade_taban = koseler(nesne.data)
    sade_ucgen = ucgenler(nesne.data)
    bag = bagla(sade_taban, tam_taban, tam_ucgen)
    print(f"      sade: {len(sade_taban)} köşe, {len(sade_ucgen)} üçgen")

    print("[3/5] Shape key'ler üretiliyor")
    nesne.shape_key_add(name="Basis", from_mix=False)
    deltalar = {}
    for key, ek in KEYLER.items():
        hedef_mesh = vucut_olustur(ayar_birlestir(ek))
        tam_hedef = yumusat(koseler(hedef_mesh), tam_kenar, bolgeler)
        bpy.data.meshes.remove(hedef_mesh)
        fark = tam_hedef - tam_taban
        if ek.get("fark_yumusat"):
            fark = yumusat(fark, tam_kenar, [(np.ones(len(fark)), ek["fark_yumusat"])])
        tam_hedef = tam_taban + ek.get("olcek", 1.0) * fark
        hedef = bagi_uygula(bag, sade_taban, tam_taban, tam_hedef, tam_ucgen)
        deltalar[key] = hedef - sade_taban
        anahtar = nesne.shape_key_add(name=key, from_mix=False)
        anahtar.data.foreach_set("co", hedef.ravel())
        anahtar.value = 0.0
        print(f"      {key}: en büyük kayma {np.linalg.norm(deltalar[key], axis=1).max() * 100:.1f} cm")

    print("[4/5] Ölçülüyor")
    kalib, hata = kalibrasyon(sade_taban, deltalar, sade_ucgen)
    KALIB_YOLU.write_text(json.dumps(kalib, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"      taban: {kalib['taban']}")
    for key, o in KEY_OLCU.items():
        birim = "kg" if o == "kilo" else "cm"
        print(f"      {key:6s} 0 → 1: {kalib['taban'][o]} → {kalib['taban'][o] + kalib['etki'][key][o]:.1f} {birim}  ({kalib['etki'][key]})")
    print(f"      doğrusal model ortalama hatası (ölçü başına): {hata}")

    print("[5/5] GLB dışa aktarılıyor")
    malzeme_ekle(nesne)
    disa_aktar(nesne)
    print(f"      {GLB_YOLU.relative_to(REPO)} ({GLB_YOLU.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
