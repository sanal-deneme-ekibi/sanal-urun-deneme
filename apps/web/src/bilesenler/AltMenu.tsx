import { NavLink } from 'react-router'
import type { ReactNode } from 'react'

// Simgeler: sade çizgi SVG (emoji kullanmıyoruz)
const ikon = (yol: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {yol}
  </svg>
)

const SEKMELER = [
  { yol: '/', ad: 'Ölçülerim', simge: ikon(<><circle cx="12" cy="6" r="3" /><path d="M7 21v-6l-2-5h14l-2 5v6" /></>) },
  { yol: '/kiyafet', ad: 'Kıyafet', simge: ikon(<path d="M9 3 4 6l2 4 2-1v12h8V9l2 1 2-4-5-3c-.7 1.2-1.8 2-3 2s-2.3-.8-3-2z" />) },
  { yol: '/gozluk', ad: 'Gözlük', simge: ikon(<><circle cx="7" cy="14" r="3.5" /><circle cx="17" cy="14" r="3.5" /><path d="M10.5 14h3M3.5 14 2 9M20.5 14 22 9" /></>) },
  { yol: '/favori', ad: 'Favori', simge: ikon(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />) },
]

export default function AltMenu() {
  return (
    <nav aria-label="Ana menü" style={{ display: 'flex', borderTop: '1px solid #d6d6d3', background: '#fff' }}>
      {SEKMELER.map((s) => (
        <NavLink
          key={s.yol}
          to={s.yol}
          end
          style={({ isActive }) => ({
            flex: 1,
            minHeight: 56,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            fontSize: 12,
            textDecoration: 'none',
            color: isActive ? '#1b1b1f' : '#6b6b70',
            fontWeight: isActive ? 700 : 400,
          })}
        >
          {s.simge}
          {s.ad}
        </NavLink>
      ))}
    </nav>
  )
}