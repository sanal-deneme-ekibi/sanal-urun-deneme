import { Suspense } from 'react'
import { Link } from 'react-router'
import Viewer from '../viewer/Viewer'
import Avatar from '../avatar/Avatar'
import OlcuPaneli from './OlcuPaneli'
import UygunlukPaneli from '../uygunluk/UygunlukPaneli'
import ModelSecici from '../bilesenler/ModelSecici'
import { useOlculer } from './OlcuBaglami'
import { MODEL_ETIKETLERI } from './kalibrasyon'
import { useUrun } from '../urun/UrunBaglami'
import { enUygunBeden } from '../uygunluk/uygunluk'
import { ORNEK_BEDENLER } from '../uygunluk/ornekBedenler'

export default function OlculerSayfasi() {
  // Ölçüler ve çözücü sonucu bütün ekranlarda ortak (OlcuBaglami)
  const { model, olculer, sonuc, olcuDegistir } = useOlculer()
  const { urun } = useUrun()

  // Beden önerisi, kullanıcının yazdığı hedefi değil avatarın ulaştığı ölçüyü kullanır.
  const vucut = {
    gogus: sonuc.ulasilan.gogus,
    bel: sonuc.ulasilan.bel,
    kalca: sonuc.ulasilan.kalca,
    // İç bacak yalnızca kullanıcı girdiyse: girmediyse avatarın tahmini, gerçek ölçü değil
    ic_bacak: olculer.ic_bacak !== undefined ? sonuc.ulasilan.ic_bacak : undefined,
  }
  const tablo = urun?.bedenler?.length ? urun.bedenler : ORNEK_BEDENLER.tisort
  const oneri = enUygunBeden('tisort', tablo, vucut)

  return (
    <div className="duzen">
      <section className="sahne" aria-label="Avatar">
        <Viewer
          boy={sonuc.ulasilan.boy / 100}
          etiket={`Avatarın · ${MODEL_ETIKETLERI[model].toLocaleLowerCase('tr')} · ${Math.round(sonuc.ulasilan.boy)} cm`}
          gorunumler
        >
          <Suspense fallback={null}>
            <Avatar model={model} agirliklar={sonuc.agirliklar} />
          </Suspense>
        </Viewer>
      </section>
      <aside className="panel cam">
        <div className="panel-ic">
          <div className="panel-baslik">
            <h1>Ölçülerim</h1>
            <ModelSecici />
          </div>
          {/* OlcuPaneli kendi başlığını da çiziyor; burada sayfa başlığı var, onunki gizlenir */}
          <div className="gomulu olcu-gomulu">
            <OlcuPaneli olculer={olculer} sonuc={sonuc} degisti={olcuDegistir} />
          </div>

          {oneri && (
            <Link to="/kiyafet" className="oneri-kart">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <span className="etiket" style={{ color: 'var(--uygun)' }}>
                  Tişörtte önerimiz
                </span>
                <span style={{ fontSize: 14, color: 'var(--metin)' }}>
                  {urun ? 'Ürününün tablosuna göre' : 'Örnek tabloya göre'} · avatarda dene
                </span>
              </div>
              <b>{oneri.beden}</b>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          )}

          <details className="acilir bolum">
            <summary>Diğer ürün türleri ve beden tablosu</summary>
            <div className="gomulu">
              <UygunlukPaneli vucut={vucut} />
            </div>
          </details>
        </div>
      </aside>
    </div>
  )
}
