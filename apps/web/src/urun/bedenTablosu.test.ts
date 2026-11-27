import { describe, expect, it } from 'vitest'
import { sayiOku, sonrakiBeden, tabloDenetle, tabloTemizle } from './bedenTablosu'

describe('sayiOku', () => {
  it('virgüllü, noktalı ve cm yazılı değerleri okur', () => {
    expect(sayiOku('48')).toBe(48)
    expect(sayiOku('48,5')).toBe(48.5)
    expect(sayiOku(' 48.5 cm ')).toBe(48.5)
  })
  it('boşu null, okunamayanı NaN döner', () => {
    expect(sayiOku('  ')).toBeNull()
    expect(sayiOku('kırk')).toBeNaN()
  })
})

describe('tabloDenetle', () => {
  const iyi = [
    { beden: 'S', boy_cm: 64, en_cm: 44, kol_cm: 18 },
    { beden: 'M', boy_cm: 67, en_cm: 48, kol_cm: 19 },
  ]
  it('düzgün tabloda uyarı yok', () => {
    expect(tabloDenetle(iyi)).toEqual([])
  })
  it('boş tablo ve hiç en olmayan tablo kaydedilemez', () => {
    expect(tabloDenetle([]).some((u) => u.engel)).toBe(true)
    expect(tabloDenetle([{ beden: 'S', boy_cm: 64 }]).some((u) => u.engel)).toBe(true)
  })
  it('çift ve boş beden adı engeldir', () => {
    expect(tabloDenetle([{ beden: 'M', en_cm: 48 }, { beden: 'm', en_cm: 50 }]).some((u) => u.engel)).toBe(true)
    expect(tabloDenetle([{ beden: ' ', en_cm: 48 }]).some((u) => u.engel)).toBe(true)
  })
  it('çevre yazılmış en için ipucu verir ama engellemez', () => {
    const u = tabloDenetle([{ beden: 'M', en_cm: 96 }])
    expect(u).toHaveLength(1)
    expect(u[0].engel).toBe(false)
    expect(u[0].mesaj).toContain('Çevre değil')
  })
  it('küçülen eni uyarır', () => {
    const u = tabloDenetle([{ beden: 'S', en_cm: 48 }, { beden: 'M', en_cm: 44 }])
    expect(u.some((x) => x.satir === 1 && !x.engel)).toBe(true)
  })
  it('sayı olmayan değer engeldir', () => {
    expect(tabloDenetle([{ beden: 'S', en_cm: NaN }]).some((u) => u.engel)).toBe(true)
  })
})

describe('tabloTemizle ve sonrakiBeden', () => {
  it('tamamen boş satırı atar, adı kırpar', () => {
    expect(tabloTemizle([{ beden: ' M ', en_cm: 48 }, { beden: '' }])).toEqual([{ beden: 'M', en_cm: 48 }])
  })
  it('sonraki bedeni önerir', () => {
    expect(sonrakiBeden('M')).toBe('L')
    expect(sonrakiBeden('xl')).toBe('XXL')
    expect(sonrakiBeden('42')).toBe('')
    expect(sonrakiBeden(undefined)).toBe('S')
  })
})
