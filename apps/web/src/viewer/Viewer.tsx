import { useEffect, useState } from 'react'
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
function KameraSigdir({ boy, yon }: { boy: number; yon: number | null }) {
  const { camera, size, controls } = useThree()
  useEffect(() => {
    const kamera = camera as THREE.PerspectiveCamera
    const yariDikey = THREE.MathUtils.degToRad(kamera.fov / 2)
    const oran = size.width / Math.max(1, size.height)
    const yukseklik = boy * KENAR_PAYI
    const genislik = boy * KOL_ACIKLIGI_ORANI * KENAR_PAYI
    const uzaklik = Math.max(yukseklik / 2 / Math.tan(yariDikey), genislik / 2 / (Math.tan(yariDikey) * oran)) + 0.15
    const hedef = new THREE.Vector3(0, boy / 2, 0)

    // Ön / yan / arka düğmesine basıldıysa o yönden, yoksa kullanıcının döndürdüğü yönden bak
    const bakis = kamera.position.clone().sub((controls as unknown as Kontrol | null)?.target ?? hedef)
    if (yon !== null) bakis.set(Math.sin(yon), 0.12, Math.cos(yon))
    if (bakis.lengthSq() < 1e-6) bakis.set(0, 0, 1)
    bakis.normalize()
    kamera.position.copy(hedef).addScaledVector(bakis, uzaklik)
    kamera.updateProjectionMatrix()

    const k = controls as unknown as Kontrol | null
    if (k) {
      k.target.copy(hedef)
      k.minDistance = uzaklik * 0.45
      k.maxDistance = uzaklik * 1.6
      k.update()
    }
  }, [camera, size.width, size.height, controls, boy, yon])
  return null
}

type Props = {
  children?: ReactNode
  /** Sahnedeki avatarın boyu (m). Kamera baştan ayağa sığacak şekilde ayarlanır. */
  boy?: number
  /** Sahnenin sol üstündeki küçük başlık */
  etiket?: string
  /** Sağ üstte Ön / Yan / Arka düğmeleri */
  gorunumler?: boolean
  /** Avatar kendi kendine yavaşça dönsün (tanıtım ekranı) */
  kendiDonsun?: boolean
}

const GORUNUMLER: { ad: string; aci: number }[] = [
  { ad: 'Ön', aci: 0 },
  { ad: 'Yan', aci: Math.PI / 2 },
  { ad: 'Arka', aci: Math.PI },
]

export default function Viewer({ children, boy = 1.75, etiket, gorunumler = false, kendiDonsun = false }: Props) {
  const [yon, setYon] = useState<number | null>(null)
  // Yükleme göstergesi Canvas'ın dışında (DOM'da): Suspense fallback'inde <Html> kullanmak
  // model değişirken React'te removeChild hatasına yol açıyordu.
  return (
    <>
      <Canvas camera={{ position: [0, 1, 4], fov: 32 }} dpr={[1, 2]}>
        <hemisphereLight args={['#ffffff', '#8a90b8', 0.75]} />
        <directionalLight position={[2, 4, 3]} intensity={1.3} />
        {/* Arkadan soğuk kenar ışığı: koyu zeminde silüeti ayırır */}
        <directionalLight position={[-3, 2.5, -3]} intensity={0.9} color="#b8c4ff" />
        {children ?? <YerTutucuManken />}
        <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={3} blur={2.4} far={2} />
        {/* 360° döndürme: sadece yatayda dön; makeDefault: KameraSigdir hedefi ve uzaklığı buradan ayarlar */}
        <OrbitControls
          makeDefault
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate={kendiDonsun}
          autoRotateSpeed={0.8}
          onStart={() => setYon(null)}
        />
        <KameraSigdir boy={boy} yon={yon} />
      </Canvas>
      {etiket && <span className="sahne-etiket">{etiket}</span>}
      {gorunumler && (
        <div className="sahne-araclar" role="group" aria-label="Bakış yönü">
          {GORUNUMLER.map((g) => (
            <button key={g.ad} type="button" aria-pressed={yon === g.aci} onClick={() => setYon(g.aci)}>
              {g.ad}
            </button>
          ))}
        </div>
      )}
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
