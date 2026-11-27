// Ürünün beden tablosunu elle girme. 2. dönemde tablo ürün linkinden veya ekran görüntüsünden
// (OCR) dolacak; kullanıcı yine burada düzeltecek.

import type { CSSProperties } from 'react'
import { ARALIKLAR, TISORT_SUTUNLARI, sonrakiBeden } from './bedenTablosu'
import type { MetinSatiri, TisortSutunu, Uyari } from './bedenTablosu'

const BASLIK: Record<TisortSutunu, string> = { boy_cm: 'Boy', en_cm: 'En', kol_cm: 'Kol' }
const ACIKLAMA: Record<TisortSutunu, string> = {
  boy_cm: 'omuzdan eteğe',
  en_cm: 'koltuk altından koltuk altına',
  kol_cm: 'omuz dikişinden kol ağzına',
}

type Props = {
  satirlar: MetinSatiri[]
  degisti: (s: MetinSatiri[]) => void
  uyarilar: Uyari[]
  ornekYukle: () => void
}

const hucre: CSSProperties = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  height: 40,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '0 8px',
  fontSize: 15,
  background: '#fff',
}

export default function BedenTablosuGirisi({ satirlar, degisti, uyarilar, ornekYukle }: Props) {
  const hataliSatirlar = new Set(uyarilar.filter((u) => u.satir != null).map((u) => u.satir))

  const hucreDegisti = (i: number, alan: keyof MetinSatiri, deger: string) =>
    degisti(satirlar.map((s, j) => (j === i ? { ...s, [alan]: deger } : s)))

  const ekle = () =>
    degisti([...satirlar, { beden: sonrakiBeden(satirlar.at(-1)?.beden), boy_cm: '', en_cm: '', kol_cm: '' }])

  const sil = (i: number) => degisti(satirlar.filter((_, j) => j !== i))

  const kolonlar = '56px repeat(3, minmax(0, 1fr)) 36px'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, color: '#444' }}>Beden tablosu (cm, düz serili)</span>
        <button type="button" onClick={ornekYukle} style={{ border: 'none', background: 'none', color: '#1d4ed8', fontSize: 13, cursor: 'pointer', padding: 0 }}>
          Örnek tablo
        </button>
      </div>

      <div role="table" aria-label="Beden tablosu" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div role="row" style={{ display: 'grid', gridTemplateColumns: kolonlar, gap: 6, fontSize: 13, fontWeight: 600, color: '#3d3e44' }}>
          <span role="columnheader">Beden</span>
          {TISORT_SUTUNLARI.map((k) => (
            <span role="columnheader" key={k} title={ACIKLAMA[k]}>
              {BASLIK[k]}
            </span>
          ))}
          <span />
        </div>
        {satirlar.map((s, i) => (
          <div role="row" key={i} style={{ display: 'grid', gridTemplateColumns: kolonlar, gap: 6, alignItems: 'center' }}>
            <input
              aria-label={`${i + 1}. satır beden adı`}
              value={s.beden}
              onChange={(e) => hucreDegisti(i, 'beden', e.target.value)}
              style={{ ...hucre, fontWeight: 600, borderColor: hataliSatirlar.has(i) ? '#f59e0b' : '#cbd5e1' }}
            />
            {TISORT_SUTUNLARI.map((k) => (
              <input
                key={k}
                aria-label={`${s.beden || i + 1} ${BASLIK[k].toLocaleLowerCase('tr')}`}
                inputMode="decimal"
                placeholder={`${ARALIKLAR[k][0]}–${ARALIKLAR[k][1]}`}
                value={s[k]}
                onChange={(e) => hucreDegisti(i, k, e.target.value)}
                style={hucre}
              />
            ))}
            <button
              type="button"
              aria-label={`${s.beden || i + 1} bedenini sil`}
              onClick={() => sil(i)}
              style={{ width: 36, height: 40, border: 'none', background: 'none', color: '#8a8a8f', fontSize: 20, cursor: 'pointer', padding: 0 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={ekle}
        style={{ minHeight: 40, border: '1px dashed #8a8a8f', borderRadius: 8, background: '#fff', color: '#3d3e44', fontSize: 14, cursor: 'pointer' }}
      >
        + Beden ekle
      </button>

      <small style={{ color: '#666', lineHeight: 1.5 }}>
        En: tişört düz serilmişken {ACIKLAMA.en_cm} (çevrenin yarısı). Boy: {ACIKLAMA.boy_cm}. Kol: {ACIKLAMA.kol_cm}.
      </small>

      {uyarilar.length > 0 && (
        <ul role="status" style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5, color: '#78350f' }}>
          {uyarilar.map((u, i) => (
            <li key={i} style={{ color: u.engel ? '#7f1d1d' : '#78350f' }}>
              {u.mesaj}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
