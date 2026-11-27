// Ürünün beden tablosu: kullanıcının girdiği metni sayıya çevirme ve tabloyu denetleme.
// Değerler düz serili ölçüdür (cm): en = koltuk altından koltuk altına, boy = omuzdan eteğe,
// kol = omuz dikişinden kol ağzına.

import type { BedenSatiri } from '../uygunluk/uygunluk'

export type TisortSutunu = 'boy_cm' | 'en_cm' | 'kol_cm'
export const TISORT_SUTUNLARI: TisortSutunu[] = ['boy_cm', 'en_cm', 'kol_cm']

// Tişört için makul aralıklar (cm, düz serili). Dışındaki değer büyük olasılıkla yanlış girilmiştir
// (çevre yazılmış, mm yazılmış, inç yazılmış...).
export const ARALIKLAR: Record<TisortSutunu, [number, number]> = {
  boy_cm: [40, 100],
  en_cm: [30, 80],
  kol_cm: [8, 40],
}

/** "48", "48,5", " 48.5 cm" → sayı; boş → null; okunamayan → NaN */
export function sayiOku(metin: string): number | null {
  const t = metin.trim().replace(/\s*cm$/i, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

export type Uyari = { satir: number | null; mesaj: string; engel: boolean }

const ETIKET: Record<TisortSutunu, string> = { boy_cm: 'boy', en_cm: 'en', kol_cm: 'kol' }

/**
 * Tabloyu denetler. `engel: true` olan uyarılar varken tablo kaydedilmez; diğerleri yalnızca
 * kullanıcıyı uyarır (yanlış olabilir ama imkânsız değil).
 */
export function tabloDenetle(satirlar: BedenSatiri[]): Uyari[] {
  const uyarilar: Uyari[] = []
  if (satirlar.length === 0) {
    uyarilar.push({ satir: null, mesaj: 'En az bir beden ekleyin.', engel: true })
    return uyarilar
  }

  const adlar = new Set<string>()
  satirlar.forEach((s, i) => {
    const ad = s.beden.trim()
    if (!ad) uyarilar.push({ satir: i, mesaj: `${i + 1}. satırın beden adı boş.`, engel: true })
    else if (adlar.has(ad.toLocaleUpperCase('tr'))) uyarilar.push({ satir: i, mesaj: `"${ad}" bedeni iki kez yazılmış.`, engel: true })
    adlar.add(ad.toLocaleUpperCase('tr'))

    for (const sutun of TISORT_SUTUNLARI) {
      const v = s[sutun]
      if (v == null) continue
      if (Number.isNaN(v)) {
        uyarilar.push({ satir: i, mesaj: `${ad || i + 1}: ${ETIKET[sutun]} sayı değil.`, engel: true })
        continue
      }
      const [alt, ust] = ARALIKLAR[sutun]
      if (v < alt || v > ust) {
        const ipucu = sutun === 'en_cm' && v > ust ? ' Çevre değil, düz serili en yazılmalı (çevrenin yarısı).' : ''
        uyarilar.push({ satir: i, mesaj: `${ad || i + 1}: ${ETIKET[sutun]} ${v} cm olağan değil (${alt}–${ust}).${ipucu}`, engel: false })
      }
    }
    if (s.en_cm == null)
      uyarilar.push({ satir: i, mesaj: `${ad || i + 1}: en yok; bu beden için uygunluk hesaplanamaz.`, engel: false })
  })

  if (!satirlar.some((s) => s.en_cm != null && !Number.isNaN(s.en_cm)))
    uyarilar.push({ satir: null, mesaj: 'Uygunluk için en az bir bedende en ölçüsü gerekli.', engel: true })

  // Bedenler küçükten büyüğe yazılır; en büyümüyorsa sütunlar karışmış olabilir.
  for (let i = 1; i < satirlar.length; i++) {
    const a = satirlar[i - 1].en_cm, b = satirlar[i].en_cm
    if (a != null && b != null && !Number.isNaN(a) && !Number.isNaN(b) && b < a) {
      uyarilar.push({ satir: i, mesaj: `${satirlar[i].beden || i + 1} bedeninin eni bir öncekinden küçük. Sıra veya değer yanlış olabilir.`, engel: false })
    }
  }
  return uyarilar
}

/** Kaydetmeden önce: boş satırları at, adları kırp. */
export function tabloTemizle(satirlar: BedenSatiri[]): BedenSatiri[] {
  return satirlar
    .filter((s) => s.beden.trim() || TISORT_SUTUNLARI.some((k) => s[k] != null))
    .map((s) => ({ ...s, beden: s.beden.trim() }))
}

const SIRA = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']
/** Yeni satır için akla gelen sonraki beden adı (M → L, XL → XXL); bilinmiyorsa boş. */
export function sonrakiBeden(son: string | undefined): string {
  if (!son) return 'S'
  const i = SIRA.indexOf(son.trim().toUpperCase())
  return i >= 0 && i < SIRA.length - 1 ? SIRA[i + 1] : ''
}

/** Ekranda düzenlenen hali: kullanıcı "48," yazarken sayı bozulmasın diye hücreler metin tutulur. */
export type MetinSatiri = { beden: string } & Record<TisortSutunu, string>

export function metneCevir(satirlar: BedenSatiri[]): MetinSatiri[] {
  const m = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '' : String(v).replace('.', ','))
  return satirlar.map((s) => ({ beden: s.beden, boy_cm: m(s.boy_cm), en_cm: m(s.en_cm), kol_cm: m(s.kol_cm) }))
}

export function metindenOku(satirlar: MetinSatiri[]): BedenSatiri[] {
  return satirlar.map((s) => ({
    beden: s.beden,
    boy_cm: sayiOku(s.boy_cm),
    en_cm: sayiOku(s.en_cm),
    kol_cm: sayiOku(s.kol_cm),
  }))
}
