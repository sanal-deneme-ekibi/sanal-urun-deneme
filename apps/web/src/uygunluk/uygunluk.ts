// Uygunluk hesabı — ürünün beden tablosu ile avatarın ulaştığı ölçüleri karşılaştırır.
//
// Birim kuralı (docs/glb-sozlesmesi.md, ml/veri-protokolu.md):
//   Ürün ölçüleri DÜZ SERİLİ GENİŞLİKTİR, vücut ölçüleri ÇEVREDİR.
//   Karşılaştırma: urun_cm × 2 − vucut_cm = pay.
//
// Yalnızca çevre karşılığı olan ölçüler değerlendirilir. Ürünün boyu, kol boyu ve iç bacak
// uzunluğu beden tablosunda var ama `measurements` tablosunda karşılığı yok (kol uzunluğu ve
// bacak uzunluğu toplamıyoruz), bu yüzden bunlar "karşılaştırılamadı" olarak dönüyor.

export type UrunTuru = 'tisort' | 'pantolon' | 'gomlek' | 'elbise' | 'etek'

/** Beden tablosu satırı; sütun adları Supabase'deki `size_charts` ile aynı. Hepsi cm, düz serili. */
export type BedenSatiri = {
  beden: string
  boy_cm?: number | null
  en_cm?: number | null
  kol_cm?: number | null
  bel_cm?: number | null
  kalca_cm?: number | null
  ic_bacak_cm?: number | null
}

/** Avatarın ulaştığı vücut ölçüleri (çevre, cm) — çözücünün `ulasilan` çıktısı. */
export type VucutOlculeri = {
  gogus: number
  bel: number
  kalca: number
}

export type Durum = 'dar' | 'uygun' | 'bol'

export type OlcuDegerlendirmesi = {
  /** Beden tablosundaki sütun adı */
  sutun: 'en_cm' | 'bel_cm' | 'kalca_cm'
  etiket: string
  durum: Durum
  /** Ürün çevresi − vücut çevresi. Eksi değer ürünün dar olduğunu söyler. */
  payCm: number
}

export type UygunlukSonucu = {
  beden: string
  /** En kötü ölçünün durumu: bir yeri dar olan ürün dar sayılır. */
  durum: Durum
  olculer: OlcuDegerlendirmesi[]
  /** Beden tablosunda değeri olmadığı için bakılamayan sütunlar */
  eksikSutunlar: string[]
  /** Vücut karşılığı olmadığı için hiç değerlendirilemeyen sütunlar (boy, kol, iç bacak) */
  karsilastirilamayan: string[]
}

// Pay eşikleri (cm). İlk değerler; gerçek ürünlerle denenip ayarlanacak (#32).
// Pay = ürün çevresi − vücut çevresi.
export const ESIKLER = { dar: 4, bol: 12 } as const

// Türe göre hangi beden tablosu sütunu hangi vücut ölçüsüyle karşılaştırılır.
const KARSILASTIRMALAR: Record<UrunTuru, OlcuDegerlendirmesi['sutun'][]> = {
  tisort: ['en_cm'],
  gomlek: ['en_cm'],
  elbise: ['en_cm', 'bel_cm', 'kalca_cm'],
  pantolon: ['bel_cm', 'kalca_cm'],
  etek: ['bel_cm', 'kalca_cm'],
}

// Türe göre beden tablosunda olması beklenen ama vücut karşılığı bulunmayan sütunlar.
const KARSILIGI_YOK: Record<UrunTuru, string[]> = {
  tisort: ['boy_cm', 'kol_cm'],
  gomlek: ['boy_cm', 'kol_cm'],
  elbise: ['boy_cm', 'kol_cm'],
  pantolon: ['boy_cm', 'ic_bacak_cm'],
  etek: ['boy_cm'],
}

const SUTUN_VUCUT: Record<OlcuDegerlendirmesi['sutun'], keyof VucutOlculeri> = {
  en_cm: 'gogus',
  bel_cm: 'bel',
  kalca_cm: 'kalca',
}

const SUTUN_ETIKET: Record<OlcuDegerlendirmesi['sutun'], string> = {
  en_cm: 'Göğüs',
  bel_cm: 'Bel',
  kalca_cm: 'Kalça',
}

const AGIRLIK: Record<Durum, number> = { dar: 0, uygun: 1, bol: 2 }

export function durumBul(payCm: number): Durum {
  if (payCm < ESIKLER.dar) return 'dar'
  if (payCm > ESIKLER.bol) return 'bol'
  return 'uygun'
}

/** Ürünün düz serili genişliğini vücut çevresiyle karşılaştırılabilir hâle getirir. */
export function cevreyeCevir(duzGenislikCm: number): number {
  return duzGenislikCm * 2
}

export function uygunlukHesapla(tur: UrunTuru, beden: BedenSatiri, vucut: VucutOlculeri): UygunlukSonucu {
  const olculer: OlcuDegerlendirmesi[] = []
  const eksikSutunlar: string[] = []

  for (const sutun of KARSILASTIRMALAR[tur]) {
    const deger = beden[sutun]
    if (deger === undefined || deger === null) {
      eksikSutunlar.push(sutun)
      continue
    }
    const payCm = cevreyeCevir(deger) - vucut[SUTUN_VUCUT[sutun]]
    olculer.push({ sutun, etiket: SUTUN_ETIKET[sutun], durum: durumBul(payCm), payCm })
  }

  // En kötü durum kazanır: bir yeri dar olan ürün dar, hiçbir yeri dar değilse en bolu.
  // Hiç ölçü değerlendirilemediyse "uygun" demek yanıltıcı olurdu; çağıran olculer.length'e bakmalı.
  const durum = olculer.length
    ? olculer.reduce((en, o) => (AGIRLIK[o.durum] < AGIRLIK[en.durum] ? o : en)).durum
    : 'uygun'

  return {
    beden: beden.beden,
    durum,
    olculer,
    eksikSutunlar,
    karsilastirilamayan: KARSILIGI_YOK[tur],
  }
}

/** Beden tablosundaki satırlar arasından en uygun olanı seçer. */
export function enUygunBeden(
  tur: UrunTuru,
  bedenler: BedenSatiri[],
  vucut: VucutOlculeri,
): UygunlukSonucu | null {
  const sonuclar = bedenler.map((b) => uygunlukHesapla(tur, b, vucut)).filter((s) => s.olculer.length > 0)
  if (!sonuclar.length) return null

  // Önce "uygun" olanlar, sonra en küçük toplam sapma. Sapma, payın hedef aralığın ortasından uzaklığı.
  const orta = (ESIKLER.dar + ESIKLER.bol) / 2
  const sapma = (s: UygunlukSonucu) => s.olculer.reduce((t, o) => t + Math.abs(o.payCm - orta), 0) / s.olculer.length

  return sonuclar.reduce((en, s) => {
    const enUygunMu = en.durum === 'uygun'
    const sUygunMu = s.durum === 'uygun'
    if (sUygunMu !== enUygunMu) return sUygunMu ? s : en
    return sapma(s) < sapma(en) ? s : en
  })
}

/** Kullanıcıya gösterilecek kısa cümle: "Göğüs 4 cm dar" gibi. */
export function olcuyuAnlat(o: OlcuDegerlendirmesi): string {
  if (o.durum === 'uygun') return `${o.etiket} uygun`
  const miktar = Math.abs(o.durum === 'dar' ? ESIKLER.dar - o.payCm : o.payCm - ESIKLER.bol)
  return `${o.etiket} ${Math.round(miktar)} cm ${o.durum}`
}
