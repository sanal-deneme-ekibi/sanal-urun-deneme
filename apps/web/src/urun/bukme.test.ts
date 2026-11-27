import { describe, expect, it } from 'vitest'
import { afinMatris, dikdortgendenNoktalar, govdeKutusu, govdeNoktasi, izgara, kolDortgeni, VARSAYILAN_NOKTALAR } from './bukme'
import type { Noktalar } from './bukme'

const uygula = (m: number[], [x, y]: [number, number]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

describe('afinMatris', () => {
  it('kaynak üçgenin köşelerini hedef köşelere taşır', () => {
    const k: [[number, number], [number, number], [number, number]] = [[0, 0], [10, 0], [0, 10]]
    const h: [[number, number], [number, number], [number, number]] = [[5, 5], [25, 8], [3, 30]]
    const m = afinMatris(k, h)!
    k.forEach((p, i) => {
      const [x, y] = uygula(m, p)
      expect(x).toBeCloseTo(h[i][0])
      expect(y).toBeCloseTo(h[i][1])
    })
  })
  it('dejenere üçgende null', () => {
    expect(afinMatris([[0, 0], [1, 1], [2, 2]], [[0, 0], [1, 0], [0, 1]])).toBeNull()
  })
})

describe('govdeNoktasi', () => {
  const n: Noktalar = VARSAYILAN_NOKTALAR
  const yakin = (a: number[], b: number[]) => {
    expect(a[0]).toBeCloseTo(b[0])
    expect(a[1]).toBeCloseTo(b[1])
  }
  it('köşelerde anahtar noktaları verir', () => {
    yakin(govdeNoktasi(n, 0, 0), n.omuz_sag)
    yakin(govdeNoktasi(n, 0.5, 0), n.yaka_orta)
    yakin(govdeNoktasi(n, 1, 0), n.omuz_sol)
    yakin(govdeNoktasi(n, 0, 1), n.etek_sag)
    yakin(govdeNoktasi(n, 1, 1), n.etek_sol)
  })
})

describe('izgara', () => {
  it('her hücre için iki üçgen üretir ve kaynak/hedef köşeleri eşleşir', () => {
    const c = izgara((s, t) => [s, t], (s, t) => [s * 2, t * 3], 4, 5)
    expect(c).toHaveLength(40)
    expect(c[0].hedef[1]).toEqual([c[0].kaynak[1][0] * 2, c[0].kaynak[1][1] * 3])
  })
})

describe('kolDortgeni', () => {
  it('koltuk altı kenarı aşağı (gövdeye) doğru açılır', () => {
    // sağ kol: omuzdan sola-aşağı uzanıyor
    const [ustOmuz, altOmuz] = kolDortgeni([0.3, 0.2], [0.1, 0.45], [0, 1])
    expect(altOmuz[1]).toBeGreaterThan(ustOmuz[1])
  })
})

describe('dikdortgendenNoktalar ve govdeKutusu', () => {
  it('eski kırpmadan gövde noktalarını kurar, kutu geri aynı dikdörtgeni verir', () => {
    const k = { x: 0.25, y: 0.2, w: 0.5, h: 0.7 }
    const n = dikdortgendenNoktalar(k)
    expect(n.omuz_sag).toEqual([0.25, 0.2])
    expect(n.etek_sol[0]).toBeCloseTo(0.75)
    const b = govdeKutusu(n)
    expect(b.x).toBeCloseTo(0.25)
    expect(b.w).toBeCloseTo(0.5)
    expect(b.h).toBeCloseTo(0.7)
  })
})
