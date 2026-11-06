import { useMemo, useState } from 'react'
import Viewer from '../viewer/Viewer'
import Avatar from '../avatar/Avatar'
import OlcuPaneli from './OlcuPaneli'
import { solve } from './cozucu'
import type { Olculer } from './cozucu'
import { TEST_KALIBRASYON } from './kalibrasyon'

export default function OlculerSayfasi() {
  const [olculer, setOlculer] = useState<Olculer>({ height: 165, chest: 92, waist: 70, hip: 96 })

  // cm → shape key ağırlıkları (0–1)
  const agirliklar = useMemo(() => solve(olculer, TEST_KALIBRASYON), [olculer])

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', height: '100%' }}>
      <div style={{ flex: '999 1 320px', minWidth: 0, minHeight: 360 }}>
        <Viewer>
          <Avatar agirliklar={agirliklar} />
        </Viewer>
      </div>
      <div style={{ flex: '1 1 280px', background: '#fff', overflowY: 'auto' }}>
        <OlcuPaneli
          olculer={olculer}
          agirliklar={agirliklar}
          kalib={TEST_KALIBRASYON}
          degisti={(ad, cm) => setOlculer((eski) => ({ ...eski, [ad]: cm }))}
        />
      </div>
    </div>
  )
}