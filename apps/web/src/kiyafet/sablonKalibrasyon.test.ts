import { describe, expect, it } from 'vitest'
import { TISORT_KALIBRASYON, sablonNotlari, tabanEfektif, urunCozucu, urunTahmin } from './sablonKalibrasyon'
import type { Agirliklar } from '../olcu/kalibrasyon'

const SIFIR: Agirliklar = { height: 0, chest: 0, waist: 0, hip: 0, weight: 0, arm_length: 0, leg_length: 0 }
const ORTA: Agirliklar = { height: 0.5, chest: 0.4, waist: 0.3, hip: 0.3, weight: 0.5, arm_length: 0.5, leg_length: 0.5 }

describe.each(['kadin', 'erkek'] as const)('tişört şablonu (%s)', (model) => {
  const kalib = TISORT_KALIBRASYON[model]

  it('ulaşılabilir ölçüyü geri bulur', () => {
    const w = { length: 0.3, width: 0.6, sleeve: 0.2 }
    const hedef = urunTahmin(kalib, ORTA, w)
    const sonuc = urunCozucu(hedef, kalib, ORTA)
    expect(sonuc.agirliklar.length).toBeCloseTo(0.3, 2)
    expect(sonuc.agirliklar.width).toBeCloseTo(0.6, 2)
    expect(sonuc.agirliklar.sleeve).toBeCloseTo(0.2, 2)
  })

  it('vücut büyüyünce aynı ürün daha küçük ağırlık ister (govde_etki)', () => {
    const hedef = { en: tabanEfektif(kalib, ORTA).en + 5 }
    const ince = urunCozucu(hedef, kalib, SIFIR).agirliklar.width
    const dolu = urunCozucu(hedef, kalib, ORTA).agirliklar.width
    expect(dolu).toBeLessThan(ince)
  })

  it('şablonun altındaki ölçü 0a dayanır ve farkı söyler', () => {
    const sonuc = urunCozucu({ en: 10 }, kalib, ORTA)
    expect(sonuc.agirliklar.width).toBe(0)
    expect(sonuc.fark.en).toBeGreaterThan(0)
  })

  it('verilmeyen ölçü hesaba girmez', () => {
    const sonuc = urunCozucu({ en: null, boy: undefined }, kalib, ORTA)
    expect(sonuc.fark).toEqual({ boy: 0, en: 0, kol: 0 })
  })
})

describe('sablonNotlari', () => {
  const sifir = { boy: 0, en: 0, kol: 0 }
  it('ulaşılan ölçüde not yok', () => {
    expect(sablonNotlari({ fark: sifir, ulasilan: { boy: 67, en: 48, kol: 19 } })).toEqual([])
  })
  it('uzayamayan boyu ve daralamayan eni söyler', () => {
    const n = sablonNotlari({ fark: { boy: -18.5, en: 2.2, kol: 0 }, ulasilan: { boy: 76.5, en: 50.2, kol: 19 } })
    expect(n).toHaveLength(2)
    expect(n[0]).toContain('boyuna kadar büyüyemiyor (en fazla 77 cm)')
    expect(n[0]).toContain('kısa')
    expect(n[1]).toContain('enine kadar küçülemiyor')
    expect(n[1]).toContain('bol')
  })
})
