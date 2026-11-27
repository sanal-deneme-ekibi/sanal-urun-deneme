import { describe, expect, it } from 'vitest'
import { TISORT_KALIBRASYON, tabanEfektif, urunCozucu, urunTahmin } from './sablonKalibrasyon'
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
