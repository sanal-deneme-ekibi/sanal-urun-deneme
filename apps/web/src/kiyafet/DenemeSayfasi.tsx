// Kıyafet → Avatarda dene. Ölçüler Ölçülerim ekranından gelir (OlcuBaglami).
// Seçilen bedenin tablodaki ölçüleri şablonun ürün key'lerine çevrilir; tişört avatarla
// aynı vücut ağırlıklarını taşıdığı için vücutla birlikte büyür.

import { Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { CSSProperties } from 'react'
import Viewer from '../viewer/Viewer'
import Avatar from '../avatar/Avatar'
import Kiyafet from './Kiyafet'
import ModelSecici from '../bilesenler/ModelSecici'
import { useOlculer } from '../olcu/OlcuBaglami'
import { TISORT_KALIBRASYON, sablonNotlari, urunCozucu } from './sablonKalibrasyon'
import { ESIKLER, enUygunBeden, uygunlukHesapla } from '../uygunluk/uygunluk'
import type { Durum } from '../uygunluk/uygunluk'
import { ORNEK_BEDENLER } from '../uygunluk/ornekBedenler'
import { useUrun } from '../urun/UrunBaglami'
import { useUrunDokusu } from '../urun/useUrunDokusu'

const DURUM_ETIKETI: Record<Durum, string> = { dar: 'Dar', uygun: 'Uygun', bol: 'Bol' }

const KUMAS_RENKLERI = ['#e8e8e8', '#1f2937', '#1d4ed8', '#b91c1c', '#15803d', '#f5d0a9']

export default function DenemeSayfasi() {
  const { model, sonuc } = useOlculer()
  const { urun } = useUrun()
  const doku = useUrunDokusu(urun, model)
  // Ürünün kendi tablosu; ürün yoksa (veya eski kayıtsa) örnek tablo
  const bedenler = urun?.bedenler?.length ? urun.bedenler : ORNEK_BEDENLER.tisort
  const ornekTablo = !urun?.bedenler?.length
  const vucutCevre = { gogus: sonuc.ulasilan.gogus, bel: sonuc.ulasilan.bel, kalca: sonuc.ulasilan.kalca }

  const oneri = useMemo(() => enUygunBeden('tisort', bedenler, vucutCevre), [bedenler, vucutCevre.gogus, vucutCevre.bel, vucutCevre.kalca]) // eslint-disable-line
  const [secilen, setSecilen] = useState<string | null>(null)
  const beden = bedenler.find((b) => b.beden === (secilen ?? oneri?.beden)) ?? bedenler[0]
  const [renk, setRenk] = useState(KUMAS_RENKLERI[0])
  const [teknik, setTeknik] = useState(false)

  const kalib = TISORT_KALIBRASYON[model]
  const urunSekli = useMemo(
    () => urunCozucu({ boy: beden.boy_cm, en: beden.en_cm, kol: beden.kol_cm }, kalib, sonuc.agirliklar),
    [beden, kalib, sonuc.agirliklar],
  )
  const uygunluk = uygunlukHesapla('tisort', beden, vucutCevre)
  // Şablonun tablodaki ölçüye ulaşamadığı yerler (avatarda gösterilen hal tablodan farklı)
  const notlar = sablonNotlari(urunSekli)

  // Göğüs payı ve dar–uygun–bol göstergesi (ölçek −8 … +24 cm)
  const gogusPayi = uygunluk.olculer.find((o) => o.sutun === 'en_cm')?.payCm
  const OLCEK = { alt: -8, ust: 24 }
  const yuzde = (cm: number) => Math.max(0, Math.min(100, ((cm - OLCEK.alt) / (OLCEK.ust - OLCEK.alt)) * 100))
  const darSinir = yuzde(ESIKLER.dar)
  const bolSinir = yuzde(ESIKLER.bol)
  const serit = `linear-gradient(90deg, var(--dar) 0 ${darSinir}%, var(--uygun) ${darSinir}% ${bolSinir}%, var(--bol) ${bolSinir}% 100%)`
  const payYazi = gogusPayi === undefined ? '' : `${gogusPayi > 0 ? '+' : ''}${Math.round(gogusPayi)} cm`
  const aciklama =
    gogusPayi === undefined
      ? 'Bu bedenin tablosunda en ölçüsü yok; uygunluk hesaplanamıyor.'
      : uygunluk.durum === 'dar'
        ? `Göğüste ${Math.abs(Math.round(gogusPayi))} cm ${gogusPayi < 0 ? 'eksik' : 'pay var ama az'}: kumaş gerilir, vücuda yapışır.`
        : uygunluk.durum === 'bol'
          ? `Göğüste ${Math.round(gogusPayi)} cm pay: bol durur, oversize görünür.`
          : `Göğüste ${Math.round(gogusPayi)} cm pay: rahat, vücuda oturan bir tişört.`
  // Kaide ışığı sonucun rengini alır
  const sahneStili = {
    '--hale': uygunluk.durum === 'dar' ? 'var(--dar-cizgi)' : uygunluk.durum === 'bol' ? 'var(--bol-cizgi)' : undefined,
  } as CSSProperties

  return (
    <div className="duzen">
      <section className="sahne" aria-label="Avatarda deneme" style={sahneStili}>
        <Viewer boy={sonuc.ulasilan.boy / 100} etiket={`Tişört · ${beden.beden} beden`} gorunumler>
          <Suspense fallback={null}>
            <Avatar model={model} agirliklar={sonuc.agirliklar} kiyafetAltinda kumasRengi={urun?.zeminRengi ?? renk} />
            <Kiyafet model={model} vucut={sonuc.agirliklar} urun={urunSekli.agirliklar} doku={doku} renk={renk} />
          </Suspense>
        </Viewer>
        {payYazi && (
          <div className="sahne-cip cam">
            <span className="nokta" data-durum={uygunluk.durum} />
            Göğüs <b>{payYazi}</b>
          </div>
        )}
      </section>

      <aside className="panel cam">
        <div className="panel-ic">
          <div className="panel-baslik">
            <h1>Tişört dene</h1>
            <ModelSecici />
          </div>

          {urun ? (
            <div className="urun-kart">
              <img src={urun.foto} alt="Denenen ürün" />
              <div>
                <b>Ürününüz</b>
                <br />
                <small style={{ color: 'var(--soluk)' }}>Tişört · fotoğraftan</small>
              </div>
              <Link to="/kiyafet/ekle" className="dugme-metin" style={{ padding: '10px 4px' }}>
                Değiştir
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link to="/kiyafet/ekle" className="dugme">
                Ürün fotoğrafı ekle
              </Link>
              <span className="etiket">veya düz renk dene</span>
              <div role="group" aria-label="Kumaş rengi" className="renkler">
                {KUMAS_RENKLERI.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-label={`Renk ${r}`}
                    aria-pressed={r === renk}
                    onClick={() => setRenk(r)}
                    style={{ background: r }}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="etiket">Beden</span>
              <small style={{ color: 'var(--soluk)' }}>{ornekTablo ? 'örnek tablo' : 'ürünün tablosu'}</small>
            </span>
            <div role="group" aria-label="Beden" className="bedenler">
              {bedenler.map((b) => {
                const d = uygunlukHesapla('tisort', b, vucutCevre).durum
                return (
                  <button
                    key={b.beden}
                    type="button"
                    className="beden"
                    data-durum={d}
                    aria-pressed={b.beden === beden.beden}
                    onClick={() => setSecilen(b.beden)}
                  >
                    {b.beden}
                    <small>{DURUM_ETIKETI[d]}</small>
                  </button>
                )
              })}
            </div>
          </div>

          <div role="status" className="sonuc" data-durum={uygunluk.durum}>
            <span className="sonuc-baslik">
              <span>
                {beden.beden} beden ·{' '}
                <span className="durum-yazi" data-durum={uygunluk.durum}>
                  {DURUM_ETIKETI[uygunluk.durum].toLocaleLowerCase('tr')}
                </span>
              </span>
              <span className="mono">{payYazi}</span>
            </span>
            {gogusPayi !== undefined && (
              <div className="olcek" aria-hidden="true">
                <div className="olcek-serit" style={{ background: serit }} />
                <div className="olcek-imlec" style={{ left: `${yuzde(gogusPayi)}%` }} />
                <div className="olcek-etiketler">
                  <span style={{ left: 0 }}>dar</span>
                  <span style={{ left: `${darSinir}%` }}>+{ESIKLER.dar}</span>
                  <span style={{ left: `${(darSinir + bolSinir) / 2}%` }}>uygun</span>
                  <span style={{ left: `${bolSinir}%` }}>+{ESIKLER.bol}</span>
                  <span style={{ left: '100%' }}>bol</span>
                </div>
              </div>
            )}
            <p>{aciklama}</p>
            {oneri && oneri.beden !== beden.beden && (
              <button type="button" className="dugme-metin" style={{ alignSelf: 'flex-start' }} onClick={() => setSecilen(oneri.beden)}>
                Önerimiz {oneri.beden} beden: onu dene
              </button>
            )}
            <small>
              Tablo: boy {beden.boy_cm ?? '–'} · en {beden.en_cm ?? '–'} · kol {beden.kol_cm ?? '–'} cm
              {urun && (
                <>
                  {' · '}
                  <Link to="/kiyafet/ekle" style={{ color: 'inherit' }}>
                    düzenle
                  </Link>
                </>
              )}
            </small>
            {notlar.map((n) => (
              <small key={n}>{n}</small>
            ))}
          </div>

          <div className="bolum" style={{ gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--metin)' }}>
              <input type="checkbox" checked={teknik} onChange={(e) => setTeknik(e.target.checked)} />
              Teknik ayrıntılar
            </label>
            {teknik && (
              <div className="teknik">
                length = {urunSekli.agirliklar.length.toFixed(2)} · width = {urunSekli.agirliklar.width.toFixed(2)} · sleeve ={' '}
                {urunSekli.agirliklar.sleeve.toFixed(2)}
                <br />
                şablon: boy {urunSekli.ulasilan.boy.toFixed(1)} · en {urunSekli.ulasilan.en.toFixed(1)} · kol{' '}
                {urunSekli.ulasilan.kol.toFixed(1)} cm
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
