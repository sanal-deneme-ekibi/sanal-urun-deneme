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
    <div className="duzen">
      <section className="sahne" aria-label="Avatar">
        <Viewer boy={sonuc.ulasilan.boy / 100} etiket="Avatarın">
          <Suspense fallback={null}>
            <Avatar model={model} agirliklar={sonuc.agirliklar} />
          </Suspense>
        </Viewer>
      </section>
      <aside className="panel">
        <div className="panel-ic">
          <div className="panel-baslik">
            <h1>Ölçülerim</h1>
            <ModelSecici />
          </div>
          {/* OlcuPaneli kendi başlığını da çiziyor; burada sayfa başlığı var, onunki gizlenir */}
          <div className="gomulu olcu-gomulu">
            <OlcuPaneli olculer={olculer} sonuc={sonuc} degisti={olcuDegistir} />
          </div>
          {/* Beden önerisi, kullanıcının yazdığı hedefi değil avatarın ulaştığı ölçüyü kullanır. */}
          <div className="gomulu bolum">
            <UygunlukPaneli
              vucut={{
                gogus: sonuc.ulasilan.gogus,
                bel: sonuc.ulasilan.bel,
                kalca: sonuc.ulasilan.kalca,
                // İç bacak yalnızca kullanıcı girdiyse: girmediyse avatarın tahmini, gerçek ölçü değil
                ic_bacak: olculer.ic_bacak !== undefined ? sonuc.ulasilan.ic_bacak : undefined,
              }}
            />
          </div>
        </div>
      </aside>
    </div>
  )
}
