import { useState } from 'react'
import { KAYDIRICI_ARALIGI, OLCU_ADLARI, OLCU_ETIKETLERI, OLCUNUN_KEYI } from './kalibrasyon'
import type { OlcuAdi, Olculer } from './kalibrasyon'
import type { CozucuSonucu } from './cozucu'

type Props = {
  olculer: Olculer
  sonuc: CozucuSonucu
  degisti: (ad: OlcuAdi, cm: number) => void
}

// 1 cm'den küçük farklar gözle görülmez; uyarı göstermiyoruz
const UYARI_ESIGI_CM = 1

export default function OlcuPaneli({ olculer, sonuc, degisti }: Props) {
  const [teknik, setTeknik] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Ölçülerim</h2>

      {OLCU_ADLARI.map((ad) => {
        const { min, max } = KAYDIRICI_ARALIGI[ad]
        const key = OLCUNUN_KEYI[ad]
        const gosterilemiyor = Math.abs(sonuc.fark[ad]) >= UYARI_ESIGI_CM
        return (
          <label key={ad} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{OLCU_ETIKETLERI[ad]}</span>
              <b>{olculer[ad]} cm</b>
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={1}
              value={olculer[ad]}
              onChange={(e) => degisti(ad, Number(e.target.value))}
            />
            {gosterilemiyor && (
              <span
                role="status"
                style={{
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: '#7c2d12',
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 8,
                  padding: '6px 10px',
                }}
              >
                Avatar bu ölçüyü tam gösteremiyor: {olculer[ad]} cm yerine{' '}
                <b>{Math.round(sonuc.ulasilan[ad])} cm</b> görünüyor.
              </span>
            )}
            {teknik && (
              <small style={{ color: '#666', fontFamily: 'monospace' }}>
                {key} = {sonuc.agirliklar[key].toFixed(2)} · avatar {sonuc.ulasilan[ad].toFixed(1)} cm
              </small>
            )}
          </label>
        )
      })}

      <div style={{ borderTop: '1px solid #e2e2e0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#444' }}>
          <input type="checkbox" checked={teknik} onChange={(e) => setTeknik(e.target.checked)} />
          Teknik ayrıntılar
        </label>
        {teknik && (
          <small style={{ color: '#666', lineHeight: 1.5 }}>
            Kaydırıcıdaki cm değerleri ölçü çözücüyle shape key ağırlıklarına (0–1) çevrilir. Dört ölçü birlikte
            çözülür. Ortalama sapma: <b>{sonuc.ortalamaHataCm.toFixed(1)} cm</b>
            {sonuc.sinirda.length > 0 && <> · sınıra dayanan key'ler: {sonuc.sinirda.join(', ')}</>}
          </small>
        )}
      </div>
    </div>
  )
}