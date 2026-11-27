import { Suspense } from 'react'
import Viewer from '../viewer/Viewer'
import Avatar from '../avatar/Avatar'
import OlcuPaneli from './OlcuPaneli'
import UygunlukPaneli from '../uygunluk/UygunlukPaneli'
import ModelSecici from '../bilesenler/ModelSecici'
import { useOlculer } from './OlcuBaglami'

export default function OlculerSayfasi() {
  // Ölçüler ve çözücü sonucu bütün ekranlarda ortak (OlcuBaglami)
  const { model, olculer, sonuc, olcuDegistir } = useOlculer()

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', height: '100%' }}>
      <div style={{ flex: '999 1 320px', minWidth: 0, minHeight: 360 }}>
        <Viewer>
          <Suspense fallback={null}>
            <Avatar model={model} agirliklar={sonuc.agirliklar} />
          </Suspense>
        </Viewer>
      </div>
      <div style={{ flex: '1 1 280px', background: '#fff', overflowY: 'auto' }}>
        <div style={{ padding: '20px 20px 0' }}>
          <ModelSecici />
        </div>
        <OlcuPaneli olculer={olculer} sonuc={sonuc} degisti={olcuDegistir} />
        {/* Beden önerisi, kullanıcının yazdığı hedefi değil avatarın ulaştığı ölçüyü kullanır. */}
        <UygunlukPaneli
          vucut={{ gogus: sonuc.ulasilan.gogus, bel: sonuc.ulasilan.bel, kalca: sonuc.ulasilan.kalca }}
        />
      </div>
    </div>
  )
}
