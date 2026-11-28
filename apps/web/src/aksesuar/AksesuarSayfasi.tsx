import { useState } from 'react'
import { useSearchParams } from 'react-router'
import YuzKup from '../yuz/YuzKup'
import YuzukDeneme, { MADENLER } from './YuzukDeneme'
import type { ElDurumu, Maden } from './YuzukDeneme'
import type { KameraYonu } from './kamera'

type Tur = 'yuzuk' | 'gozluk'

const DURUM_YAZISI: Record<ElDurumu, string> = {
  yukleniyor: 'El takip modeli yükleniyor…',
  kamera: 'Kamera açılıyor…',
  araniyor: 'Elini kameraya göster',
  bulundu: 'El bulundu',
  hata: 'Başlatılamadı',
}

export default function AksesuarSayfasi() {
  const [parametre, setParametre] = useSearchParams()
  const tur: Tur = parametre.get('tur') === 'gozluk' ? 'gozluk' : 'yuzuk'
  const turSec = (t: Tur) => setParametre(t === 'yuzuk' ? {} : { tur: t }, { replace: true })

  const [yon, setYon] = useState<KameraYonu>('on')
  const [maden, setMaden] = useState<Maden>('altin')
  const [tasli, setTasli] = useState(true)
  const [durum, setDurum] = useState<ElDurumu>('yukleniyor')
  const [hata, setHata] = useState<string>()
  const [mm, setMm] = useState<number | null>(null)

  const durumDegisti = (d: ElDurumu, mesaj?: string) => {
    setDurum(d)
    setHata(d === 'hata' ? mesaj : undefined)
  }

  const nokta = durum === 'bulundu' ? 'uygun' : durum === 'hata' ? 'dar' : 'bol'

  return (
    <div className="duzen">
      <section className="sahne kamera" aria-label={tur === 'yuzuk' ? 'Yüzük denemesi' : 'Gözlük denemesi'}>
        {tur === 'yuzuk' ? (
          <>
            <YuzukDeneme yon={yon} maden={maden} tasli={tasli} durumDegisti={durumDegisti} olcuDegisti={setMm} />
            <div className="sahne-cip cam kamera-cip" role="status">
              <span className="nokta" data-durum={nokta} />
              {DURUM_YAZISI[durum]}
            </div>
            <div className="sahne-araclar">
              <button type="button" aria-pressed={yon === 'on'} onClick={() => setYon('on')}>Ön kamera</button>
              <button type="button" aria-pressed={yon === 'arka'} onClick={() => setYon('arka')}>Arka kamera</button>
            </div>
          </>
        ) : (
          <YuzKup />
        )}
      </section>

      <aside className="panel cam">
        <div className="panel-ic">
          <div className="panel-baslik">
            <h1>{tur === 'yuzuk' ? 'Yüzük dene' : 'Gözlük dene'}</h1>
            <div role="group" aria-label="Aksesuar" className="segment">
              <button type="button" aria-pressed={tur === 'yuzuk'} onClick={() => turSec('yuzuk')}>Yüzük</button>
              <button type="button" aria-pressed={tur === 'gozluk'} onClick={() => turSec('gozluk')}>Gözlük</button>
            </div>
          </div>

          {tur === 'yuzuk' ? (
            <>
              {hata && (
                <div className="sonuc" data-durum="dar" role="alert">
                  <span className="sonuc-baslik">Deneme başlatılamadı</span>
                  <span>{hata}</span>
                </div>
              )}

              <div className="bolum">
                <span className="etiket">Maden</span>
                <div role="group" aria-label="Maden" className="segment">
                  {MADENLER.map((m) => (
                    <button key={m.ad} type="button" aria-pressed={maden === m.ad} onClick={() => setMaden(m.ad)}>
                      <span className="nokta" style={{ background: m.renk, marginRight: 6, display: 'inline-block' }} />
                      {m.etiket}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bolum">
                <span className="etiket">Model</span>
                <div role="group" aria-label="Model" className="segment">
                  <button type="button" aria-pressed={tasli} onClick={() => setTasli(true)}>Tek taş</button>
                  <button type="button" aria-pressed={!tasli} onClick={() => setTasli(false)}>Alyans</button>
                </div>
              </div>

              <div className="sonuc" data-durum={mm ? 'uygun' : undefined}>
                <span className="sonuc-baslik">
                  Parmak genişliği <span className="mono">{mm ? `≈ ${mm.toFixed(1)} mm` : '—'}</span>
                </span>
                <span>
                  Kameradan kabaca tahmin; ölçü olarak kullanma. Yüzük numarası tahmini ilerde eklenecek.
                </span>
              </div>

              <div className="bolum" style={{ gap: 6 }}>
                <span className="etiket">İpucu</span>
                <span style={{ color: 'var(--metin)', lineHeight: 1.5 }}>
                  Elinin üstünü kameraya çevir, parmaklarını hafif aç. İyi ışıkta takip daha düzgün olur.
                  Görüntü cihazından çıkmaz, işlem tarayıcında yapılır.
                </span>
              </div>
            </>
          ) : (
            <div className="bolum">
              <span style={{ color: 'var(--metin)', lineHeight: 1.5 }}>
                Yüz takibi çalışıyor; gözlük modeli gelince küp yerine gözlük takılacak.
              </span>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
