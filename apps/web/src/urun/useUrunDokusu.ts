import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { DOKU_BOYUTU, ON_BOLGE, dokuCiz } from './doku'
import { gorselYukle, temizKirpma } from './gorsel'
import type { Urun } from './UrunBaglami'

/** Ürünü tişört şablonunun UV'sine giydirilmiş bir CanvasTexture'a çevirir. */
export function useUrunDokusu(urun: Urun | null): THREE.CanvasTexture | null {
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
      const tuval = document.createElement('canvas')
      tuval.width = DOKU_BOYUTU
      tuval.height = DOKU_BOYUTU
      // Gövde, ön bölgenin piksel boyutunda kırpılıp fotoğraf zemini temizlenir; sonra UV'ye çizilir
      const gw = Math.round((ON_BOLGE.u1 - ON_BOLGE.u0) * DOKU_BOYUTU)
      const gh = Math.round((ON_BOLGE.v1 - ON_BOLGE.v0) * DOKU_BOYUTU)
      const govde = temizKirpma(img, urun.kirpma, gw, gh, urun.zeminRengi, urun.zeminTemizle ?? true)
      const tamami = { x: 0, y: 0, w: 1, h: 1 }
      dokuCiz(tuval.getContext('2d')!, govde, { w: gw, h: gh }, tamami, urun.zeminRengi, urun.arkaAyni)
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
  }, [urun])

  return doku
}
