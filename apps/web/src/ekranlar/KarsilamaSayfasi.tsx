// İlk girişte görünen kısa tanıtım. "Başla"ya basınca bir daha kendiliğinden açılmaz;
// üst menüdeki markadan (/tanitim) her zaman açılabilir.

import { Suspense, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import Viewer from '../viewer/Viewer'
import Avatar from '../avatar/Avatar'
import Kiyafet from '../kiyafet/Kiyafet'
import { useOlculer } from '../olcu/OlcuBaglami'
import { useUrun } from '../urun/UrunBaglami'
import { useUrunDokusu } from '../urun/useUrunDokusu'
import { TISORT_KALIBRASYON, urunCozucu } from '../kiyafet/sablonKalibrasyon'
import { enUygunBeden, uygunlukHesapla } from '../uygunluk/uygunluk'
import { ORNEK_BEDENLER } from '../uygunluk/ornekBedenler'

const ANAHTAR = 'sanal-urun-deneme.tanitim-goruldu'

export function tanitimGoruldu(): boolean {
  try {
    return localStorage.getItem(ANAHTAR) === '1'
  } catch {
    return false
  }
}

function tanitimiKapat() {
  try {
    localStorage.setItem(ANAHTAR, '1')
  } catch {
    // Depolama kapalıysa tanıtım bir sonraki girişte yine görünür
  }
}

const ADIMLAR = [
  { baslik: 'Ölçünü gir', metin: 'Boy, göğüs, bel, kalça. Avatar kaydırdıkça anında değişir; kilo, kol boyu ve iç bacak isteğe bağlı.' },
  { baslik: 'Ürünü ekle', metin: 'Tişörtün fotoğrafını yükle, yaka ve omuz noktalarını yerleştir, beden tablosunu gir.' },
  { baslik: 'Avatarda dene', metin: 'Desen avatarına giyer. Beden değiştir, döndür; uygulama göğsün dar mı bol mu olduğunu söyler.' },
]

export default function KarsilamaSayfasi() {
  const git = useNavigate()
  const { model, sonuc } = useOlculer()
  const { urun } = useUrun()
  const doku = useUrunDokusu(urun, model)

  // Sahnedeki tişört ve kartlar kullanıcının kendi ölçüleriyle hesaplanır
  const bedenler = urun?.bedenler?.length ? urun.bedenler : ORNEK_BEDENLER.tisort
  const vucut = { gogus: sonuc.ulasilan.gogus, bel: sonuc.ulasilan.bel, kalca: sonuc.ulasilan.kalca }
  const oneri = enUygunBeden('tisort', bedenler, vucut)
  const beden = bedenler.find((b) => b.beden === oneri?.beden) ?? bedenler[Math.floor(bedenler.length / 2)]
  const sonucBeden = uygunlukHesapla('tisort', beden, vucut)
  const pay = sonucBeden.olculer.find((o) => o.sutun === 'en_cm')?.payCm
  const urunSekli = useMemo(
    () => urunCozucu({ boy: beden.boy_cm, en: beden.en_cm, kol: beden.kol_cm }, TISORT_KALIBRASYON[model], sonuc.agirliklar),
    [beden, model, sonuc.agirliklar],
  )

  const basla = () => {
    tanitimiKapat()
    git('/olculer')
  }

  return (
    <div className="karsilama">
      <div className="karsilama-ic">
        <section className="kahraman">
          <div className="kahraman-yazi">
            <span className="rozet">
              <span className="nokta" data-durum="uygun" />
              3B avatar · beden önerisi · canlı gözlük
            </span>
            <h1>
              Almadan önce,
              <br />
              kendi bedeninde gör.
            </h1>
            <p>
              Ölçülerini gir, avatarın senin gibi şekillensin. İnternetteki tişörtün fotoğrafını ekle; beden beden
              üstünde nasıl durduğunu, nerenin dar ya da bol geldiğini gör.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button type="button" className="dugme" onClick={basla}>
                Başla
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
              <a href="#nasil" className="dugme-ikincil">
                Nasıl çalışır
              </a>
            </div>
            <small style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--soluk)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              Kamera görüntüsü cihazında işlenir, kaydedilmez.
            </small>
          </div>

          <div className="kahraman-sahne sahne" aria-label="Dönen avatar">
            <Viewer boy={sonuc.ulasilan.boy / 100} kendiDonsun>
              <Suspense fallback={null}>
                <Avatar model={model} agirliklar={sonuc.agirliklar} kiyafetAltinda kumasRengi={urun?.zeminRengi ?? '#2a3168'} />
                <Kiyafet model={model} vucut={sonuc.agirliklar} urun={urunSekli.agirliklar} doku={doku} renk="#2a3168" />
              </Suspense>
            </Viewer>
            {oneri && (
              <div className="sahne-cip cam" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '12px 16px', top: '10%', left: 'auto', right: '4%' }}>
                <span className="etiket">Önerilen beden</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <b style={{ fontFamily: 'var(--baslik-tipi)', fontSize: 30, lineHeight: 1 }}>{oneri.beden}</b>
                  <span className="durum-yazi" data-durum={oneri.durum}>
                    {oneri.durum === 'uygun' ? 'uygun' : oneri.durum === 'dar' ? 'dar' : 'bol'}
                  </span>
                </span>
              </div>
            )}
            {pay !== undefined && (
              <div className="sahne-cip cam" style={{ top: '46%', left: '2%', right: 'auto' }}>
                <span className="nokta" data-durum={sonucBeden.durum} />
                Göğüs <b>{pay > 0 ? '+' : ''}{Math.round(pay)} cm</b>
              </div>
            )}
          </div>
        </section>

        <section id="nasil" aria-labelledby="nasil-baslik" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h2 id="nasil-baslik" style={{ fontSize: 28 }}>
            Üç adımda dene
          </h2>
          <div className="adimlar">
            {ADIMLAR.map((a, i) => (
              <div key={a.baslik} className="adim cam">
                <span>0{i + 1}</span>
                <h3 style={{ fontSize: 20 }}>{a.baslik}</h3>
                <p>{a.metin}</p>
              </div>
            ))}
          </div>
          <Link to="/olculer" className="dugme-metin" onClick={tanitimiKapat} style={{ alignSelf: 'flex-start' }}>
            Tanıtımı geç, uygulamaya git →
          </Link>
        </section>
      </div>
    </div>
  )
}
