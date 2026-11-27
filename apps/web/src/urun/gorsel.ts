// Tarayıcıdaki görsel yardımcıları (DOM gerektirir; testleri doku.ts'de)

import { baskinRenk, zeminiTemizle } from './doku'
import type { Kirpma } from './doku'

export function gorselYukle(src: string): Promise<HTMLImageElement> {
  return new Promise((coz, reddet) => {
    const img = new Image()
    img.onload = () => coz(img)
    img.onerror = () => reddet(new Error('Görsel açılamadı'))
    img.src = src
  })
}

/** Telefon fotoğrafları 12 MP olabiliyor: saklamadan ve dokuya çizmeden önce küçült. */
export async function dosyayiKucult(dosya: File, enUzun = 1600): Promise<string> {
  const url = URL.createObjectURL(dosya)
  try {
    const img = await gorselYukle(url)
    const olcek = Math.min(1, enUzun / Math.max(img.naturalWidth, img.naturalHeight))
    const tuval = document.createElement('canvas')
    tuval.width = Math.round(img.naturalWidth * olcek)
    tuval.height = Math.round(img.naturalHeight * olcek)
    tuval.getContext('2d')!.drawImage(img, 0, 0, tuval.width, tuval.height)
    return tuval.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Kırpılan bölgenin baskın rengi (64×64'e küçültülmüş örnek üzerinden). */
export function kirpmaRengi(img: HTMLImageElement, k: Kirpma): string {
  const N = 64
  const tuval = document.createElement('canvas')
  tuval.width = N
  tuval.height = N
  const ctx = tuval.getContext('2d', { willReadFrequently: true })!
  const w = img.naturalWidth, h = img.naturalHeight
  ctx.drawImage(img, k.x * w, k.y * h, k.w * w, k.h * h, 0, 0, N, N)
  return baskinRenk(ctx.getImageData(0, 0, N, N).data)
}

/** Fotoğrafın zemin rengi: görselin dış kenarındaki 2 piksellik şeridin baskın rengi. */
export function kenarRengi(img: HTMLImageElement): string {
  const N = 128
  const tuval = document.createElement('canvas')
  tuval.width = N
  tuval.height = N
  const ctx = tuval.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, N, N)
  const d = ctx.getImageData(0, 0, N, N).data
  const kenar: number[] = []
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (x < 2 || y < 2 || x >= N - 2 || y >= N - 2) {
        const i = (y * N + x) * 4
        kenar.push(d[i], d[i + 1], d[i + 2], d[i + 3])
      }
  return baskinRenk(kenar)
}

/**
 * Kırpılan gövdeyi verilen boyutta ayrı bir tuvale çizer. temizle açıksa önce fotoğrafın kenarına
 * bağlı zemin kumaş rengine boyanır (bütün görselde, böylece dolgu kırpmanın kenarından değil
 * fotoğrafın kenarından başlar ve tişörtün içine giren çizgilere daha zor sızar).
 */
export function temizKirpma(
  img: HTMLImageElement,
  k: Kirpma,
  w: number,
  h: number,
  kumasRengi: string,
  temizle: boolean,
): HTMLCanvasElement {
  const gw = img.naturalWidth, gh = img.naturalHeight
  let kaynak: CanvasImageSource = img
  if (temizle) {
    const tam = document.createElement('canvas')
    tam.width = gw
    tam.height = gh
    const c = tam.getContext('2d', { willReadFrequently: true })!
    c.drawImage(img, 0, 0)
    const veri = c.getImageData(0, 0, gw, gh)
    zeminiTemizle(veri.data, gw, gh, kenarRengi(img), kumasRengi)
    c.putImageData(veri, 0, 0)
    kaynak = tam
  }
  const tuval = document.createElement('canvas')
  tuval.width = w
  tuval.height = h
  tuval.getContext('2d')!.drawImage(kaynak, k.x * gw, k.y * gh, k.w * gw, k.h * gh, 0, 0, w, h)
  return tuval
}
