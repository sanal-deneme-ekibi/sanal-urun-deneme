import { describe, expect, it } from 'vitest'
import { baskinRenk, zeminiTemizle } from './doku'

function pikseller(renkler: [number, number, number, number][]) {
  return Uint8ClampedArray.from(renkler.flat())
}

describe('baskinRenk', () => {
  it('çizgili kumaşta karışım değil en çok görülen rengi verir', () => {
    // 6 lacivert, 4 beyaz piksel: ortalama gri-mavi olurdu, beklenen lacivert
    const p = pikseller([
      ...Array(6).fill([20, 30, 90, 255]),
      ...Array(4).fill([250, 250, 250, 255]),
    ])
    expect(baskinRenk(p)).toBe('#141e5a')
  })

  it('aynı kutudaki tonların ortalamasını alır', () => {
    const p = pikseller([
      [200, 0, 0, 255],
      [202, 2, 2, 255],
    ])
    expect(baskinRenk(p)).toBe('#c90101')
  })

  it('saydam pikselleri saymaz', () => {
    const p = pikseller([
      ...Array(9).fill([0, 0, 0, 0]),
      [0, 200, 0, 255],
    ])
    expect(baskinRenk(p)).toBe('#00c800')
  })

  it('boş görselde varsayılan kumaş rengi', () => {
    expect(baskinRenk(new Uint8ClampedArray(0))).toBe('#e8e8e8')
  })
})

describe('zeminiTemizle', () => {
  // 5×5: beyaz zemin çerçevesi, ortada siyah kumaş, kumaşın ortasında beyaz baskı
  const B = [250, 250, 250, 255] as [number, number, number, number]
  const S = [10, 10, 10, 255] as [number, number, number, number]
  const izgara = [
    [B, B, B, B, B],
    [B, S, S, S, B],
    [B, S, B, S, B],
    [B, S, S, S, B],
    [B, B, B, B, B],
  ]
  it('kenara bağlı zemini boyar, ortadaki aynı renkli baskıyı korur', () => {
    const p = pikseller(izgara.flat())
    const n = zeminiTemizle(p, 5, 5, '#fafafa', '#0a0a0a')
    expect(n).toBeGreaterThanOrEqual(16) // zeminin 16 pikseli (+ kenardaki kumaş pikselleri aynı renge)
    expect(Array.from(p.slice(0, 3))).toEqual([10, 10, 10])
    const orta = (2 * 5 + 2) * 4
    expect(Array.from(p.slice(orta, orta + 3))).toEqual([250, 250, 250])
  })
  it('zemine yakın ama eşiğin dışındaki krem çizgiye dokunmaz', () => {
    // krem (225,220,205) ile beyaz zemin arası uzaklık ≈ 55
    const K = [225, 220, 205, 255] as [number, number, number, number]
    const p = pikseller([B, K, B])
    expect(zeminiTemizle(p, 3, 1, '#fafafa', '#000000')).toBe(2)
    expect(Array.from(p.slice(4, 7))).toEqual([225, 220, 205])
  })
  it('silüetteki gri geçiş piksellerini de boyar, baskının kırmızısını boyamaz', () => {
    const G = [128, 128, 128, 255] as [number, number, number, number] // beyazla siyahın karışımı
    const K = [200, 20, 40, 255] as [number, number, number, number]
    const p = pikseller([B, G, S, S, B, K, S, S])
    zeminiTemizle(p, 4, 2, '#fafafa', '#0a0a0a')
    expect(Array.from(p.slice(4, 7))).toEqual([10, 10, 10]) // gri boyandı
    expect(Array.from(p.slice(20, 23))).toEqual([200, 20, 40]) // kırmızı kaldı
  })
  it('zemine benzemeyen kenarlara dokunmaz', () => {
    const p = pikseller(Array(9).fill(S))
    expect(zeminiTemizle(p, 3, 3, '#fafafa', '#ff0000')).toBe(0)
  })
})
