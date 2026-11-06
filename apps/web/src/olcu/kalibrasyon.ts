// Kalibrasyon dosyası biçimi: docs/glb-sozlesmesi.md → "Kalibrasyon dosyası biçimi"
// Ölçü adları Türkçe (boy, gogus, bel, kalca), shape key adları İngilizce (height, chest, waist, hip).
import avatarKadinKalib from '../../../../assets/models/avatar_kadin.calib.json'

export type OlcuAdi = 'boy' | 'gogus' | 'bel' | 'kalca'
export type KeyAdi = 'height' | 'chest' | 'waist' | 'hip'

export type Olculer = Record<OlcuAdi, number> // cm
export type Agirliklar = Record<KeyAdi, number> // 0–1

export type Kalibrasyon = {
  surum: number
  model: string
  keyler: KeyAdi[]
  olcumler: OlcuAdi[]
  taban: Olculer
  etki: Record<KeyAdi, Olculer>
  ornekler?: { agirliklar: Agirliklar; olculen: Olculer }[]
}

// Tuğçe'nin ölçüm betiğinin ürettiği kalibrasyon (assets/models)
export const AVATAR_KALIBRASYON = avatarKadinKalib as Kalibrasyon

export const OLCU_ADLARI: OlcuAdi[] = ['boy', 'gogus', 'bel', 'kalca']
export const KEY_ADLARI: KeyAdi[] = ['height', 'chest', 'waist', 'hip']

// Her ölçüyü en çok etkileyen key (kaydırıcının altında göstermek için)
export const OLCUNUN_KEYI: Record<OlcuAdi, KeyAdi> = {
  boy: 'height',
  gogus: 'chest',
  bel: 'waist',
  kalca: 'hip',
}

export const OLCU_ETIKETLERI: Record<OlcuAdi, string> = {
  boy: 'Boy',
  gogus: 'Göğüs',
  bel: 'Bel',
  kalca: 'Kalça',
}

// Kaydırıcı aralıkları: avatarın değil, gerçek insanların aralığı.
// Avatarın ulaşamadığı ölçülerde çözücü "sınırda" uyarısı verir.
export const KAYDIRICI_ARALIGI: Record<OlcuAdi, { min: number; max: number }> = {
  boy: { min: 140, max: 200 },
  gogus: { min: 70, max: 130 },
  bel: { min: 50, max: 120 },
  kalca: { min: 75, max: 140 },
}