import type { Kalibrasyon, KalibrasyonNoktasi, OlcuAdi } from './kalibrasyon'

export type Olculer = Record<OlcuAdi, number> // cm
export type Agirliklar = Record<OlcuAdi, number> // 0–1

// GEÇİCİ ÇÖZÜCÜ
// Her ölçüyü kendi kalibrasyon noktaları arasında doğrusal ara değerle ağırlığa çevirir.
// Zeynep'in en küçük kareler çözücüsü gelince aynı imzayla bunun yerine geçecek.
export function solve(olculer: Olculer, kalib: Kalibrasyon): Agirliklar {
  return {
    height: cmdenAgirliga(olculer.height, kalib.height),
    chest: cmdenAgirliga(olculer.chest, kalib.chest),
    waist: cmdenAgirliga(olculer.waist, kalib.waist),
    hip: cmdenAgirliga(olculer.hip, kalib.hip),
  }
}

function cmdenAgirliga(cm: number, noktalar: KalibrasyonNoktasi[]): number {
  const n = [...noktalar].sort((a, b) => a.cm - b.cm)
  const ilk = n[0]
  const son = n[n.length - 1]
  if (cm <= ilk.cm) return ilk.w
  if (cm >= son.cm) return son.w
  for (let i = 0; i < n.length - 1; i++) {
    const a = n[i]
    const b = n[i + 1]
    if (cm <= b.cm) {
      const t = (cm - a.cm) / (b.cm - a.cm)
      return a.w + t * (b.w - a.w)
    }
  }
  return son.w
}