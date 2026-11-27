import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { DOKU_BOYUTU } from './doku'
import { bukerekCiz, dikdortgendenNoktalar, VARSAYILAN_NOKTALAR } from './bukme'
import type { Nokta, NoktaAdi, Noktalar } from './bukme'
import { gorselYukle, zeminiTemizlenmis } from './gorsel'
import type { Urun } from './UrunBaglami'
import type { Model } from '../olcu/kalibrasyon'
import kadinNoktalari from '../../../../assets/models/sablon_tisort_kadin.keypoints.json'
import erkekNoktalari from '../../../../assets/models/sablon_tisort_erkek.keypoints.json'

// Anahtar noktaların şablonun UV'sindeki yeri; kadın ve erkek şablonunda omuz yüksekliği farklı
const SABLON_UV: Record<Model, Record<NoktaAdi, Nokta>> = {
  kadin: kadinNoktalari.uv as Record<NoktaAdi, Nokta>,
  erkek: erkekNoktalari.uv as Record<NoktaAdi, Nokta>,
}

export function urunNoktalari(urun: Pick<Urun, 'noktalar' | 'kirpma'>): Noktalar {
  return urun.noktalar ?? (urun.kirpma ? dikdortgendenNoktalar(urun.kirpma) : VARSAYILAN_NOKTALAR)
}

/** Ürünü, seçili modelin tişört şablonunun UV'sine giydirilmiş bir CanvasTexture'a çevirir. */
export function useUrunDokusu(urun: Urun | null, model: Model): THREE.CanvasTexture | null {
  const [doku, setDoku] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    if (!urun) {
      setDoku(null)
      return
    }
    let iptal = false
    let olusan: THREE.CanvasTexture | null = null
    gorselYukle(urun.foto).then((img) => {
      if (iptal) return
      const kaynak = (urun.zeminTemizle ?? true) ? zeminiTemizlenmis(img, urun.zeminRengi) : img
      const tuval = document.createElement('canvas')
      tuval.width = DOKU_BOYUTU
      tuval.height = DOKU_BOYUTU
      bukerekCiz(
        tuval.getContext('2d')!,
        kaynak,
        { w: img.naturalWidth, h: img.naturalHeight },
        urunNoktalari(urun),
        SABLON_UV[model],
        urun.zeminRengi,
        urun.arkaAyni,
      )
      olusan = new THREE.CanvasTexture(tuval)
      olusan.flipY = false // glTF UV'si sol üstten başlar
      olusan.colorSpace = THREE.SRGBColorSpace
      olusan.anisotropy = 8
      setDoku(olusan)
    })
    return () => {
      iptal = true
      olusan?.dispose()
    }
  }, [urun, model])

  return doku
}
