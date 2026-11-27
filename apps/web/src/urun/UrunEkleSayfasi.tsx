// Kıyafet → Ürün ekle. 1. dönemde tür ve kırpma elle seçilir (Model 1 / Model 2 gelince otomatik).

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import KirpmaAraci from './KirpmaAraci'
import { VARSAYILAN_KIRPMA } from './doku'
import type { Kirpma } from './doku'
import { dosyayiKucult, gorselYukle, kirpmaRengi } from './gorsel'
import { useUrun } from './UrunBaglami'
import BedenTablosuGirisi from './BedenTablosuGirisi'
import { metindenOku, metneCevir, tabloDenetle, tabloTemizle } from './bedenTablosu'
import type { MetinSatiri } from './bedenTablosu'
import { ORNEK_BEDENLER } from '../uygunluk/ornekBedenler'

const TURLER = [
  { ad: 'Tişört', hazir: true },
  { ad: 'Gömlek', hazir: false },
  { ad: 'Pantolon', hazir: false },
  { ad: 'Elbise', hazir: false },
]

const birincilDugme: React.CSSProperties = {
  minHeight: 48,
  borderRadius: 10,
  border: 'none',
  background: '#1b1b1f',
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
}
const ikincilDugme: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 10,
  border: '2px solid #1b1b1f',
  background: '#fff',
  color: '#1b1b1f',
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
}

