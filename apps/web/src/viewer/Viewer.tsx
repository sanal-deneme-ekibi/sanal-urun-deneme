import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Loader } from '@react-three/drei'
import * as THREE from 'three'

// Model verilmezse gösterilen basit manken (ölçüler metre, +Y yukarı)
function YerTutucuManken() {
  const ten = '#d6b8a0'
  return (
    <group>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.11, 32, 32]} />
        <meshStandardMaterial color={ten} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <capsuleGeometry args={[0.17, 0.45, 8, 16]} />
        <meshStandardMaterial color={ten} />
      </mesh>
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]}>
          <capsuleGeometry args={[0.07, 0.75, 8, 16]} />
          <meshStandardMaterial color={ten} />
        </mesh>
      ))}
    </group>
  )
}

// OrbitControls'ün burada kullanılan kısmı
type Kontrol = { target: THREE.Vector3; minDistance: number; maxDistance: number; update: () => void }

// A duruşunda kollar açıkken avatarın kapladığı genişlik (m); boyla birlikte büyür
const KOL_ACIKLIGI_ORANI = 0.85
const KENAR_PAYI = 1.08

/**
 * Kamerayı, avatarın tamamı (baştan ayağa, iki kol) ekrana sığacak uzaklığa koyar.
 * Pencere boyu ya da avatarın boyu değişince yeniden hesaplanır; kullanıcı döndürdüyse
 * baktığı yön korunur, yalnızca uzaklık ayarlanır. Dar (telefon) ekranda genişlik belirleyicidir.
 */
function KameraSigdir({ boy }: { boy: number }) {
  const { camera, size, controls } = useThree()
  useEffect(() => {
    const kamera = camera as THREE.PerspectiveCamera
    const yariDikey = THREE.MathUtils.degToRad(kamera.fov / 2)
    const oran = size.width / Math.max(1, size.height)
    const yukseklik = boy * KENAR_PAYI
    const genislik = boy * KOL_ACIKLIGI_ORANI * KENAR_PAYI
    const uzaklik = Math.max(yukseklik / 2 / Math.tan(yariDikey), genislik / 2 / (Math.tan(yariDikey) * oran)) + 0.15
    const hedef = new THREE.Vector3(0, boy / 2, 0)

    const yon = kamera.position.clone().sub((controls as unknown as Kontrol | null)?.target ?? hedef)
    if (yon.lengthSq() < 1e-6) yon.set(0, 0, 1)
    yon.normalize()
    kamera.position.copy(hedef).addScaledVector(yon, uzaklik)
    kamera.updateProjectionMatrix()

    const k = controls as unknown as Kontrol | null
    if (k) {
      k.target.copy(hedef)
      k.minDistance = uzaklik * 0.45
      k.maxDistance = uzaklik * 1.6
      k.update()
    }
  }, [camera, size.width, size.height, controls, boy])
  return null
}

type Props = {
  children?: ReactNode
  /** Sahnedeki avatarın boyu (m). Kamera baştan ayağa sığacak şekilde ayarlanır. */
  boy?: number
  /** Sahnenin sol üstündeki küçük başlık */
  etiket?: string
}

export default function Viewer({ children, boy = 1.75, etiket }: Props) {
  // Yükleme göstergesi Canvas'ın dışında (DOM'da): Suspense fallback'inde <Html> kullanmak
  // model değişirken React'te removeChild hatasına yol açıyordu.
  return (
    <>
      <Canvas camera={{ position: [0, 1, 4], fov: 32 }} dpr={[1, 2]}>
        <hemisphereLight args={['#ffffff', '#c9c2b4', 0.7]} />
        <directionalLight position={[2, 4, 3]} intensity={1.3} />
        <directionalLight position={[-3, 2, -2]} intensity={0.45} />
        {children ?? <YerTutucuManken />}
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={3} blur={2.4} far={2} />
        {/* 360° döndürme: sadece yatayda dön; makeDefault: KameraSigdir hedefi ve uzaklığı buradan ayarlar */}
        <OrbitControls makeDefault enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.8} />
        <KameraSigdir boy={boy} />
      </Canvas>
      {etiket && <span className="sahne-etiket">{etiket}</span>}
      <span className="sahne-ipucu" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 4v5h-5" />
        </svg>
        Sürükleyerek döndür
      </span>
      <Loader dataInterpolation={(p) => `Yükleniyor… %${p.toFixed(0)}`} />
    </>
  )
}
