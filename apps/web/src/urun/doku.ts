// Ürün fotoğrafından tişört şablonunun dokusunu üretir.
//
// Şablonun UV düzeni (docs/glb-sozlesmesi.md, GLB ekseni: 0,0 sol üst):
//   ön    u 0–0,5   v 0–0,73   (u 0 = giyenin sağ yanı, yani karşıdan bakınca sol; v 0 = yaka)
//   arka  u 0,5–1   v 0–0,73   (arkadan bakınca göründüğü gibi)
//   kollar             v 0,75–1
// Düz serili tişört fotoğrafı karşıdan çekildiği için kırpılan gövde ön bölgeye olduğu gibi oturur.

export type Kirpma = { x: number; y: number; w: number; h: number } // 0–1, görsele göre

export const DOKU_BOYUTU = 1024
export const ON_BOLGE = { u0: 0, u1: 0.5, v0: 0, v1: 0.73 }
export const ARKA_BOLGE = { u0: 0.5, u1: 1, v0: 0, v1: 0.73 }

export const VARSAYILAN_KIRPMA: Kirpma = { x: 0.2, y: 0.12, w: 0.6, h: 0.78 }
const EN_KUCUK = 0.05

/** Kırpma dikdörtgenini görselin içinde ve anlamlı boyutta tutar. */
export function kirpmaSinirla(k: Kirpma): Kirpma {
  const w = Math.min(1, Math.max(EN_KUCUK, k.w))
  const h = Math.min(1, Math.max(EN_KUCUK, k.h))
  const x = Math.min(1 - w, Math.max(0, k.x))
  const y = Math.min(1 - h, Math.max(0, k.y))
  return { x, y, w, h }
}

/**
 * Baskın renk: pikseller kanal başına 4 bite indirgenip en kalabalık kutu seçilir, sonra o
 * kutudaki gerçek piksellerin ortalaması alınır. Ortalama renk (bütün piksellerin ortalaması)
 * çizgili bir kumaşta iki rengin karışımı olan, kumaşta hiç olmayan bir renk verirdi.
 * Saydam pikseller sayılmaz. RGBA dizisi (ImageData.data) alır, '#rrggbb' döner.
 */
export function baskinRenk(rgba: ArrayLike<number>): string {
  const sayac = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2]
    const kutu = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const k = sayac.get(kutu)
    if (k) {
      k.n++; k.r += r; k.g += g; k.b += b
    } else sayac.set(kutu, { n: 1, r, g, b })
  }
  let en: { n: number; r: number; g: number; b: number } | null = null
  for (const k of sayac.values()) if (!en || k.n > en.n) en = k
  if (!en) return '#e8e8e8'
  const hex = (v: number) => Math.round(v / en!.n).toString(16).padStart(2, '0')
  return `#${hex(en.r)}${hex(en.g)}${hex(en.b)}`
}

type Bolge = { u0: number; u1: number; v0: number; v1: number }

function bolgeyeCiz(ctx: CanvasRenderingContext2D, gorsel: CanvasImageSource, gw: number, gh: number, k: Kirpma, b: Bolge) {
  const S = ctx.canvas.width
  ctx.drawImage(gorsel, k.x * gw, k.y * gh, k.w * gw, k.h * gh, b.u0 * S, b.v0 * S, (b.u1 - b.u0) * S, (b.v1 - b.v0) * S)
}

