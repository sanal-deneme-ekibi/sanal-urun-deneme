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
import { TISORT_KALIBRASYON, urunCozucu } from './sablonKalibrasyon'
import { enUygunBeden, olcuyuAnlat, uygunlukHesapla } from '../uygunluk/uygunluk'
import type { Durum } from '../uygunluk/uygunluk'
import { ORNEK_BEDENLER } from '../uygunluk/ornekBedenler'
import { useUrun } from '../urun/UrunBaglami'
import { useUrunDokusu } from '../urun/useUrunDokusu'

const DURUM_RENGI: Record<Durum, { yazi: string; zemin: string; cerceve: string; etiket: string }> = {
  dar: { yazi: '#7f1d1d', zemin: '#fef2f2', cerceve: '#fecaca', etiket: 'Dar' },
  uygun: { yazi: '#14532d', zemin: '#f0fdf4', cerceve: '#bbf7d0', etiket: 'Uygun' },
  bol: { yazi: '#78350f', zemin: '#fffbeb', cerceve: '#fde68a', etiket: 'Bol' },
}

const KUMAS_RENKLERI = ['#e8e8e8', '#1f2937', '#1d4ed8', '#b91c1c', '#15803d', '#f5d0a9']

// Şablonun bir ürün ölçüsüne ulaşamadığı farkın gözle görülür sayıldığı eşik (cm, düz serili)
const GORUNUR_FARK_CM = 1

export default function DenemeSayfasi() {
  const { model, sonuc } = useOlculer()
  const { urun } = useUrun()
  const doku = useUrunDokusu(urun)
  const bedenler = ORNEK_BEDENLER.tisort
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
  // Ürün şablonun en dar halinden de darsa avatarda en dar hali gösterilir (görüntü biraz bol kalır)
  const enDarGosteriliyor = urunSekli.fark.en >= GORUNUR_FARK_CM

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', height: '100%' }}>
      <div style={{ flex: '999 1 320px', minWidth: 0, minHeight: 360 }}>
        <Viewer>
          <Suspense fallback={null}>
            <Avatar model={model} agirliklar={sonuc.agirliklar} />
            <Kiyafet model={model} vucut={sonuc.agirliklar} urun={urunSekli.agirliklar} doku={doku} renk={renk} />
          </Suspense>
        </Viewer>
      </div>

      <div style={{ flex: '1 1 280px', background: '#fff', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <ModelSecici />
        <h2 style={{ margin: 0, fontSize: 20 }}>Tişört dene</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#444' }}>Beden</span>
          <div role="group" aria-label="Beden" style={{ display: 'flex', gap: 8 }}>
            {bedenler.map((b) => {
              const d = uygunlukHesapla('tisort', b, vucutCevre).durum
              const secili = b.beden === beden.beden
              return (
                <button
                  key={b.beden}
                  type="button"
                  aria-pressed={secili}
                  onClick={() => setSecilen(b.beden)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 10,
                    border: `2px solid ${secili ? '#1b1b1f' : DURUM_RENGI[d].cerceve}`,
                    background: DURUM_RENGI[d].zemin,
                    color: DURUM_RENGI[d].yazi,
                    fontWeight: secili ? 700 : 500,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  {b.beden}
                  <br />
                  <small style={{ fontSize: 12 }}>{DURUM_RENGI[d].etiket}</small>
                </button>
              )
            })}
          </div>
        </div>

        <div
          role="status"
          style={{
            background: DURUM_RENGI[uygunluk.durum].zemin,
            border: `1px solid ${DURUM_RENGI[uygunluk.durum].cerceve}`,
            color: DURUM_RENGI[uygunluk.durum].yazi,
            borderRadius: 10,
            padding: '10px 12px',
            lineHeight: 1.5,
          }}
        >
          <b>{beden.beden}</b> beden: {uygunluk.olculer.map(olcuyuAnlat).join(' · ') || 'karşılaştırılacak ölçü yok'}
          {oneri && oneri.beden !== beden.beden && (
            <>
              <br />
              <small>Önerimiz: {oneri.beden}</small>
            </>
          )}
          {enDarGosteriliyor && (
            <>
              <br />
              <small>Şablon bu bedenin enine kadar daralamıyor; avatarda tişört gerçekte olduğundan biraz bol görünür.</small>
            </>
          )}
        </div>

        {urun ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #e2e2e0', borderRadius: 10, padding: 10 }}>
            <img src={urun.foto} alt="Denenen ürün" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
            <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>
              <b>Ürününüz</b>
              <br />
              <small style={{ color: '#666' }}>Tişört · fotoğraftan</small>
            </div>
            <Link to="/kiyafet/ekle" style={{ fontSize: 14, color: '#1d4ed8' }}>
              Değiştir
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link
              to="/kiyafet/ekle"
              style={{ minHeight: 48, borderRadius: 10, background: '#1b1b1f', color: '#fff', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              Ürün fotoğrafı ekle
            </Link>
            <span style={{ fontSize: 14, color: '#444', marginTop: 6 }}>veya düz renk dene</span>
            <div role="group" aria-label="Kumaş rengi" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {KUMAS_RENKLERI.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-label={`Renk ${r}`}
                  aria-pressed={r === renk}
                  onClick={() => setRenk(r)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: r,
                    border: r === renk ? '3px solid #1b1b1f' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid #e2e2e0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#444' }}>
            <input type="checkbox" checked={teknik} onChange={(e) => setTeknik(e.target.checked)} />
            Teknik ayrıntılar
          </label>
          {teknik && (
            <small style={{ color: '#666', lineHeight: 1.6, fontFamily: 'monospace' }}>
              length = {urunSekli.agirliklar.length.toFixed(2)} · width = {urunSekli.agirliklar.width.toFixed(2)} · sleeve ={' '}
              {urunSekli.agirliklar.sleeve.toFixed(2)}
              <br />
              tablo: boy {beden.boy_cm ?? '–'} · en {beden.en_cm ?? '–'} · kol {beden.kol_cm ?? '–'} cm
              <br />
              şablon: boy {urunSekli.ulasilan.boy.toFixed(1)} · en {urunSekli.ulasilan.en.toFixed(1)} · kol{' '}
              {urunSekli.ulasilan.kol.toFixed(1)} cm
            </small>
          )}
        </div>
      </div>
    </div>
  )
}
