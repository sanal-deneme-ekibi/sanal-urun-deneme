// Kullanıcının ölçüleri ve avatar modeli bütün ekranlarda ortak.
// Ölçülerim ekranında değişen ölçü, Kıyafet ekranındaki avatara da yansır.
//
// Supabase bağlanana kadar ölçüler yalnızca bu tarayıcıda (localStorage) saklanır.

import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { olcuCozucu } from './cozucu'
import type { CozucuSonucu } from './cozucu'
import { KALIBRASYONLAR } from './kalibrasyon'
import type { HedefOlculer, Model, OlcuAdi } from './kalibrasyon'

type Kayit = { model: Model; olculer: Record<Model, HedefOlculer> }

const VARSAYILAN: Kayit = {
  model: 'kadin',
  olculer: {
    kadin: { boy: 165, gogus: 92, bel: 70, kalca: 96 },
    erkek: { boy: 178, gogus: 100, bel: 86, kalca: 100 },
  },
}

const ANAHTAR = 'sanal-urun-deneme.olculer.v1'

function oku(): Kayit {
  try {
    const metin = localStorage.getItem(ANAHTAR)
    if (!metin) return VARSAYILAN
    const kayit = JSON.parse(metin) as Kayit
    if (!kayit.olculer?.kadin || !kayit.olculer?.erkek) return VARSAYILAN
    return kayit
  } catch {
    return VARSAYILAN
  }
}

function yaz(kayit: Kayit) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(kayit))
  } catch {
    // Gizli sekme vb.: kaydedemezsek de uygulama çalışmaya devam eder.
  }
}

type Baglam = {
  model: Model
  olculer: HedefOlculer
  sonuc: CozucuSonucu
  modelSec: (model: Model) => void
  olcuDegistir: (ad: OlcuAdi, deger: number | undefined) => void
}

const OlcuBaglami = createContext<Baglam | null>(null)

export function OlcuSaglayici({ children }: { children: ReactNode }) {
  const [kayit, setKayit] = useState<Kayit>(oku)

  const guncelle = (yeni: Kayit) => {
    setKayit(yeni)
    yaz(yeni)
  }

  const olculer = kayit.olculer[kayit.model]
  // cm → shape key ağırlıkları; modelin kendi kalibrasyonuyla
  const sonuc = useMemo(() => olcuCozucu(olculer, KALIBRASYONLAR[kayit.model]), [olculer, kayit.model])

  const deger: Baglam = {
    model: kayit.model,
    olculer,
    sonuc,
    modelSec: (model) => guncelle({ ...kayit, model }),
    olcuDegistir: (ad, d) => {
      const yeni = { ...olculer, [ad]: d } as HedefOlculer
      if (d === undefined) delete (yeni as Partial<HedefOlculer>)[ad]
      guncelle({ ...kayit, olculer: { ...kayit.olculer, [kayit.model]: yeni } })
    },
  }

  return <OlcuBaglami.Provider value={deger}>{children}</OlcuBaglami.Provider>
}

export function useOlculer(): Baglam {
  const b = useContext(OlcuBaglami)
  if (!b) throw new Error('useOlculer, OlcuSaglayici içinde kullanılmalı')
  return b
}
