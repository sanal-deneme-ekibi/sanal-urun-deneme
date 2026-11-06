import { OLCU_ADLARI, OLCU_ETIKETLERI, olcuAraligi } from './kalibrasyon'
import type { Kalibrasyon, OlcuAdi } from './kalibrasyon'
import type { Agirliklar, Olculer } from './cozucu'

type Props = {
  olculer: Olculer
  agirliklar: Agirliklar
  kalib: Kalibrasyon
  degisti: (ad: OlcuAdi, cm: number) => void
}

export default function OlcuPaneli({ olculer, agirliklar, kalib, degisti }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Ölçülerim</h2>
      {OLCU_ADLARI.map((ad) => {
        const { min, max } = olcuAraligi(kalib[ad])
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
            {/* Hocaya gösterirken: cm'nin hangi shape key ağırlığına çevrildiği */}
            <small style={{ color: '#666' }}>
              {ad} = {agirliklar[ad].toFixed(2)}
            </small>
          </label>
        )
      })}
    </div>
  )
}