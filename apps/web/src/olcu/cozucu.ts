import { KEY_ADLARI, OLCU_ADLARI } from './kalibrasyon'
import type { Agirliklar, Kalibrasyon, KeyAdi, Olculer } from './kalibrasyon'

// Ölçü çözücü — docs/glb-sozlesmesi.md → "Ölçü çözücü" bölümündeki girdi/çıktıya birebir uyar.
// Yöntem: ağırlıklı, sınırlı en küçük kareler (projected gradient).
//   ölçü = taban + Σ etki[key][ölçü] × ağırlık[key],   0 ≤ ağırlık ≤ 1
// Dört ölçü birlikte çözülür, çünkü key'ler birbirini etkiler (ör. boy key'i çevreleri de büyütür).

export type CozucuSonucu = {
  agirliklar: Agirliklar
  ulasilan: Olculer
  fark: Olculer
  ortalamaHataCm: number
  sinirda: KeyAdi[]
}

const DESTEKLENEN_SURUM = 1
const YINELEME = 6000

// Ölçülerin önemi (hatanın karesiyle çarpılır).
// Boy en kesin ölçülen ve görüntüyü en çok etkileyen ölçü: çözücü önce boyu tuttursun,
// bir çevreyi yakalamak için boyu değiştirmesin.
const ONEM: Olculer = { boy: 10, gogus: 1, bel: 1, kalca: 1 }

export function tahminEt(agirliklar: Agirliklar, kalib: Kalibrasyon): Olculer {
  const sonuc = { ...kalib.taban }
  for (const k of KEY_ADLARI) {
    for (const o of OLCU_ADLARI) {
      sonuc[o] += kalib.etki[k][o] * agirliklar[k]
    }
  }
  return sonuc
}

export function olcuCozucu(hedef: Olculer, kalib: Kalibrasyon): CozucuSonucu {
  if (kalib.surum !== DESTEKLENEN_SURUM) {
    throw new Error(`Kalibrasyon sürümü ${kalib.surum} desteklenmiyor (beklenen ${DESTEKLENEN_SURUM})`)
  }

  // Adım boyu: Lipschitz sabitinin üst sınırı (2 × önem × etki katsayılarının kareleri toplamı)
  let kareToplam = 0
  for (const k of KEY_ADLARI) for (const o of OLCU_ADLARI) kareToplam += ONEM[o] * kalib.etki[k][o] ** 2
  const adim = 1 / (2 * kareToplam)

  const w: Agirliklar = { height: 0.5, chest: 0.5, waist: 0.5, hip: 0.5 }
  for (let i = 0; i < YINELEME; i++) {
    const tahmin = tahminEt(w, kalib)
    for (const k of KEY_ADLARI) {
      // f = Σ önem_o (tahmin_o − hedef_o)²  →  ∂f/∂w_k = 2 Σ önem_o · etki[k][o] · (tahmin_o − hedef_o)
      let egim = 0
      for (const o of OLCU_ADLARI) egim += 2 * ONEM[o] * kalib.etki[k][o] * (tahmin[o] - hedef[o])
      w[k] = Math.min(1, Math.max(0, w[k] - adim * egim)) // 0–1 aralığına geri it
    }
  }

  const ulasilan = tahminEt(w, kalib)
  const fark = {} as Olculer
  let toplam = 0
  for (const o of OLCU_ADLARI) {
    fark[o] = ulasilan[o] - hedef[o]
    toplam += Math.abs(fark[o])
  }
  const sinirda = KEY_ADLARI.filter((k) => w[k] <= 1e-3 || w[k] >= 1 - 1e-3)

  return { agirliklar: w, ulasilan, fark, ortalamaHataCm: toplam / OLCU_ADLARI.length, sinirda }
}