import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { HandLandmarker } from '@mediapipe/tasks-vision'
import { EL_MODELI, visionDosyalari } from './mediapipe'
import { kameraAc, kameraHatasi } from './kamera'
import type { KameraYonu } from './kamera'
import { ekranaCevir, parmakGenisligiMm, yuzukDurusu } from './el'
import type { ElNoktasi } from './el'

export type Maden = 'altin' | 'gumus' | 'rose'
export const MADENLER: { ad: Maden; etiket: string; renk: string }[] = [
  { ad: 'altin', etiket: 'Altın', renk: '#e8b84a' },
  { ad: 'gumus', etiket: 'Gümüş', renk: '#d9dde4' },
  { ad: 'rose', etiket: 'Rose', renk: '#e7a58c' },
]

export type ElDurumu = 'yukleniyor' | 'kamera' | 'araniyor' | 'bulundu' | 'hata'

/** Algılama döngüsü ile 3B sahne arasındaki ortak veri. State yerine ref: her karede React yeniden çizmesin. */
type SonEl = { noktalar: ElNoktasi[] | null }

// ---------- 3B yüzük ----------

const X = new THREE.Vector3()
const Y = new THREE.Vector3()
const Z = new THREE.Vector3()
const M = new THREE.Matrix4()
const hedefYon = new THREE.Quaternion()
const hedefYer = new THREE.Vector3()

function Yuzuk({ el, video, ayna, maden, tasli }: {
  el: React.RefObject<SonEl>
  video: React.RefObject<HTMLVideoElement | null>
  ayna: boolean
  maden: Maden
  tasli: boolean
}) {
  const grup = useRef<THREE.Group>(null)
  const boyut = useRef(0)
  const { size } = useThree()
  const renk = MADENLER.find((m) => m.ad === maden)!.renk

  // Parmak: görünmez ama derinliğe yazan silindir. Yüzüğün parmağın arkasında kalan yarısını gizler.
  const parmakMalzeme = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false }), [])

  useFrame(() => {
    const g = grup.current
    const v = video.current
    const n = el.current?.noktalar
    if (!g) return
    if (!n || !v || !v.videoWidth) {
      g.visible = false
      return
    }
    const p = n.map((k) => ekranaCevir(k, { w: v.videoWidth, h: v.videoHeight }, { w: size.width, h: size.height }, ayna))
    const d = yuzukDurusu(p)

    // Eksenler: yüzüğün deliği (yerel Z) parmak boyunca, taş (yerel Y) elin üstüne
    Z.set(...d.eksen)
    Y.set(...d.ust)
    X.crossVectors(Y, Z).normalize()
    M.makeBasis(X, Y, Z)
    hedefYon.setFromRotationMatrix(M)
    hedefYer.set(...d.merkez)

    // İlk görüldüğünde doğrudan yerine koy, sonra yumuşat (titremeyi azaltır)
    const yumusatma = g.visible ? 0.45 : 1
    g.position.lerp(hedefYer, yumusatma)
    g.quaternion.slerp(hedefYon, yumusatma)
    boyut.current += (d.genislikPx - boyut.current) * (g.visible ? 0.3 : 1)
    g.scale.setScalar(boyut.current)
    g.visible = true
  })

  // Ölçüler parmak genişliği = 1 birim alınarak verildi; grup ölçeği gerçek boyuta getirir
  const ic = 0.53
  const kalinlik = 0.09
  return (
    <group ref={grup} visible={false}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={parmakMalzeme} renderOrder={-1}>
        <cylinderGeometry args={[0.5, 0.5, 4, 24, 1, true]} />
      </mesh>
      <mesh>
        <torusGeometry args={[ic + kalinlik, kalinlik, 24, 72]} />
        <meshStandardMaterial color={renk} metalness={1} roughness={0.22} />
      </mesh>
      {tasli && (
        <group position={[0, ic + kalinlik * 2, 0]}>
          <mesh position={[0, 0.06, 0]} scale={[0.17, 0.2, 0.17]}>
            <octahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial color="#ffffff" roughness={0} metalness={0} transmission={0.6} thickness={0.5} ior={2.4} />
          </mesh>
          <mesh rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.09, 0.08, 6]} />
            <meshStandardMaterial color={renk} metalness={1} roughness={0.25} />
          </mesh>
        </group>
      )}
    </group>
  )
}

// ---------- Sayfa parçası ----------

