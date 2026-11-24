import { useState } from 'react'
import { KAYDIRICI_ARALIGI, OLCU_ADLARI, OLCU_BIRIMI, OLCU_ETIKETLERI, OLCUNUN_KEYI } from './kalibrasyon'
import type { HedefOlculer, OlcuAdi } from './kalibrasyon'
import type { CozucuSonucu } from './cozucu'

type Props = {
  olculer: HedefOlculer
  sonuc: CozucuSonucu
  degisti: (ad: OlcuAdi, cm: number) => void
}

// Bu farkın altındaki sapmalar gözle görülmez; uyarı göstermiyoruz.
// Kilo doğrusal değil (hacim ≈ boy × çevre²), eşiği sözleşmeyle aynı: 4 kg.
const UYARI_ESIGI: Record<OlcuAdi, number> = { boy: 1, gogus: 1, bel: 1, kalca: 1, kilo: 4 }

export default function OlcuPaneli({ olculer, sonuc, degisti }: Props) {
  const [teknik, setTeknik] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Ölçülerim</h2>

      {OLCU_ADLARI.map((ad) => {
        const deger = olculer[ad]
        if (deger === undefined) return null // kilo girilmemiş olabilir
        const { min, max } = KAYDIRICI_ARALIGI[ad]
        const birim = OLCU_BIRIMI[ad]
        const key = OLCUNUN_KEYI[ad]
        const gosterilemiyor = Math.abs(sonuc.fark[ad]) >= UYARI_ESIGI[ad]
        return (
          <label key={ad} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{OLCU_ETIKETLERI[ad]}</span>
              <b>
                {deger} {birim}
              </b>
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={1}
              value={deger}
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
                Avatar bu ölçüyü tam gösteremiyor: {deger} {birim} yerine{' '}
                <b>
                  {Math.round(sonuc.ulasilan[ad])} {birim}
                </b>{' '}
                görünüyor.
              </span>
            )}
            {teknik && (
              <small style={{ color: '#666', fontFamily: 'monospace' }}>
                {key} = {sonuc.agirliklar[key].toFixed(2)} · avatar {sonuc.ulasilan[ad].toFixed(1)} {birim}
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