// Kıyafet → Avatarda dene. Ölçüler Ölçülerim ekranından gelir (OlcuBaglami).
// Seçilen bedenin tablodaki ölçüleri şablonun ürün key'lerine çevrilir; tişört avatarla
// aynı vücut ağırlıklarını taşıdığı için vücutla birlikte büyür.

import { Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import Viewer from '../viewer/Viewer'
import Avatar from '../avatar/Avatar'
import Kiyafet from './Kiyafet'
import ModelSecici from '../bilesenler/ModelSecici'
import { useOlculer } from '../olcu/OlcuBaglami'
import { TISORT_KALIBRASYON, sablonNotlari, urunCozucu } from './sablonKalibrasyon'
import { enUygunBeden, olcuyuAnlat, uygunlukHesapla } from '../uygunluk/uygunluk'
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

  return (
    <div className="duzen">
      <section className="sahne" aria-label="Avatarda deneme">
        <Viewer boy={sonuc.ulasilan.boy / 100} etiket={`Tişört · ${beden.beden}`}>
          <Suspense fallback={null}>
            <Avatar model={model} agirliklar={sonuc.agirliklar} kiyafetAltinda kumasRengi={urun?.zeminRengi ?? renk} />
            <Kiyafet model={model} vucut={sonuc.agirliklar} urun={urunSekli.agirliklar} doku={doku} renk={renk} />
          </Suspense>
        </Viewer>
      </section>

      <aside className="panel">
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
              <Link to="/kiyafet/ekle" className="dugme-metin">
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
              {beden.beden} beden · {DURUM_ETIKETI[uygunluk.durum].toLocaleLowerCase('tr')}
            </span>
            <span>{uygunluk.olculer.map(olcuyuAnlat).join(' · ') || 'Karşılaştırılacak ölçü yok'}</span>
            {oneri && oneri.beden !== beden.beden && <b>Önerimiz: {oneri.beden}</b>}
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
                tablo: boy {beden.boy_cm ?? '–'} · en {beden.en_cm ?? '–'} · kol {beden.kol_cm ?? '–'} cm
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