export default function YuzukDeneme({ yon, maden, tasli, durumDegisti, olcuDegisti }: {
  yon: KameraYonu
  maden: Maden
  tasli: boolean
  durumDegisti: (d: ElDurumu, mesaj?: string) => void
  olcuDegisti: (mm: number | null) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const el = useRef<SonEl>({ noktalar: null })
  const ayna = yon === 'on'

  // Üst bileşen her çizimde yeni fonksiyon verebilir; döngüyü yeniden başlatmamak için ref'te tutuyoruz
  const geriBildirim = useRef({ durumDegisti, olcuDegisti })
  geriBildirim.current = { durumDegisti, olcuDegisti }

  const [hazir, setHazir] = useState(false)

  useEffect(() => {
    let landmarker: HandLandmarker | undefined
    let akis: MediaStream | undefined
    let kare = 0
    let iptal = false
    let sonDurum: ElDurumu | null = null
    let mm = 0
    let sonOlcuZamani = 0

    const bildir = (d: ElDurumu, mesaj?: string) => {
      if (d === sonDurum && !mesaj) return
      sonDurum = d
      geriBildirim.current.durumDegisti(d, mesaj)
    }

    const kapat = () => {
      cancelAnimationFrame(kare)
      akis?.getTracks().forEach((t) => t.stop())
      landmarker?.close()
      akis = undefined
      landmarker = undefined
    }

    async function baslat() {
      bildir('yukleniyor')
      const dosyalar = await visionDosyalari()
      if (iptal) return
      landmarker = await HandLandmarker.createFromOptions(dosyalar, {
        baseOptions: { modelAssetPath: EL_MODELI, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      })
      if (iptal) return kapat()

      bildir('kamera')
      const video = videoRef.current
      if (!video) return kapat()
      akis = await kameraAc(video, yon)
      if (iptal) return kapat()
      setHazir(true)
      bildir('araniyor')

      let sonZaman = -1
      const dongu = () => {
        if (iptal || !landmarker) return
        // Aynı video karesini iki kez işleme
        if (video.currentTime !== sonZaman) {
          sonZaman = video.currentTime
          const sonuc = landmarker.detectForVideo(video, performance.now())
          const n = sonuc.landmarks?.[0]
          el.current.noktalar = n ?? null
          if (n) {
            bildir('bulundu')
            const dunya = sonuc.worldLandmarks?.[0]
            if (dunya) {
              const yeni = parmakGenisligiMm(dunya)
              mm = mm ? mm + (yeni - mm) * 0.1 : yeni
            }
            // Ölçüyü saniyede iki kez göster, her karede değil
            const simdi = performance.now()
            if (simdi - sonOlcuZamani > 500) {
              sonOlcuZamani = simdi
              geriBildirim.current.olcuDegisti(Math.round(mm * 2) / 2)
            }
          } else {
            bildir('araniyor')
          }
        }
        kare = requestAnimationFrame(dongu)
      }
      dongu()
    }

    baslat().catch((h) => {
      if (iptal) return
      // Model aşamasında düştüyse sorun kamera değil, indirme
      const mesaj = sonDurum === 'yukleniyor'
        ? 'El takip modeli indirilemedi. İnternet bağlantını kontrol edip sayfayı yenile.'
        : kameraHatasi(h)
      bildir('hata', mesaj)
    })

    return () => {
      iptal = true
      el.current.noktalar = null
      geriBildirim.current.olcuDegisti(null)
      setHazir(false)
      kapat()
    }
  }, [yon])

  return (
    <div className="kamera-alan">
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ transform: ayna ? 'scaleX(-1)' : undefined, opacity: hazir ? 1 : 0 }}
      />
      {/* Ortografik kamera, zoom 1: bir birim = bir ekran pikseli. El noktaları da piksele çevriliyor. */}
      <Canvas orthographic camera={{ position: [0, 0, 2000], zoom: 1, near: 1, far: 6000 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[300, 600, 900]} intensity={1.6} />
        <Environment resolution={64}>
          <Lightformer intensity={3} position={[0, 2, 3]} scale={[6, 2, 1]} />
          <Lightformer intensity={1.5} position={[-3, 0, 2]} scale={[2, 4, 1]} color="#ffe9c8" />
          <Lightformer intensity={1} position={[3, -1, 2]} scale={[2, 4, 1]} color="#c8d4ff" />
        </Environment>
        <Yuzuk el={el} video={videoRef} ayna={ayna} maden={maden} tasli={tasli} />
      </Canvas>
    </div>
  )
}
