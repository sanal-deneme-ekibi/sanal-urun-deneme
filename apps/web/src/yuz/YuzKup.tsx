import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// Son ölçülen baş yönü, her karede küpe uygulanır
const basYonu = new THREE.Quaternion()

function Kup() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    // Ani sıçramaları yumuşatmak için hedefe kademeli yaklaş
    ref.current?.quaternion.slerp(basYonu, 0.5)
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshNormalMaterial />
    </mesh>
  )
}

export default function YuzKup() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [durum, setDurum] = useState('Model yükleniyor...')

  useEffect(() => {
    let landmarker: FaceLandmarker | undefined
    let akis: MediaStream | undefined
    let kare = 0
    let iptal = false

    async function baslat() {
      const dosyalar = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm'
      )
      landmarker = await FaceLandmarker.createFromOptions(dosyalar, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFacialTransformationMatrixes: true,
      })

      setDurum('Kamera açılıyor...')
      akis = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })
      const video = videoRef.current
      if (!video || iptal) return
      video.srcObject = akis
      await video.play()
      setDurum('Yüz aranıyor...')

      const m = new THREE.Matrix4()
      const konum = new THREE.Vector3()
      const olcek = new THREE.Vector3()

      const dongu = () => {
        if (iptal || !landmarker) return
        const sonuc = landmarker.detectForVideo(video, performance.now())
        const matris = sonuc.facialTransformationMatrixes?.[0]
        if (matris) {
          m.fromArray(matris.data)
          m.decompose(konum, basYonu, olcek)
          setDurum(`Yüz bulundu · ${sonuc.faceLandmarks[0].length} nokta`)
        } else {
          setDurum('Yüz aranıyor...')
        }
        kare = requestAnimationFrame(dongu)
      }
      dongu()
    }

    baslat().catch((h) => setDurum('Hata: ' + (h?.message ?? h)))

    return () => {
      iptal = true
      cancelAnimationFrame(kare)
      akis?.getTracks().forEach((t) => t.stop())
      landmarker?.close()
    }
  }, [])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', background: '#111' }}>
        {/* Ayna görüntüsü: kullanıcı kendini aynadaki gibi görsün */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
        <div style={{ position: 'absolute', top: 12, left: 12, color: '#fff', font: '14px sans-serif', background: 'rgba(0,0,0,.5)', padding: '4px 8px', borderRadius: 6 }}>
          {durum}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 3] }}>
          <Kup />
        </Canvas>
      </div>
    </div>
  )
}