import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { agirliklariUygula, meshBul } from '../avatar/agirlik'
import { DRACO_YOLU, TISORT_URL } from '../avatar/modeller'
import type { Agirliklar, Model } from '../olcu/kalibrasyon'
import type { UrunAgirliklari } from './sablonKalibrasyon'

type Props = {
  model: Model
  /** Avatarın ağırlıklarıyla AYNI değerler: kıyafet vücutla birlikte büyür */
  vucut: Agirliklar
  /** Beden tablosundan çözülen ürün key'leri */
  urun: UrunAgirliklari
  /** Ürün fotoğrafından gelen desen (UV: ön sol yarı, arka sağ yarı, kollar alt şerit) */
  doku?: THREE.Texture | null
  /** Desen yokken kumaşın rengi */
  renk?: string
}

// Metre. Yalnızca görüntü: ölçüler ve uygunluk kalibrasyondan gelir, bu kaydırmadan etkilenmez.
// Kumaşın altında kalan ten Avatar'da içeri çekildiği için (kiyafet/ortu.ts) kumaş vücuda yakın kalabilir.
const KUMAS_KALINLIGI_M = 0.01

// Tişört şablonu (assets/models/sablon_tisort_<model>.glb). Mesh adı sözleşmede: Garment.
export default function Kiyafet({ model, vucut, urun, doku, renk = '#e8e8e8' }: Props) {
  const { scene } = useGLTF(TISORT_URL[model], DRACO_YOLU)
  // Aynı GLB'yi başka ekranlarda da kullanabilmek için sahnenin kendi kopyası
  const kopya = useMemo(() => scene.clone(true), [scene])
  const mesh = useMemo(() => meshBul(kopya, 'Garment'), [kopya])

  // Malzemeyi bu kopyaya özel yap; doku değişince diğer kopyalar etkilenmesin
  const malzeme = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.85 })
    // Kumaş kalınlığı: köşeleri normal yönünde biraz dışarı it. Şablonun vücuda çok yakın
    // olduğu yerlerde (göğüs, omuz) tenin kumaştan dışarı taşmasını önler.
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uKalinlik = { value: KUMAS_KALINLIGI_M }
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'uniform float uKalinlik;\nvoid main() {')
        .replace('#include <skinning_vertex>', '#include <skinning_vertex>\ntransformed += normalize(objectNormal) * uKalinlik;')
    }
    return m
  }, [])

  useEffect(() => {
    if (!mesh) return
    mesh.material = malzeme
  }, [mesh, malzeme])

  useEffect(() => {
    malzeme.map = doku ?? null
    malzeme.color.set(doku ? '#ffffff' : renk)
    malzeme.needsUpdate = true
  }, [malzeme, doku, renk])

  useEffect(() => {
    if (mesh) agirliklariUygula(mesh, { ...vucut, ...urun })
  }, [mesh, vucut, urun])

  return <primitive object={kopya} />
}

useGLTF.preload(TISORT_URL.kadin, DRACO_YOLU)
