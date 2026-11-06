import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import avatarUrl from '../../../../assets/models/avatar_kadin.glb?url'
import { agirliklariUygula, meshBul } from './agirlik'
import type { Agirliklar } from '../olcu/kalibrasyon'

// Tuğçe'nin avatarı (assets/models/avatar_kadin.glb). Draco sıkıştırmasını useGLTF kendisi açar.
export default function Avatar({ agirliklar }: { agirliklar: Agirliklar }) {
  const { scene } = useGLTF(avatarUrl)
  const mesh = useMemo(() => meshBul(scene, 'Avatar'), [scene])

  useEffect(() => {
    if (mesh) agirliklariUygula(mesh, agirliklar)
  }, [mesh, agirliklar])

  return <primitive object={scene} />
}

useGLTF.preload(avatarUrl)