// Örnek beden tabloları — gerçek ürün verisi gelene kadar paneli denemek için.
//
// Değerler DÜZ SERİLİ GENİŞLİKTİR (cm), yani ürün masaya serilmişken ölçülen en.
// `uygunluk.ts` bunları ikiyle çarpıp vücut çevresiyle karşılaştırır.
//
// Gerçek tablolar Supabase'deki `size_charts` tablosundan gelecek (sütun adları aynı);
// o bağlanınca bu dosya yalnızca "örnek veriyle dene" seçeneği için kalır.

import type { BedenSatiri, UrunTuru } from './uygunluk'

export const ORNEK_BEDENLER: Record<UrunTuru, BedenSatiri[]> = {
  tisort: [
    { beden: 'S', boy_cm: 64, en_cm: 44, kol_cm: 18 },
    { beden: 'M', boy_cm: 67, en_cm: 48, kol_cm: 19 },
    { beden: 'L', boy_cm: 70, en_cm: 52, kol_cm: 20 },
  ],
  gomlek: [
    { beden: 'S', boy_cm: 66, en_cm: 46, kol_cm: 58 },
    { beden: 'M', boy_cm: 69, en_cm: 50, kol_cm: 60 },
    { beden: 'L', boy_cm: 72, en_cm: 54, kol_cm: 62 },
  ],
  elbise: [
    { beden: 'S', boy_cm: 90, en_cm: 42, kol_cm: 18, bel_cm: 36, kalca_cm: 46 },
    { beden: 'M', boy_cm: 93, en_cm: 46, kol_cm: 19, bel_cm: 40, kalca_cm: 50 },
    { beden: 'L', boy_cm: 96, en_cm: 50, kol_cm: 20, bel_cm: 44, kalca_cm: 54 },
  ],
  pantolon: [
    { beden: 'S', boy_cm: 100, bel_cm: 34, kalca_cm: 48, ic_bacak_cm: 76 },
    { beden: 'M', boy_cm: 103, bel_cm: 37, kalca_cm: 51, ic_bacak_cm: 78 },
    { beden: 'L', boy_cm: 106, bel_cm: 40, kalca_cm: 54, ic_bacak_cm: 80 },
  ],
  etek: [
    { beden: 'S', boy_cm: 50, bel_cm: 33, kalca_cm: 47 },
    { beden: 'M', boy_cm: 52, bel_cm: 36, kalca_cm: 50 },
    { beden: 'L', boy_cm: 54, bel_cm: 39, kalca_cm: 53 },
  ],
}

export const TUR_ETIKETLERI: Record<UrunTuru, string> = {
  tisort: 'Tişört',
  gomlek: 'Gömlek',
  elbise: 'Elbise',
  pantolon: 'Pantolon',
  etek: 'Etek',
}

export const TURLER: UrunTuru[] = ['tisort', 'gomlek', 'elbise', 'pantolon', 'etek']

// Panelde düzenlenebilen sütunlar; hangisinin gösterileceği türe göre değişir.
export const SUTUN_ETIKETLERI: Record<keyof Omit<BedenSatiri, 'beden'>, string> = {
  boy_cm: 'Boy',
  en_cm: 'En',
  kol_cm: 'Kol',
  bel_cm: 'Bel',
  kalca_cm: 'Kalça',
  ic_bacak_cm: 'İç bacak',
}
