import * as THREE from 'three'
import type { Kalibrasyon, OlcuAdi } from '../olcu/kalibrasyon'
import type { Agirliklar } from '../olcu/cozucu'

// Tuğçe'nin avatarı gelene kadar kullanılan dönel (lathe) test mankeni.
// Gerçek avatarla aynı adlı shape key'leri (morph target) taşır:
// height, chest, waist, hip. Böylece kaydırıcı kodu ikisinde de aynı çalışır.

const PROFIL_BOYU = 1.5 // profil 1,5 m'lik bir beden için çizildi
const KALCA_Y = 0.78
const BEL_Y = 0.94
const GOGUS_Y = 1.1
const SIGMA = 0.065 // şişirmenin dikeyde ne kadar yayılacağı (m)

const cevredenYaricap = (cm: number) => cm / 100 / (2 * Math.PI)

export function testAvatariOlustur(kalib: Kalibrasyon): THREE.Mesh {
  const ilk = (ad: OlcuAdi) => kalib[ad][0].cm
  const son = (ad: OlcuAdi) => kalib[ad][kalib[ad].length - 1].cm

  // Ağırlık 0'daki beden: kalibrasyonun en küçük ölçüleri
  const rKalca = cevredenYaricap(ilk('hip'))
  const rBel = cevredenYaricap(ilk('waist'))
  const rGogus = cevredenYaricap(ilk('chest'))
  const boyOlcek = ilk('height') / 100 / PROFIL_BOYU

  // Yandan bakınca bedenin yarım çizgisi: [yarıçap, yükseklik]
  const profil: [number, number][] = [
    [0.0001, 0], [0.05, 0.01], [0.07, 0.08], [0.08, 0.45], [0.105, 0.65],
    [rKalca, KALCA_Y], [rBel, BEL_Y], [rGogus, GOGUS_Y], [0.14, 1.22],
    [0.05, 1.3], [0.045, 1.33], [0.07, 1.38], [0.08, 1.44], [0.06, 1.49], [0.0001, 1.5],
  ]
  const egri = new THREE.SplineCurve(profil.map(([r, y]) => new THREE.Vector2(r, y * boyOlcek)))
  const geo = new THREE.LatheGeometry(egri.getPoints(160), 48)
  geo.computeVertexNormals()

  const temel = geo.attributes.position.array as Float32Array

  // Bir shape key = tüm noktaların yeni konumu
  const hedef = (ad: OlcuAdi, donustur: (x: number, y: number, z: number) => [number, number, number]) => {
    const dizi = new Float32Array(temel.length)
    for (let i = 0; i < temel.length; i += 3) {
      const [x, y, z] = donustur(temel[i], temel[i + 1], temel[i + 2])
      dizi[i] = x
      dizi[i + 1] = y
      dizi[i + 2] = z
    }
    const nitelik = new THREE.Float32BufferAttribute(dizi, 3)
    nitelik.name = ad
    return nitelik
  }

  // Belirli bir yükseklikte çevreyi büyüten shape key (Gauss biçiminde yumuşak geçiş)
  const sisir = (ad: OlcuAdi, merkezY: number) => {
    const k = son(ad) / ilk(ad) - 1
    const my = merkezY * boyOlcek
    return hedef(ad, (x, y, z) => {
      const f = 1 + k * Math.exp(-((y - my) ** 2) / (2 * SIGMA * SIGMA))
      return [x * f, y, z * f]
    })
  }

  const boyKatsayisi = son('height') / ilk('height')
  const hedefler = [
    hedef('height', (x, y, z) => [x, y * boyKatsayisi, z]),
    sisir('chest', GOGUS_Y),
    sisir('waist', BEL_Y),
    sisir('hip', KALCA_Y),
  ]

  // Her hedef için ışıklandırmanın doğru olması adına normalleri de hesapla
  const normaller = hedefler.map((h) => {
    const g = geo.clone()
    g.setAttribute('position', h)
    g.computeVertexNormals()
    return g.attributes.normal as THREE.BufferAttribute
  })

  geo.morphAttributes.position = hedefler
  geo.morphAttributes.normal = normaller

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: '#d6b8a0', roughness: 0.7 })
  )
  mesh.name = 'Avatar'
  mesh.updateMorphTargets() // shape key adlarından morphTargetDictionary oluşur
  return mesh
}

// Ağırlıkları shape key ADINA göre uygular.
// Test avatarında da Tuğçe'nin GLB'sinde de aynı fonksiyon çalışır.
export function agirliklariUygula(mesh: THREE.Mesh, agirliklar: Agirliklar) {
  const sozluk = mesh.morphTargetDictionary
  const etkiler = mesh.morphTargetInfluences
  if (!sozluk || !etkiler) return
  for (const [ad, deger] of Object.entries(agirliklar)) {
    const i = sozluk[ad]
    if (i !== undefined) etkiler[i] = deger
  }
}