import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { agirliklariUygula, meshBul } from './agirlik'
import { AVATAR_URL, DRACO_YOLU, TISORT_URL } from './modeller'
import { acikKenarlar, omuzKutusu, omuzuIsaretle, ortuluKoseler } from '../kiyafet/ortu'
import type { Agirliklar, Model } from '../olcu/kalibrasyon'

// Kıyafetin altında kalan tenin içeri çekilme miktarı (metre). Yalnızca görüntü.
const ICERI_CEKME_M = 0.025

type Props = {
  model: Model
  agirliklar: Agirliklar
  /** Üstüne tişört giydirilecekse true: tişörtün örttüğü ten biraz içeri çekilir, kumaştan taşmaz */
  kiyafetAltinda?: boolean
  /** Kol ile gövde arasındaki aralıktan görünen ten bu renge boyanır (kumaşın zemin rengi) */
  kumasRengi?: string
}

type Ek = { ortu: { value: number }; renk: { value: THREE.Color } }

// Cilt malzemesine bir kez eklenen ek: aOrtu = 1 köşe içeri çekilir, 2 içeri çekilir ve kumaş rengine
// boyanır. uOrtu 0 iken etkisizdir; Ölçülerim ekranı aynı (önbellekteki) avatarı kullandığı için
// orada 0'a çekilir.
function ortuEki(mesh: THREE.Mesh): Ek {
  const m = mesh.material as THREE.Material
  if (!m.userData.ek) {
    const ek: Ek = { ortu: { value: 0 }, renk: { value: new THREE.Color('#e8e8e8') } }
    m.userData.ek = ek
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uOrtu = ek.ortu
      shader.uniforms.uKumas = ek.renk
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'attribute float aOrtu;\nuniform float uOrtu;\nvarying float vOrtu;\nvoid main() {\nvOrtu = aOrtu;')
        .replace('#include <skinning_vertex>', '#include <skinning_vertex>\ntransformed -= normalize(objectNormal) * min(aOrtu, 1.0) * uOrtu;')
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform float uOrtu;\nuniform vec3 uKumas;\nvarying float vOrtu;\nvoid main() {')
        .replace('#include <color_fragment>', '#include <color_fragment>\nif (uOrtu > 0.0 && vOrtu > 1.5) diffuseColor.rgb = uKumas;')
    }
    // Malzeme ilk çizimde derlenmiş olabilir; farklı anahtar vermezsek three eski programı yeniden kullanır
    m.customProgramCacheKey = () => 'avatar-ortu'
    m.needsUpdate = true
  }
  return m.userData.ek as Ek
}

// Tişört şablonunu yükleyip avatarın hangi köşelerini örttüğünü bir kez hesaplar (köşe özniteliği aOrtu)
function OrtuMaskesi({ model, mesh }: { model: Model; mesh: THREE.Mesh }) {
  const { scene } = useGLTF(TISORT_URL[model], DRACO_YOLU)
  useEffect(() => {
    const g = mesh.geometry
    const kiyafet = meshBul(scene, 'Garment')
    if (g.getAttribute('aOrtu') || !kiyafet || !g.attributes.normal) return
    const k = kiyafet.geometry
    const ap = g.attributes.position.array
    const kp = k.attributes.position.array
    const ortu = ortuluKoseler(ap, g.attributes.normal.array, kp, k.index?.array ?? null)
    const kutu = k.index ? omuzKutusu(acikKenarlar(kp, k.index.array)) : null
    if (kutu) omuzuIsaretle(ortu, ap, kutu)
    g.setAttribute('aOrtu', new THREE.BufferAttribute(ortu, 1))
  }, [mesh, scene])
  return null
}

// Tuğçe'nin avatarları (assets/models/avatar_<model>.glb)
export default function Avatar({ model, agirliklar, kiyafetAltinda = false, kumasRengi = '#e8e8e8' }: Props) {
  const { scene } = useGLTF(AVATAR_URL[model], DRACO_YOLU)
  const mesh = useMemo(() => meshBul(scene, 'Avatar'), [scene])

  useEffect(() => {
    if (mesh) agirliklariUygula(mesh, agirliklar)
  }, [mesh, agirliklar])

  useEffect(() => {
    if (!mesh) return
    const ek = ortuEki(mesh)
    ek.ortu.value = kiyafetAltinda ? ICERI_CEKME_M : 0
    return () => {
      ek.ortu.value = 0
    }
  }, [mesh, kiyafetAltinda])

  useEffect(() => {
    if (mesh) ortuEki(mesh).renk.value.set(kumasRengi)
  }, [mesh, kumasRengi])

  return (
    <>
      <primitive object={scene} />
      {kiyafetAltinda && mesh && <OrtuMaskesi model={model} mesh={mesh} />}
    </>
  )
}

useGLTF.preload(AVATAR_URL.kadin, DRACO_YOLU)
