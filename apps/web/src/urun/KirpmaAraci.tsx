// Fotoğrafta tişörtün gövdesini seçme çerçevesi. Fare ve dokunmatikte çalışır (pointer events).
// Çerçeve sürüklenerek taşınır, köşelerinden boyutlanır.

import { useRef } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import { kirpmaSinirla } from './doku'
import type { Kirpma } from './doku'

type Tutamac = 'tasi' | 'su' | 'sa' | 'au' | 'aa' // sol-üst, sağ-üst... (s: sol, a: sağ; u: üst, a: alt)
type Surukleme = { tutamac: Tutamac; x0: number; y0: number; k0: Kirpma }

const KOSELER: { t: Tutamac; sol: boolean; ust: boolean; imlec: string }[] = [
  { t: 'su', sol: true, ust: true, imlec: 'nwse-resize' },
  { t: 'sa', sol: false, ust: true, imlec: 'nesw-resize' },
  { t: 'au', sol: true, ust: false, imlec: 'nesw-resize' },
  { t: 'aa', sol: false, ust: false, imlec: 'nwse-resize' },
]

type Props = { src: string; kirpma: Kirpma; degisti: (k: Kirpma) => void }

export default function KirpmaAraci({ src, kirpma, degisti }: Props) {
  const kutu = useRef<HTMLDivElement>(null)
  const surukleme = useRef<Surukleme | null>(null)

  const basla = (t: Tutamac) => (e: RPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    surukleme.current = { tutamac: t, x0: e.clientX, y0: e.clientY, k0: kirpma }
  }

  const hareket = (e: RPointerEvent) => {
    const s = surukleme.current
    const r = kutu.current?.getBoundingClientRect()
    if (!s || !r) return
    const dx = (e.clientX - s.x0) / r.width
    const dy = (e.clientY - s.y0) / r.height
    const k = s.k0
    if (s.tutamac === 'tasi') {
      degisti(kirpmaSinirla({ ...k, x: k.x + dx, y: k.y + dy }))
      return
    }
    // Köşe: karşı köşe sabit kalır
    let sol = k.x, sag = k.x + k.w, ust = k.y, alt = k.y + k.h
    if (s.tutamac[0] === 's') sol = Math.min(sag - 0.05, Math.max(0, sol + dx))
    else sag = Math.max(sol + 0.05, Math.min(1, sag + dx))
    if (s.tutamac[1] === 'u') ust = Math.min(alt - 0.05, Math.max(0, ust + dy))
    else alt = Math.max(ust + 0.05, Math.min(1, alt + dy))
    degisti(kirpmaSinirla({ x: sol, y: ust, w: sag - sol, h: alt - ust }))
  }

  const bitir = () => {
    surukleme.current = null
  }

  const etiket: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
    background: '#1d4ed8',
    borderRadius: 4,
    padding: '1px 6px',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  }

  return (
    <div
      ref={kutu}
      onPointerMove={hareket}
      onPointerUp={bitir}
      onPointerCancel={bitir}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, touchAction: 'none', userSelect: 'none', lineHeight: 0 }}
    >
      <img src={src} alt="Yüklenen ürün fotoğrafı" draggable={false} style={{ width: '100%', display: 'block' }} />
      <div
        role="slider"
        aria-label="Kırpma çerçevesi"
        aria-valuetext={`sol ${Math.round(kirpma.x * 100)}%, üst ${Math.round(kirpma.y * 100)}%, genişlik ${Math.round(kirpma.w * 100)}%, yükseklik ${Math.round(kirpma.h * 100)}%`}
        onPointerDown={basla('tasi')}
        style={{
          position: 'absolute',
          left: `${kirpma.x * 100}%`,
          top: `${kirpma.y * 100}%`,
          width: `${kirpma.w * 100}%`,
          height: `${kirpma.h * 100}%`,
          border: '2px solid #1d4ed8',
          boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
          cursor: 'move',
          boxSizing: 'border-box',
        }}
      >
        {/* Ön orta çizgi: tişörtün ortası buraya gelsin */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.8)', pointerEvents: 'none' }} />
        <span style={{ ...etiket, top: 4 }}>yaka</span>
        <span style={{ ...etiket, bottom: 4 }}>etek</span>
        {KOSELER.map((c) => (
          <div
            key={c.t}
            onPointerDown={basla(c.t)}
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: 28,
              height: 28,
              left: c.sol ? -14 : undefined,
              right: c.sol ? undefined : -14,
              top: c.ust ? -14 : undefined,
              bottom: c.ust ? undefined : -14,
              cursor: c.imlec,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ width: 14, height: 14, background: '#fff', border: '2px solid #1d4ed8', borderRadius: 3 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
