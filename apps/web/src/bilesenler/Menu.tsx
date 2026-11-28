import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import type { ReactNode } from 'react'
import { gorunenTema, temaOku, temaUygula } from './tema'
import type { Tema } from './tema'

// Simgeler: sade çizgi SVG (emoji kullanmıyoruz)
const ikon = (yol: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {yol}
  </svg>
)

const TISORT = <path d="M9 3 4 6l2 4 2-1v12h8V9l2 1 2-4-5-3c-.7 1.2-1.8 2-3 2s-2.3-.8-3-2z" />

const SEKMELER = [
  { yol: '/olculer', ad: 'Ölçülerim', simge: ikon(<><circle cx="12" cy="6" r="3" /><path d="M7 21v-6l-2-5h14l-2 5v6" /></>) },
  { yol: '/kiyafet', ad: 'Kıyafet', simge: ikon(TISORT) },
  { yol: '/gozluk', ad: 'Gözlük', simge: ikon(<><circle cx="7" cy="14" r="3.5" /><circle cx="17" cy="14" r="3.5" /><path d="M10.5 14h3M3.5 14 2 9M20.5 14 22 9" /></>) },
  { yol: '/favori', ad: 'Favoriler', simge: ikon(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />) },
]

const SONRAKI: Record<Tema, Tema> = { otomatik: 'koyu', koyu: 'acik', acik: 'otomatik' }
const TEMA_ADI: Record<Tema, string> = { otomatik: 'Tema: cihaza göre', koyu: 'Tema: koyu', acik: 'Tema: açık' }

// Geniş ekranda üstte cam şerit (marka · sekmeler · tema); telefonda altta yüzen sekme çubuğu
export default function Menu() {
  const [tema, setTema] = useState<Tema>(temaOku)
  const gorunen = gorunenTema(tema)

  const degistir = () => {
    const t = SONRAKI[tema]
    temaUygula(t)
    setTema(t)
  }

  return (
    <div className="menu-alan">
      <nav aria-label="Ana menü" className="menu cam">
        <Link to="/tanitim" className="marka">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--vurgu)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {TISORT}
          </svg>
          Sanal Ürün Deneme
        </Link>
        <div className="sekmeler">
          {SEKMELER.map((s) => (
            <NavLink key={s.yol} to={s.yol}>
              {s.simge}
              {s.ad}
            </NavLink>
          ))}
        </div>
        <button type="button" className="ikon-dugme" onClick={degistir} aria-label={`${TEMA_ADI[tema]}. Değiştir`} title={TEMA_ADI[tema]}>
          {tema === 'otomatik' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
            </svg>
          ) : gorunen === 'koyu' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          )}
        </button>
      </nav>
    </div>
  )
}
