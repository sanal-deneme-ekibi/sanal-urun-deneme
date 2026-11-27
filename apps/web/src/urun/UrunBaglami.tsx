// Kullanıcının denediği ürün (şimdilik tek ürün). Ürün ekle ekranında kaydedilir,
// Kıyafet ekranında avatara giydirilir. Supabase Storage bağlanana kadar bu tarayıcıda saklanır.

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Kirpma } from './doku'
import type { Noktalar } from './bukme'
import type { BedenSatiri } from '../uygunluk/uygunluk'

export type Urun = {
  /** Küçültülmüş fotoğraf (JPEG data URL, en uzun kenar 1600 px) */
  foto: string
  /** Tişörtün 7 anahtar noktası (görsele göre 0–1) */
  noktalar?: Noktalar
  /** Eski kayıtlar: dikdörtgen kırpma (noktalar yoksa bundan türetilir) */
  kirpma?: Kirpma
  /** Arka ve kolların rengi; varsayılanı fotoğrafın baskın rengi */
  zeminRengi: string
  /** Desen arkaya da kopyalansın mı (her yeri desenli kumaşlar için) */
  arkaAyni: boolean
  /** Kırpmaya kaçan fotoğraf zemini kumaş rengine boyansın mı (eski kayıtlarda yok: açık sayılır) */
  zeminTemizle?: boolean
  /** Ürünün beden tablosu (düz serili cm). Eski kayıtlarda yok: örnek tablo kullanılır. */
  bedenler?: BedenSatiri[]
}

const ANAHTAR = 'sanal-urun-deneme.urun.v1'

function oku(): Urun | null {
  try {
    const metin = localStorage.getItem(ANAHTAR)
    return metin ? (JSON.parse(metin) as Urun) : null
  } catch {
    return null
  }
}

function yaz(urun: Urun | null) {
  try {
    if (urun) localStorage.setItem(ANAHTAR, JSON.stringify(urun))
    else localStorage.removeItem(ANAHTAR)
  } catch {
    // Kota dolarsa ürün yalnızca bu oturumda kalır.
  }
}

type Baglam = { urun: Urun | null; urunKaydet: (u: Urun | null) => void }

const UrunBaglami = createContext<Baglam | null>(null)

export function UrunSaglayici({ children }: { children: ReactNode }) {
  const [urun, setUrun] = useState<Urun | null>(oku)
  const urunKaydet = (u: Urun | null) => {
    setUrun(u)
    yaz(u)
  }
  return <UrunBaglami.Provider value={{ urun, urunKaydet }}>{children}</UrunBaglami.Provider>
}

export function useUrun() {
  const b = useContext(UrunBaglami)
  if (!b) throw new Error('useUrun, UrunSaglayici içinde kullanılmalı')
  return b
}
