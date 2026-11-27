import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { agirliklariUygula, meshBul } from './agirlik'
import { AVATAR_URL, DRACO_YOLU } from './modeller'
import type { Agirliklar, Model } from '../olcu/kalibrasyon'

// Tuğçe'nin avatarları (assets/models/avatar_<model>.glb)
export default function Avatar({ model, agirliklar }: { model: Model; agirliklar: Agirliklar }) {
  const { scene } = useGLTF(AVATAR_URL[model], DRACO_YOLU)
  const mesh = useMemo(() => meshBul(scene, 'Avatar'), [scene])

  useEffect(() => {
    if (mesh) agirliklariUygula(mesh, agirliklar)
  }, [mesh, agirliklar])

  return <primitive object={scene} />
}

useGLTF.preload(AVATAR_URL.kadin, DRACO_YOLU)
