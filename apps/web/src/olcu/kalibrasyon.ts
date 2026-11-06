// Ölçü adları GLB sözleşmesindeki shape key adlarıyla birebir aynı olmalı.
export type OlcuAdi = 'height' | 'chest' | 'waist' | 'hip'

export const OLCU_ADLARI: OlcuAdi[] = ['height', 'chest', 'waist', 'hip']

export const OLCU_ETIKETLERI: Record<OlcuAdi, string> = {
  height: 'Boy',
  chest: 'Göğüs',
  waist: 'Bel',
  hip: 'Kalça',
}

// Her shape key için "ağırlık (0–1) → cm" noktaları
export type KalibrasyonNoktasi = { w: number; cm: number }
export type Kalibrasyon = Record<OlcuAdi, KalibrasyonNoktasi[]>

// Test avatarının kalibrasyonu.
// Tuğçe'nin avatar_kadin.calib.json dosyası gelince bunun yerine o kullanılacak.
export const TEST_KALIBRASYON: Kalibrasyon = {
  height: [{ w: 0, cm: 150 }, { w: 1, cm: 190 }],
  chest: [{ w: 0, cm: 80 }, { w: 1, cm: 115 }],
  waist: [{ w: 0, cm: 60 }, { w: 1, cm: 100 }],
  hip: [{ w: 0, cm: 85 }, { w: 1, cm: 120 }],
}

export function olcuAraligi(noktalar: KalibrasyonNoktasi[]) {
  const cmler = noktalar.map((n) => n.cm)
  return { min: Math.min(...cmler), max: Math.max(...cmler) }
}