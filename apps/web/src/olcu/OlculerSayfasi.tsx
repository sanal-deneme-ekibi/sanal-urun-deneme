import { Suspense, useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import Viewer from '../viewer/Viewer'
import Avatar from '../avatar/Avatar'
import OlcuPaneli from './OlcuPaneli'
import { olcuCozucu } from './cozucu'
import { AVATAR_KALIBRASYON } from './kalibrasyon'
import type { HedefOlculer } from './kalibrasyon'

export default function OlculerSayfasi() {
  const [olculer, setOlculer] = useState<HedefOlculer>({ boy: 165, gogus: 92, bel: 70, kalca: 96 })

  // cm → shape key ağırlıkları. Beş key birlikte çözülür (weight dahil), ama kilo hedef
  // olarak verilmiyor: avatar aynı anda hem çevreleri hem kiloyu tutturamıyor, çevreler
  // kıyafet uygunluğu için daha önemli. Ayrıntı: #38
  const sonuc = useMemo(() => olcuCozucu(olculer, AVATAR_KALIBRASYON), [olculer])

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', height: '100%' }}>
      <div style={{ flex: '999 1 320px', minWidth: 0, minHeight: 360 }}>
        <Viewer>
          <Suspense fallback={<Html center>Avatar yükleniyor…</Html>}>
            <Avatar agirliklar={sonuc.agirliklar} />
          </Suspense>
        </Viewer>
      </div>
      <div style={{ flex: '1 1 280px', background: '#fff', overflowY: 'auto' }}>
        <OlcuPaneli
          olculer={olculer}
          sonuc={sonuc}
          degisti={(ad, cm) => setOlculer((eski) => ({ ...eski, [ad]: cm }))}
        />
      </div>
    </div>
  )
}