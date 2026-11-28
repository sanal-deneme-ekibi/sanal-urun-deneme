import { describe, expect, it } from 'vitest'
import { ekranaCevir, parmakGenisligiMm, yuzukDurusu, YUZUK_YERI } from './el'
import type { V3 } from './el'

describe('ekranaCevir', () => {
  const video = { w: 640, h: 480 }
  it('videonun ortası ekranın ortası', () => {
    expect(ekranaCevir({ x: 0.5, y: 0.5, z: 0 }, video, { w: 800, h: 600 }, false)).toEqual([0, 0, -0])
  })
  it('y yukarı, ayna x’i çevirir', () => {
    const [x, y] = ekranaCevir({ x: 0, y: 0, z: 0 }, video, { w: 640, h: 480 }, false)
    expect(x).toBe(-320)
    expect(y).toBe(240)
    const [xa] = ekranaCevir({ x: 0, y: 0, z: 0 }, video, { w: 640, h: 480 }, true)
    expect(xa).toBe(320)
  })
  it('cover: dar kutuda görüntü yüksekliğe göre ölçeklenir, yanlardan taşar', () => {
    const [x] = ekranaCevir({ x: 1, y: 0.5, z: 0 }, video, { w: 300, h: 480 }, false)
    expect(x).toBe(320) // 640 px genişlik, kutudan taşar
  })
})

// Yukarı bakan, avucu kameraya dönük olmayan basit bir el (ekran pikseli)
function ornekEl(): V3[] {
  const p: V3[] = Array.from({ length: 21 }, () => [0, 0, 0] as V3)
  p[0] = [0, -200, 0] // bilek
  p[5] = [-60, 0, 0] // işaret kökü
  p[9] = [-20, 10, 0] // orta kök
  p[13] = [20, 5, 0] // yüzük kökü
  p[14] = [24, 65, 0] // yüzük ilk eklem
  p[17] = [60, -10, 0] // serçe kökü
  return p
}

describe('yuzukDurusu', () => {
  it('yüzük kök ile eklem arasında, eksen parmak boyunca', () => {
    const d = yuzukDurusu(ornekEl())
    expect(d.merkez[0]).toBeCloseTo(20 + 4 * YUZUK_YERI)
    expect(d.merkez[1]).toBeCloseTo(5 + 60 * YUZUK_YERI)
    expect(d.eksen[1]).toBeGreaterThan(0.99)
  })
  it('taş izleyiciye dönük ve eksene dik', () => {
    const d = yuzukDurusu(ornekEl())
    expect(d.ust[2]).toBeGreaterThan(0)
    const dik = d.ust[0] * d.eksen[0] + d.ust[1] * d.eksen[1] + d.ust[2] * d.eksen[2]
    expect(Math.abs(dik)).toBeLessThan(1e-9)
  })
  it('parmak genişliği komşu kökler arasından', () => {
    const d = yuzukDurusu(ornekEl())
    expect(d.genislikPx).toBeGreaterThan(25)
    expect(d.genislikPx).toBeLessThan(45)
  })
})

describe('parmakGenisligiMm', () => {
  it('kökler 2 cm aralıkla dururken yaklaşık 16 mm', () => {
    const dunya = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
    dunya[13] = { x: 0, y: 0, z: 0 }
    dunya[9] = { x: -0.02, y: 0, z: 0 }
    dunya[17] = { x: 0.02, y: 0, z: 0 }
    expect(parmakGenisligiMm(dunya)).toBeCloseTo(16.4, 1)
  })
})
