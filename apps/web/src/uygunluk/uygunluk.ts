// Uygunluk hesabı — ürünün beden tablosu ile avatarın ulaştığı ölçüleri karşılaştırır.
//
// Birim kuralı (docs/glb-sozlesmesi.md, ml/veri-protokolu.md):
//   Ürün ölçüleri DÜZ SERİLİ GENİŞLİKTİR, vücut ölçüleri ÇEVREDİR.
//   Karşılaştırma: urun_cm × 2 − vucut_cm = pay.
//
// Beden seçimi yalnızca çevre ölçüleriyle yapılır (dar / uygun / bol). İç bacak, kullanıcı
// Ölçülerim'de girdiyse ayrıca karşılaştırılır (kısa / uygun / uzun) ama bedeni değiştirmez:
// pantolonda bedeni bel ve kalça belirler, uzunluk paça ya da boy seçeneğiyle çözülür.
// Ürünün boyu ve kol boyunun vücutta karşılığı yok; bunlar "karşılaştırılamadı" olarak döner.

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
  /** Yalnızca kullanıcı iç bacağını girdiyse (isteğe bağlı ölçü); uzunluk, çevre gibi ikiyle çarpılmaz */
  ic_bacak?: number
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

export type UzunlukDurumu = 'kisa' | 'uygun' | 'uzun'

export type UzunlukDegerlendirmesi = {
  sutun: 'ic_bacak_cm'
  etiket: string
  durum: UzunlukDurumu
  /** Ürün uzunluğu − vücut uzunluğu. Eksi değer ürünün kısa olduğunu söyler. */
  farkCm: number
}

export type UygunlukSonucu = {
  beden: string
  /** En kötü ölçünün durumu: bir yeri dar olan ürün dar sayılır. */
  durum: Durum
  olculer: OlcuDegerlendirmesi[]
  /** Bilgi amaçlı uzunluk karşılaştırmaları; `durum`a ve beden seçimine girmez */
  uzunluklar: UzunlukDegerlendirmesi[]
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

// İç bacak farkı eşikleri (cm, ürün − vücut). Pantolon iç bacağı genelde vücuttan biraz uzun
// tutulur (ayakkabı, paça kırığı). İlk değerler; gerçek ürünlerle ayarlanacak (#32).
export const UZUNLUK_ESIKLERI = { kisa: -3, uzun: 5 } as const

// Türe göre bakılan uzunluk sütunları
const UZUNLUK_KARSILASTIRMALARI: Partial<Record<UrunTuru, UzunlukDegerlendirmesi['sutun'][]>> = {
  pantolon: ['ic_bacak_cm'],
}

export function uzunlukDurumu(farkCm: number): UzunlukDurumu {
  if (farkCm < UZUNLUK_ESIKLERI.kisa - TOLERANS_CM) return 'kisa'
  if (farkCm > UZUNLUK_ESIKLERI.uzun + TOLERANS_CM) return 'uzun'
  return 'uygun'
}

const SUTUN_VUCUT: Record<OlcuDegerlendirmesi['sutun'], 'gogus' | 'bel' | 'kalca'> = {
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

// Eşiğe tam oturan paylar kayan nokta gürültüsüne kurban gitmesin diye küçük bir tolerans.
// Çözücü 92 cm hedefi için 91,9999999 üretebiliyor; pay 3,9999999 çıkıp eşiğin altına düşünce
// kullanıcı sebepsiz yere bir üst bedene yönlendiriliyordu. Tolerans mm'nin binde biri
// mertebesinde, gerçek bir ölçü farkını yutmaz.
const TOLERANS_CM = 1e-6

export function durumBul(payCm: number): Durum {
  if (payCm < ESIKLER.dar - TOLERANS_CM) return 'dar'
  if (payCm > ESIKLER.bol + TOLERANS_CM) return 'bol'
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

  // Uzunluk: vücut ölçüsü yoksa (kullanıcı girmediyse) karşılaştırılamayanlar listesinde kalır
  const uzunluklar: UzunlukDegerlendirmesi[] = []
  const karsilastirilamayan = [...KARSILIGI_YOK[tur]]
  const icBacak = vucut.ic_bacak
  if (icBacak !== undefined) {
    for (const sutun of UZUNLUK_KARSILASTIRMALARI[tur] ?? []) {
      karsilastirilamayan.splice(karsilastirilamayan.indexOf(sutun), 1)
      const deger = beden[sutun]
      if (deger === undefined || deger === null) {
        eksikSutunlar.push(sutun)
        continue
      }
      const farkCm = deger - icBacak
      uzunluklar.push({ sutun, etiket: 'İç bacak', durum: uzunlukDurumu(farkCm), farkCm })
    }
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
    uzunluklar,
    eksikSutunlar,
    karsilastirilamayan,
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

  // Beraberlikte tabloda önce gelen beden kazanır. İki beden ortadan eşit uzaklıktaysa
  // (ör. payları 4 ve 12 cm, orta 8) karşılaştırmayı kayan nokta gürültüsüne bırakmak
  // kullanıcıya bir gün M bir gün L göstermek demek; küçük bedeni seçmek hem kararlı
  // hem de giyimde daha beklenen davranış. Tablolar küçükten büyüğe sıralı varsayılır.
  return sonuclar.reduce((en, s) => {
    const enUygunMu = en.durum === 'uygun'
    const sUygunMu = s.durum === 'uygun'
    if (sUygunMu !== enUygunMu) return sUygunMu ? s : en
    return sapma(s) < sapma(en) - TOLERANS_CM ? s : en
  })
}

const UZUNLUK_ADI: Record<Exclude<UzunlukDurumu, 'uygun'>, string> = { kisa: 'kısa', uzun: 'uzun' }

/** "İç bacak 3 cm kısa" gibi; fark eşiğin ötesindeki kısımdır, çevre ölçüleriyle aynı mantık. */
export function uzunluguAnlat(u: UzunlukDegerlendirmesi): string {
  if (u.durum === 'uygun') return `${u.etiket} uygun`
  const miktar = Math.abs(u.durum === 'kisa' ? UZUNLUK_ESIKLERI.kisa - u.farkCm : u.farkCm - UZUNLUK_ESIKLERI.uzun)
  return `${u.etiket} ${Math.max(1, Math.round(miktar))} cm ${UZUNLUK_ADI[u.durum]}`
}

/** Kullanıcıya gösterilecek kısa cümle: "Göğüs 4 cm dar" gibi. */
export function olcuyuAnlat(o: OlcuDegerlendirmesi): string {
  if (o.durum === 'uygun') return `${o.etiket} uygun`
  const miktar = Math.abs(o.durum === 'dar' ? ESIKLER.dar - o.payCm : o.payCm - ESIKLER.bol)
  return `${o.etiket} ${Math.round(miktar)} cm ${o.durum}`
}