/** Dokuyu verilen tuvale çizer. Tuval kare olmalı (DOKU_BOYUTU). */
export function dokuCiz(
  ctx: CanvasRenderingContext2D,
  gorsel: CanvasImageSource,
  gorselBoyut: { w: number; h: number },
  kirpma: Kirpma,
  zeminRengi: string,
  arkaAyni: boolean,
) {
  const S = ctx.canvas.width
  // Önce her yer zemin rengi: arka (desen kopyalanmıyorsa), kollar ve UV adaları arasındaki boşluklar.
  // Boşlukların da renkli olması, mipmap'te dikiş yerlerinde beyaz çizgi çıkmasını önler.
  ctx.fillStyle = zeminRengi
  ctx.fillRect(0, 0, S, S)
  bolgeyeCiz(ctx, gorsel, gorselBoyut.w, gorselBoyut.h, kirpma, ON_BOLGE)
  if (arkaAyni) bolgeyeCiz(ctx, gorsel, gorselBoyut.w, gorselBoyut.h, kirpma, ARKA_BOLGE)
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Kırpılan dikdörtgenin içine kaçan fotoğraf zeminini kumaş rengine boyar.
 * Tişört dikdörtgen değil: omuzlar eğik, yaka oyuk, koltuk altları içeri girer. Bu köşelerde kalan
 * beyaz masa ya da duvar, avatarda gövdenin yanlarında beyaz şeritler olarak görünüyordu.
 *
 * Fotoğrafın kenarından başlayan taşma doldurma (flood fill) kullanılır: yalnızca kenara bağlı ve
 * zemin rengine benzeyen pikseller boyanır. Böylece tişörtün ortasındaki beyaz bir baskı, zeminle
 * aynı renkte olsa bile korunur. Eşik dar tutulur, çünkü zemine çok yakın renkteki çizgiler
 * tişörtün kenarında zemine değiyorsa onlar da boyanır; kullanıcı bunu ekranda kapatabilir.
 * Kaç piksel boyandığını döner.
 */
export function zeminiTemizle(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  zemin: string,
  kumas: string,
  esik = 20,
): number {
  const [zr, zg, zb] = hexRgb(zemin)
  const [kr, kg, kb] = hexRgb(kumas)
  const esik2 = esik * esik
  const benzer = (p: number) => {
    const i = p * 4
    const dr = rgba[i] - zr, dg = rgba[i + 1] - zg, db = rgba[i + 2] - zb
    return dr * dr + dg * dg + db * db <= esik2
  }
  const gorulen = new Uint8Array(w * h)
  const kuyruk = new Int32Array(w * h)
  let bas = 0, son = 0
  const ekle = (p: number) => {
    if (!gorulen[p] && benzer(p)) {
      gorulen[p] = 1
      kuyruk[son++] = p
    }
  }
  for (let x = 0; x < w; x++) {
    ekle(x)
    ekle((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    ekle(y * w)
    ekle(y * w + w - 1)
  }
  const komsular = (p: number, f: (q: number) => void) => {
    const x = p % w
    if (x > 0) f(p - 1)
    if (x < w - 1) f(p + 1)
    if (p >= w) f(p - w)
    if (p < (h - 1) * w) f(p + w)
  }
  while (bas < son) komsular(kuyruk[bas++], ekle)

  // Kenar yumuşatması: tişörtün silüetinde zemin ile kumaş arasındaki geçiş pikselleri (gri hale)
  // zemin rengine benzemez, dolguda kalır ve avatarda tırtıklı açık bir çizgi olarak görünür.
  // Dolguya komşu olup rengi zemin–kumaş doğrusu üzerinde duran pikseller, birkaç halka boyunca
  // dolguya katılır. Baskının kırmızısı gibi bu doğruda olmayan renkler katılmaz; yayılma yalnızca
  // geçiş piksellerinden yürür, tişörtün içindeki düz kumaşa ve oradan baskıya geçmez.
  const dx = kr - zr, dy = kg - zg, dz = kb - zb
  const uzunluk2 = dx * dx + dy * dy + dz * dz
  const karisim = (q: number) => {
    if (uzunluk2 === 0) return false
    const i = q * 4
    const ax = rgba[i] - zr, ay = rgba[i + 1] - zg, az = rgba[i + 2] - zb
    const t = (ax * dx + ay * dy + az * dz) / uzunluk2
    // Zemine çok yakın (t küçük) pikseller açık renk çizgi olabilir, onlara dokunma
    if (t < 0.2 || t > 1) return false
    const ex = ax - t * dx, ey = ay - t * dy, ez = az - t * dz
    return ex * ex + ey * ey + ez * ez <= HALE_ESIGI * HALE_ESIGI
  }
  let halkaBasi = 0
  for (let halka = 0; halka < HALE_HALKASI; halka++) {
    const halkaSonu = son
    for (let j = halkaBasi; j < halkaSonu; j++)
      komsular(kuyruk[j], (q) => {
        if (!gorulen[q] && karisim(q)) {
          gorulen[q] = 1
          kuyruk[son++] = q
        }
      })
    halkaBasi = halkaSonu
  }

  for (let j = 0; j < son; j++) {
    const i = kuyruk[j] * 4
    rgba[i] = kr; rgba[i + 1] = kg; rgba[i + 2] = kb; rgba[i + 3] = 255
  }
  return son
}

const HALE_HALKASI = 4 // piksel; dolgu zeminden en fazla bu kadar içeri girer
const HALE_ESIGI = 36 // zemin–kumaş doğrusuna en fazla uzaklık
