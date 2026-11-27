// Kıyafet şablonu kalibrasyonu ve ürün ölçüsü çözücüsü.
// Biçim: docs/glb-sozlesmesi.md → "Kıyafet şablonu kalibrasyonu"
//
//   taban_efektif[olcu] = taban[olcu] + Σ govde_etki[vkey][olcu] × vucut_agirligi[vkey]
//   olcu                = taban_efektif[olcu] + Σ etki[key][olcu] × agirlik[key]
//
// Vücut key'leri avatardan aynen alınır (yeniden çözülmez); burada yalnızca ürün key'leri
// (length, width, sleeve) beden tablosundaki ölçüye göre çözülür.

import tisortKadinKalib from '../../../../assets/models/sablon_tisort_kadin.calib.json'
import tisortErkekKalib from '../../../../assets/models/sablon_tisort_erkek.calib.json'
import type { Agirliklar, KeyAdi, Model } from '../olcu/kalibrasyon'

export type UrunKey = 'length' | 'width' | 'sleeve'
export type UrunOlcu = 'boy' | 'en' | 'kol' // size_charts: boy_cm, en_cm, kol_cm (düz serili)

export type UrunOlculeri = Record<UrunOlcu, number>
export type UrunAgirliklari = Record<UrunKey, number>

export type SablonKalibrasyon = {
  surum: number
  model: string
  keyler: UrunKey[]
  olcumler: UrunOlcu[]
  taban: UrunOlculeri
  etki: Record<UrunKey, UrunOlculeri>
  govde_etki: Record<KeyAdi, UrunOlculeri>
}

export const TISORT_KALIBRASYON: Record<Model, SablonKalibrasyon> = {
  kadin: tisortKadinKalib as SablonKalibrasyon,
  erkek: tisortErkekKalib as SablonKalibrasyon,
}

export type UrunSonucu = {
  agirliklar: UrunAgirliklari
  /** Şablonun bu ağırlıklarla ulaştığı ürün ölçüleri (cm, düz serili) */
  ulasilan: UrunOlculeri
  /** ulasilan − hedef; verilmeyen ölçülerde 0 */
  fark: UrunOlculeri
}

/** Vücut ağırlıklarına göre kaydırılmış taban: bu vücuttaki en küçük kıyafetin ölçüleri. */
export function tabanEfektif(kalib: SablonKalibrasyon, vucut: Agirliklar): UrunOlculeri {
  const sonuc = { ...kalib.taban }
  for (const [vkey, etkiler] of Object.entries(kalib.govde_etki) as [KeyAdi, UrunOlculeri][]) {
    const w = vucut[vkey] ?? 0
    for (const o of kalib.olcumler) sonuc[o] += etkiler[o] * w
  }
  return sonuc
}

export function urunTahmin(kalib: SablonKalibrasyon, vucut: Agirliklar, w: UrunAgirliklari): UrunOlculeri {
  const sonuc = tabanEfektif(kalib, vucut)
  for (const k of kalib.keyler) for (const o of kalib.olcumler) sonuc[o] += kalib.etki[k][o] * w[k]
  return sonuc
}

const YINELEME = 3000

/**
 * Beden tablosundaki ölçülere (boy, en, kol) ulaşan ürün key ağırlıklarını bulur.
 * Sınırlı en küçük kareler (0 ≤ ağırlık ≤ 1), avatar çözücüsüyle aynı yöntem.
 * Tablo bir ölçüyü vermiyorsa (null) o ölçü hesaba girmez, key'i 0,5'te kalır.
 */
export function urunCozucu(
  hedef: Partial<Record<UrunOlcu, number | null>>,
  kalib: SablonKalibrasyon,
  vucut: Agirliklar,
): UrunSonucu {
  const taban = tabanEfektif(kalib, vucut)
  const verilen = kalib.olcumler.filter((o) => typeof hedef[o] === 'number')

  let kareToplam = 0
  for (const k of kalib.keyler) for (const o of verilen) kareToplam += kalib.etki[k][o] ** 2
  const adim = kareToplam > 0 ? 1 / (2 * kareToplam) : 0

  const w = Object.fromEntries(kalib.keyler.map((k) => [k, 0.5])) as UrunAgirliklari
  for (let i = 0; i < YINELEME && adim > 0; i++) {
    for (const k of kalib.keyler) {
      let egim = 0
      for (const o of verilen) {
        let tahmin = taban[o]
        for (const k2 of kalib.keyler) tahmin += kalib.etki[k2][o] * w[k2]
        egim += 2 * kalib.etki[k][o] * (tahmin - (hedef[o] as number))
      }
      w[k] = Math.min(1, Math.max(0, w[k] - adim * egim))
    }
  }

  const ulasilan = urunTahmin(kalib, vucut, w)
  const fark = { boy: 0, en: 0, kol: 0 } as UrunOlculeri
  for (const o of verilen) fark[o] = ulasilan[o] - (hedef[o] as number)
  return { agirliklar: w, ulasilan, fark }
}
