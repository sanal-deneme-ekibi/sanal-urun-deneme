import * as THREE from 'three'
import type { Agirliklar } from '../olcu/kalibrasyon'

// Ağırlıkları shape key ADINA göre uygular (GLB sözleşmesi: height, chest, waist, hip).
// Avatarda da kıyafet şablonlarında da aynı fonksiyon kullanılacak.
export function agirliklariUygula(mesh: THREE.Mesh, agirliklar: Partial<Agirliklar>) {
  const sozluk = mesh.morphTargetDictionary
  const etkiler = mesh.morphTargetInfluences
  if (!sozluk || !etkiler) return
  for (const [ad, deger] of Object.entries(agirliklar)) {
    const i = sozluk[ad]
    if (i !== undefined && deger !== undefined) etkiler[i] = deger
  }
}

// GLB içinde adı verilen mesh'i bulur; bulamazsa shape key'i olan ilk mesh'i döner
export function meshBul(sahne: THREE.Object3D, ad: string): THREE.Mesh | undefined {
  let bulunan: THREE.Mesh | undefined
  let yedek: THREE.Mesh | undefined
  sahne.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    if (m.name === ad && !bulunan) bulunan = m
    if (m.morphTargetDictionary && !yedek) yedek = m
  })
  return bulunan ?? yedek
}