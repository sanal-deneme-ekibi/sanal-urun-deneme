// Kalibrasyon dosyası biçimi: docs/glb-sozlesmesi.md → "Kalibrasyon dosyası biçimi"
// Ölçü adları Türkçe (boy, gogus, bel, kalca, kilo, kol_boyu, ic_bacak), shape key adları İngilizce
// (height, chest, waist, hip, weight, arm_length, leg_length). Hepsi kalibrasyon dosyasındakiyle
// birebir aynı olmalı: eksik bırakılan key hesaba girmez ve avatar hedef ölçüye ulaşamaz.
import avatarKadinKalib from '../../../../assets/models/avatar_kadin.calib.json'

export type OlcuAdi = 'boy' | 'gogus' | 'bel' | 'kalca' | 'kilo' | 'kol_boyu' | 'ic_bacak'
export type KeyAdi = 'height' | 'chest' | 'waist' | 'hip' | 'weight' | 'arm_length' | 'leg_length'

export type Olculer = Record<OlcuAdi, number> // kilo kg, diğerleri cm

// Kullanıcının bilmeyebileceği ölçüler: girilmezse hedefe konmaz, key'leri diğer ölçülerden çözülür
// (measurements tablosunda bu sütunlar boş bırakılabilir).
export const ISTEGE_BAGLI = ['kilo', 'kol_boyu', 'ic_bacak'] as const
type IstegeBagli = (typeof ISTEGE_BAGLI)[number]

export type HedefOlculer = Omit<Olculer, IstegeBagli> & Partial<Pick<Olculer, IstegeBagli>>
export type Agirliklar = Record<KeyAdi, number> // 0–1

export type Kalibrasyon = {
  surum: number
  model: string
  keyler: KeyAdi[]
  olcumler: OlcuAdi[]
  birim: string
  birim_kilo?: string
  taban: Olculer
  etki: Record<KeyAdi, Olculer>
  ornekler?: { agirliklar: Agirliklar; olculen: Olculer }[]
}

// Tuğçe'nin ölçüm betiğinin ürettiği kalibrasyon (assets/models)
export const AVATAR_KALIBRASYON = avatarKadinKalib as Kalibrasyon

export const OLCU_ADLARI: OlcuAdi[] = ['boy', 'gogus', 'bel', 'kalca', 'kilo', 'kol_boyu', 'ic_bacak']
export const KEY_ADLARI: KeyAdi[] = ['height', 'chest', 'waist', 'hip', 'weight', 'arm_length', 'leg_length']

// cm cinsinden olanlar: ortalama hata yalnızca bunlardan hesaplanır, kilo kg olduğu için karışmaz.
export const CM_OLCULERI: OlcuAdi[] = ['boy', 'gogus', 'bel', 'kalca', 'kol_boyu', 'ic_bacak']

// Her ölçüyü en çok etkileyen key (kaydırıcının altında göstermek için)
export const OLCUNUN_KEYI: Record<OlcuAdi, KeyAdi> = {
  boy: 'height',
  gogus: 'chest',
  bel: 'waist',
  kalca: 'hip',
  kilo: 'weight',
  kol_boyu: 'arm_length',
  ic_bacak: 'leg_length',
}

export const OLCU_BIRIMI: Record<OlcuAdi, string> = {
  boy: 'cm',
  gogus: 'cm',
  bel: 'cm',
  kalca: 'cm',
  kilo: 'kg',
  kol_boyu: 'cm',
  ic_bacak: 'cm',
}

export const OLCU_ETIKETLERI: Record<OlcuAdi, string> = {
  boy: 'Boy',
  gogus: 'Göğüs',
  bel: 'Bel',
  kalca: 'Kalça',
  kilo: 'Kilo',
  kol_boyu: 'Kol boyu',
  ic_bacak: 'İç bacak',
}

// Kaydırıcı aralıkları: avatarın değil, gerçek insanların aralığı.
// Avatarın ulaşamadığı ölçülerde çözücü "sınırda" uyarısı verir.
// Kilo kg, diğerleri cm.
export const KAYDIRICI_ARALIGI: Record<OlcuAdi, { min: number; max: number }> = {
  boy: { min: 140, max: 200 },
  gogus: { min: 70, max: 130 },
  bel: { min: 50, max: 120 },
  kalca: { min: 75, max: 140 },
  kilo: { min: 40, max: 150 },
  kol_boyu: { min: 45, max: 75 },
  ic_bacak: { min: 60, max: 95 },
}