export default function UrunEkleSayfasi() {
  const { urun, urunKaydet } = useUrun()
  const git = useNavigate()
  const dosyaGirdisi = useRef<HTMLInputElement>(null)

  const [foto, setFoto] = useState<string | null>(urun?.foto ?? null)
  const [kirpma, setKirpma] = useState<Kirpma>(urun?.kirpma ?? VARSAYILAN_KIRPMA)
  const [zeminRengi, setZeminRengi] = useState(urun?.zeminRengi ?? '#e8e8e8')
  const [renkElle, setRenkElle] = useState(Boolean(urun))
  const [arkaAyni, setArkaAyni] = useState(urun?.arkaAyni ?? false)
  const [zeminTemizle, setZeminTemizle] = useState(urun?.zeminTemizle ?? true)
  const [hata, setHata] = useState<string | null>(null)
  const [tablo, setTablo] = useState<MetinSatiri[]>(() => metneCevir(urun?.bedenler ?? ORNEK_BEDENLER.tisort))
  const bedenler = tabloTemizle(metindenOku(tablo))
  const uyarilar = tabloDenetle(bedenler)
  const tabloEngelli = uyarilar.some((u) => u.engel)
  const [img, setImg] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!foto) return setImg(null)
    let iptal = false
    gorselYukle(foto).then((i) => !iptal && setImg(i))
    return () => {
      iptal = true
    }
  }, [foto])

  // Kullanıcı rengi kendisi seçmediyse, kırpma değiştikçe baskın rengi yeniden bul
  useEffect(() => {
    if (img && !renkElle) setZeminRengi(kirpmaRengi(img, kirpma))
  }, [img, kirpma, renkElle])

  const dosyaSecildi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0]
    e.target.value = '' // aynı dosya tekrar seçilebilsin
    if (!dosya) return
    if (!dosya.type.startsWith('image/')) return setHata('Lütfen bir görsel dosyası seçin.')
    try {
      setHata(null)
      setFoto(await dosyayiKucult(dosya))
      setKirpma(VARSAYILAN_KIRPMA)
      setRenkElle(false)
    } catch {
      setHata('Bu görsel açılamadı. Başka bir fotoğraf deneyin (JPEG veya PNG).')
    }
  }

  const kaydet = () => {
    if (!foto || tabloEngelli) return
    urunKaydet({ foto, kirpma, zeminRengi, arkaAyni, zeminTemizle, bedenler })
    git('/kiyafet')
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: '100%' }}>
      <div style={{ flex: '999 1 320px', minWidth: 0, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        {foto ? (
          <>
            <div style={{ width: '100%', maxWidth: 560 }}>
              <KirpmaAraci src={foto} kirpma={kirpma} degisti={setKirpma} />
            </div>
            <p style={{ margin: 0, maxWidth: 560, fontSize: 14, lineHeight: 1.5, color: '#3d3e44' }}>
              Çerçeveyi tişörtün gövdesine oturtun: üst kenar yakada, alt kenar etekte, yanlar koltuk altlarında.
              Kesikli çizgi tişörtün ortasına gelsin.
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => dosyaGirdisi.current?.click()}
            style={{
              width: '100%',
              maxWidth: 560,
              aspectRatio: '4 / 3',
              border: '2px dashed #8a8a8f',
              borderRadius: 12,
              background: '#f4f4f1',
              color: '#3d3e44',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 3 4 6l2 4 2-1v12h8V9l2 1 2-4-5-3c-.7 1.2-1.8 2-3 2s-2.3-.8-3-2z" />
            </svg>
            Ürün fotoğrafı yükleyin veya çekin
            <small style={{ color: '#6b6b70' }}>Düz zemine serilmiş, karşıdan çekilmiş tişört en iyi sonucu verir</small>
          </button>
        )}
      </div>

      <div style={{ flex: '1 1 280px', background: '#fff', padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Ürün ekle</h2>

        <input ref={dosyaGirdisi} type="file" accept="image/*" onChange={dosyaSecildi} hidden />
        <button type="button" style={ikincilDugme} onClick={() => dosyaGirdisi.current?.click()}>
          {foto ? 'Başka fotoğraf seç' : 'Fotoğraf yükle / çek'}
        </button>
        {hata && (
          <p role="alert" style={{ margin: 0, color: '#7f1d1d', fontSize: 14 }}>
            {hata}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#444' }}>Tür</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TURLER.map((t) => (
              <span
                key={t.ad}
                aria-disabled={!t.hazir}
                style={{
                  borderRadius: 999,
                  padding: '5px 12px',
                  fontSize: 13,
                  border: `1px solid ${t.hazir ? '#1b1b1f' : '#cbd5e1'}`,
                  background: t.hazir ? '#1b1b1f' : '#fff',
                  color: t.hazir ? '#fff' : '#8a8a8f',
                  fontWeight: t.hazir ? 600 : 400,
                }}
              >
                {t.ad}
                {!t.hazir && ' · yakında'}
              </span>
            ))}
          </div>
        </div>

        {foto && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="zemin-rengi" style={{ fontSize: 14, color: '#444' }}>
                Arka ve kolların rengi
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  id="zemin-rengi"
                  type="color"
                  value={zeminRengi}
                  onChange={(e) => {
                    setZeminRengi(e.target.value)
                    setRenkElle(true)
                  }}
                  style={{ width: 48, height: 40, border: '1px solid #cbd5e1', borderRadius: 8, padding: 2, background: '#fff' }}
                />
                <small style={{ color: '#666', lineHeight: 1.4 }}>
                  {renkElle ? (
                    <button type="button" onClick={() => setRenkElle(false)} style={{ border: 'none', background: 'none', color: '#1d4ed8', padding: 0, cursor: 'pointer', fontSize: 13 }}>
                      Fotoğraftan bul
                    </button>
                  ) : (
                    'Fotoğraftaki baskın renk'
                  )}
                </small>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: '#444', lineHeight: 1.4 }}>
              <input type="checkbox" checked={zeminTemizle} onChange={(e) => setZeminTemizle(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                Fotoğraf zeminini temizle
                <br />
                <small style={{ color: '#666' }}>Çerçeveye giren masa veya duvar kumaş rengine boyanır. Açık renkli çizgiler silinirse kapatın.</small>
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: '#444', lineHeight: 1.4 }}>
              <input type="checkbox" checked={arkaAyni} onChange={(e) => setArkaAyni(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                Arkası da aynı desende
                <br />
                <small style={{ color: '#666' }}>Çizgili, kareli gibi her yeri desenli kumaşlar için. Önde baskı varsa kapalı bırakın.</small>
              </span>
            </label>
          </>
        )}

        <BedenTablosuGirisi
          satirlar={tablo}
          degisti={setTablo}
          uyarilar={uyarilar}
          ornekYukle={() => setTablo(metneCevir(ORNEK_BEDENLER.tisort))}
        />

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            style={{ ...birincilDugme, opacity: foto && !tabloEngelli ? 1 : 0.4 }}
            disabled={!foto || tabloEngelli}
            onClick={kaydet}
          >
            {urun ? 'Kaydet ve avatarda dene' : 'Avatarda dene'}
          </button>
          {!foto && <small style={{ color: '#666', textAlign: 'center' }}>Önce ürün fotoğrafı ekleyin.</small>}
          {urun && (
            <button
              type="button"
              style={{ ...ikincilDugme, border: 'none', color: '#7f1d1d', minHeight: 36, fontSize: 14 }}
              onClick={() => {
                urunKaydet(null)
                git('/kiyafet')
              }}
            >
              Ürünü kaldır
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
