import { useEffect, useMemo } from 'react'
import { testAvatariOlustur, agirliklariUygula } from './testAvatari'
import { TEST_KALIBRASYON } from '../olcu/kalibrasyon'
import type { Agirliklar } from '../olcu/cozucu'

export default function Avatar({ agirliklar }: { agirliklar: Agirliklar }) {
  const mesh = useMemo(() => testAvatariOlustur(TEST_KALIBRASYON), [])

  useEffect(() => {
    agirliklariUygula(mesh, agirliklar)
  }, [mesh, agirliklar])

  return <primitive object={mesh} />
}