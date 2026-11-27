// Fotoğrafta tişörtün 7 anahtar noktasını yerleştirme. Fare ve dokunmatikte çalışır.
// Gövde çizgisi ve kolların tahmini sınırı canlı çizilir; kullanıcı neyin nereye gideceğini görür.

import { useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import { NOKTA_ADLARI, NOKTA_ETIKETLERI, kolDortgeni } from './bukme'
import type { Nokta, NoktaAdi, Noktalar } from './bukme'

type Props = { src: string; noktalar: Noktalar; degisti: (n: Noktalar) => void }

// Giyenin sağı ekranda solda: etiketleri ekrandaki tarafa göre hizala
const ETIKET_YONU: Record<NoktaAdi, 'sol' | 'sag' | 'ust' | 'alt'> = {
  yaka_orta: 'ust',
  omuz_sag: 'sol',
  omuz_sol: 'sag',
  kol_sag: 'alt', // kenarda kesilmesin diye altta
  kol_sol: 'alt',
  etek_sag: 'sol',
  etek_sol: 'sag',
}

export default function NoktaAraci({ src, noktalar, degisti }: Props) {
  const kutu = useRef<HTMLDivElement>(null)
  const [surukle, setSurukle] = useState<NoktaAdi | null>(null)
  const [oran, setOran] = useState(1) // görselin en/boy oranı (kol genişliği tahmini piksel uzayında yapılır)

  const basla = (ad: NoktaAdi) => (e: RPointerEvent) => {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    setSurukle(ad)
  }
  const hareket = (e: RPointerEvent) => {
    const r = kutu.current?.getBoundingClientRect()
    if (!surukle || !r) return
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    degisti({ ...noktalar, [surukle]: [x, y] })
  }
  const bitir = () => setSurukle(null)

  // SVG'de kullanılan koordinat: x 0–oran, y 0–1 (kare piksel)
  const p = (n: Nokta): Nokta => [n[0] * oran, n[1]]
  const yol = (ns: Nokta[]) => ns.map((n, i) => `${i ? 'L' : 'M'}${n[0]},${n[1]}`).join(' ') + ' Z'
  const govde = yol([noktalar.omuz_sag, noktalar.yaka_orta, noktalar.omuz_sol, noktalar.etek_sol, noktalar.etek_sag].map(p))
  const kol = (omuz: Nokta, uc: Nokta) => {
    const [a, b, c, d] = kolDortgeni(p(omuz), p(uc), [0, 1])
    return yol([a, c, d, b])
  }

  return (
    <div
      ref={kutu}
      onPointerMove={hareket}
      onPointerUp={bitir}
      onPointerCancel={bitir}
      style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', touchAction: 'none', userSelect: 'none', lineHeight: 0 }}
    >
      <img
        src={src}
        alt="Yüklenen ürün fotoğrafı"
        draggable={false}
        onLoad={(e) => setOran(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight || 1)}
        style={{ width: '100%', display: 'block' }}
      />
      <svg
        viewBox={`0 0 ${oran} 1`}
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <path d={govde} fill="rgba(29,78,216,0.12)" stroke="#1d4ed8" strokeWidth={0.004} strokeLinejoin="round" />
        <path d={kol(noktalar.omuz_sag, noktalar.kol_sag)} fill="rgba(29,78,216,0.08)" stroke="#1d4ed8" strokeWidth={0.003} strokeDasharray="0.01 0.008" />
        <path d={kol(noktalar.omuz_sol, noktalar.kol_sol)} fill="rgba(29,78,216,0.08)" stroke="#1d4ed8" strokeWidth={0.003} strokeDasharray="0.01 0.008" />
      </svg>
      {NOKTA_ADLARI.map((ad) => {
        const [x, y] = noktalar[ad]
        const yon = ETIKET_YONU[ad]
        return (
          <div
            key={ad}
            role="slider"
            aria-label={NOKTA_ETIKETLERI[ad]}
            aria-valuetext={`yatay %${Math.round(x * 100)}, dikey %${Math.round(y * 100)}`}
            tabIndex={0}
            onPointerDown={basla(ad)}
            onKeyDown={(e) => {
              const adim = e.shiftKey ? 0.02 : 0.005
              const d: Record<string, Nokta> = { ArrowLeft: [-adim, 0], ArrowRight: [adim, 0], ArrowUp: [0, -adim], ArrowDown: [0, adim] }
              if (!d[e.key]) return
              e.preventDefault()
              degisti({ ...noktalar, [ad]: [Math.min(1, Math.max(0, x + d[e.key][0])), Math.min(1, Math.max(0, y + d[e.key][1]))] })
            }}
            style={{
              position: 'absolute',
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: 36,
              height: 36,
              marginLeft: -18,
              marginTop: -18,
              cursor: surukle === ad ? 'grabbing' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outlineOffset: -6,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: surukle === ad ? '#1d4ed8' : '#fff',
                border: '3px solid #1d4ed8',
                boxShadow: '0 0 0 2px rgba(255,255,255,0.8)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                whiteSpace: 'nowrap',
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.4,
                color: '#fff',
                background: '#1d4ed8',
                borderRadius: 4,
                padding: '0 5px',
                pointerEvents: 'none',
                ...(yon === 'ust' ? { bottom: 30 } : yon === 'alt' ? { top: 30 } : yon === 'sol' ? { right: 30 } : { left: 30 }),
              }}
            >
              {NOKTA_ETIKETLERI[ad]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
