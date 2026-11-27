// Fotoğrafı 7 anahtar noktaya göre parça parça bükerek tişört şablonunun UV'sine oturtur.
//
// Noktalar (docs/glb-sozlesmesi.md, "Anahtar noktalar"): yaka_orta, omuz_sol, omuz_sag, kol_sol,
// kol_sag, etek_sol, etek_sag. Sol/sağ giyenin solu/sağıdır: karşıdan çekilmiş fotoğrafta
// omuz_sag ekranın SOLUNDA durur.
//
// Aynı 7 nokta 2. dönemde anahtar nokta modelinin çıktısı olacak; o zaman kullanıcı noktaları
// koymak yerine yalnızca düzeltir, bükme aynı kalır.
//
// Yöntem: gövde ve kollar için fotoğrafta ve UV'de aynı parametrelerle (s yatay, t dikey) birer
// ızgara kurulur; her ızgara hücresi iki üçgene bölünür ve her üçgen afin dönüşümle çizilir
// (parça parça afin bükme). Izgara sık olduğu için yaka kavisi gibi eğriler de takip edilir.

export const NOKTA_ADLARI = ['yaka_orta', 'omuz_sol', 'omuz_sag', 'kol_sol', 'kol_sag', 'etek_sol', 'etek_sag'] as const
export type NoktaAdi = (typeof NOKTA_ADLARI)[number]
export type Nokta = [number, number]
export type Noktalar = Record<NoktaAdi, Nokta>

export const NOKTA_ETIKETLERI: Record<NoktaAdi, string> = {
  yaka_orta: 'Yaka',
  omuz_sol: 'Sol omuz',
  omuz_sag: 'Sağ omuz',
  kol_sol: 'Sol kol ucu',
  kol_sag: 'Sağ kol ucu',
  etek_sol: 'Sol etek',
  etek_sag: 'Sağ etek',
}

/** Görsele göre (0–1) başlangıç noktaları: ortada, düz serili bir tişört varsayımı. */
export const VARSAYILAN_NOKTALAR: Noktalar = {
  yaka_orta: [0.5, 0.2],
  omuz_sag: [0.32, 0.2],
  omuz_sol: [0.68, 0.2],
  kol_sag: [0.13, 0.45],
  kol_sol: [0.87, 0.45],
  etek_sag: [0.3, 0.9],
  etek_sol: [0.7, 0.9],
}

/** Eski kayıtlardaki kırpma dikdörtgeninden noktalar (dikdörtgen = omuzdan eteğe gövde). */
export function dikdortgendenNoktalar(k: { x: number; y: number; w: number; h: number }): Noktalar {
  const sag = k.x, sol = k.x + k.w, ust = k.y, alt = k.y + k.h
  const kolY = ust + k.h * 0.3
  return {
    yaka_orta: [(sag + sol) / 2, ust],
    omuz_sag: [sag, ust],
    omuz_sol: [sol, ust],
    kol_sag: [Math.max(0, sag - k.w * 0.3), kolY],
    kol_sol: [Math.min(1, sol + k.w * 0.3), kolY],
    etek_sag: [sag, alt],
    etek_sol: [sol, alt],
  }
}

const ara = (a: Nokta, b: Nokta, t: number): Nokta => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/**
 * Gövdenin parametrik yüzeyi. s: giyenin sağ yanı (0) → sol yanı (1); t: üst kenar (0) → etek (1).
 * Üst kenar sağ omuz → yaka ortası → sol omuz kırık çizgisidir, alt kenar eteğin iki köşesi arası.
 * Aynı fonksiyon hem fotoğraftaki hem UV'deki noktalarla çağrılır.
 */
export function govdeNoktasi(n: Noktalar, s: number, t: number): Nokta {
  const ust = s <= 0.5 ? ara(n.omuz_sag, n.yaka_orta, s * 2) : ara(n.yaka_orta, n.omuz_sol, s * 2 - 1)
  const alt = ara(n.etek_sag, n.etek_sol, s)
  return ara(ust, alt, t)
}

/**
 * Bir kolun önü. Elimizde kolun yalnızca iki noktası var (omuz ve kol ucu), bu yüzden kolun
 * genişliği kol boyuna oranla tahmin edilir. s: kolun üst kenarı (0) → koltuk altı (1),
 * t: omuz (0) → kol ucu (1). Kol ucu noktası manşetin ortasıdır.
 */
export const KOL_GENISLIK_ORANI = 0.75

export function kolDortgeni(omuz: Nokta, kolUcu: Nokta, asagi: Nokta): [Nokta, Nokta, Nokta, Nokta] {
  // asagi: kolun koltuk altı tarafı hangi yöne (gövdenin aşağısına) bakıyor
  const dx = kolUcu[0] - omuz[0], dy = kolUcu[1] - omuz[1]
  const boy = Math.hypot(dx, dy) || 1e-6
  let nx = -dy / boy, ny = dx / boy
  if (nx * asagi[0] + ny * asagi[1] < 0) {
    nx = -nx
    ny = -ny
  }
  const g = boy * KOL_GENISLIK_ORANI
  // Omuz tarafında kolun üst kenarı omuz noktasından başlar; manşette kol ucu ortadadır
  const ustOmuz = omuz
  const altOmuz: Nokta = [omuz[0] + nx * g, omuz[1] + ny * g]
  const ustUc: Nokta = [kolUcu[0] - nx * g * 0.5, kolUcu[1] - ny * g * 0.5]
  const altUc: Nokta = [kolUcu[0] + nx * g * 0.5, kolUcu[1] + ny * g * 0.5]
  return [ustOmuz, altOmuz, ustUc, altUc]
}

export function dortgenNoktasi(d: [Nokta, Nokta, Nokta, Nokta], s: number, t: number): Nokta {
  // d: [üst-omuz, alt-omuz, üst-uç, alt-uç]
  return ara(ara(d[0], d[1], s), ara(d[2], d[3], s), t)
}

export type Ucgen = [Nokta, Nokta, Nokta]
export type UcgenCifti = { kaynak: Ucgen; hedef: Ucgen }

/** İki parametrik yüzey arasında ızgara üçgenleri üretir. */
export function izgara(
  kaynak: (s: number, t: number) => Nokta,
  hedef: (s: number, t: number) => Nokta,
  ns: number,
  nt: number,
): UcgenCifti[] {
  const ciftler: UcgenCifti[] = []
  for (let i = 0; i < ns; i++)
    for (let j = 0; j < nt; j++) {
      const s0 = i / ns, s1 = (i + 1) / ns, t0 = j / nt, t1 = (j + 1) / nt
      const k = [kaynak(s0, t0), kaynak(s1, t0), kaynak(s1, t1), kaynak(s0, t1)]
      const h = [hedef(s0, t0), hedef(s1, t0), hedef(s1, t1), hedef(s0, t1)]
      ciftler.push({ kaynak: [k[0], k[1], k[2]], hedef: [h[0], h[1], h[2]] })
      ciftler.push({ kaynak: [k[0], k[2], k[3]], hedef: [h[0], h[2], h[3]] })
    }
  return ciftler
}

/**
 * Kaynak üçgeni hedef üçgene taşıyan afin matris (canvas setTransform sırası: a, b, c, d, e, f).
 * Dejenere (alanı sıfır) üçgende null.
 */
export function afinMatris(k: Ucgen, h: Ucgen): [number, number, number, number, number, number] | null {
  const [[x0, y0], [x1, y1], [x2, y2]] = k
  const [[u0, v0], [u1, v1], [u2, v2]] = h
  const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
  if (Math.abs(det) < 1e-9) return null
  const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / det
  const c = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / det
  const b = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / det
  const d = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / det
  const e = u0 - a * x0 - c * y0
  const f = v0 - b * x0 - d * y0
  return [a, b, c, d, e, f]
}

/** Üçgeni bir piksel kadar şişirir: komşu üçgenler arasında ince boşluk (dikiş) kalmasın. */
function sisir(u: Ucgen, px: number): Ucgen {
  const cx = (u[0][0] + u[1][0] + u[2][0]) / 3, cy = (u[0][1] + u[1][1] + u[2][1]) / 3
  return u.map(([x, y]) => {
    const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1
    return [x + (dx / l) * px, y + (dy / l) * px] as Nokta
  }) as Ucgen
}

export function ucgenCiz(ctx: CanvasRenderingContext2D, gorsel: CanvasImageSource, c: UcgenCifti) {
  const m = afinMatris(c.kaynak, c.hedef)
  if (!m) return
  const h = sisir(c.hedef, 0.75)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(h[0][0], h[0][1])
  ctx.lineTo(h[1][0], h[1][1])
  ctx.lineTo(h[2][0], h[2][1])
  ctx.closePath()
  ctx.clip()
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5])
  ctx.drawImage(gorsel, 0, 0)
  ctx.restore()
}

type UvNoktalari = Record<NoktaAdi, Nokta>

/**
 * Bütün dokuyu çizer: zemin rengi, gövde önü, kolların önü; arkaAyni ise gövde ve kolların arkası.
 * gorsel piksel boyutunda; noktalar 0–1. Tuval kare (DOKU_BOYUTU).
 */
export function bukerekCiz(
  ctx: CanvasRenderingContext2D,
  gorsel: CanvasImageSource,
  boyut: { w: number; h: number },
  noktalar: Noktalar,
  uv: UvNoktalari,
  zeminRengi: string,
  arkaAyni: boolean,
) {
  const S = ctx.canvas.width
  ctx.fillStyle = zeminRengi
  ctx.fillRect(0, 0, S, S)

  const px = (n: Nokta): Nokta => [n[0] * boyut.w, n[1] * boyut.h]
  const foto = Object.fromEntries(NOKTA_ADLARI.map((a) => [a, px(noktalar[a])])) as Noktalar
  const uvPx = (kaydir: number) =>
    Object.fromEntries(NOKTA_ADLARI.map((a) => [a, [(uv[a][0] + kaydir) * S, uv[a][1] * S]])) as Noktalar

  // Gövde
  const onUv = uvPx(0)
  const parcalar: UcgenCifti[] = izgara((s, t) => govdeNoktasi(foto, s, t), (s, t) => govdeNoktasi(onUv, s, t), 16, 20)
  if (arkaAyni) {
    // Arka, arkadan bakınca göründüğü gibi: giyenin sağ yanı arkada u=1'de, bu yüzden s ters çevrilir
    const arkaUv = uvPx(0.5)
    parcalar.push(...izgara((s, t) => govdeNoktasi(foto, s, t), (s, t) => govdeNoktasi(arkaUv, 1 - s, t), 16, 20))
  }

  // Kollar. UV'de her kol yarım genişlikte bir şerit: u koltuk altı → ön → üst → arka → koltuk altı,
  // v omuzdan (0,75) manşete (1). Ön yarı u 0–0,25 (kolun kendi şeridinde).
  const asagi: Nokta = [0, 1]
  const kollar: { omuz: Nokta; uc: Nokta; u0: number }[] = [
    { omuz: foto.omuz_sag, uc: foto.kol_sag, u0: 0 },
    { omuz: foto.omuz_sol, uc: foto.kol_sol, u0: 0.5 },
  ]
  const KOL_V0 = 0.75, KOL_V1 = 1
  for (const k of kollar) {
    const d = kolDortgeni(k.omuz, k.uc, asagi)
    const kaynak = (s: number, t: number) => dortgenNoktasi(d, s, t)
    // ön: üst kenar (s=0) u0+0,25'te, koltuk altı (s=1) u0'da
    const on = (s: number, t: number): Nokta => [(k.u0 + 0.25 - 0.25 * s) * S, (KOL_V0 + (KOL_V1 - KOL_V0) * t) * S]
    parcalar.push(...izgara(kaynak, on, 6, 8))
    if (arkaAyni) {
      const arka = (s: number, t: number): Nokta => [(k.u0 + 0.25 + 0.25 * s) * S, (KOL_V0 + (KOL_V1 - KOL_V0) * t) * S]
      parcalar.push(...izgara(kaynak, arka, 6, 8))
    }
  }

  for (const p of parcalar) ucgenCiz(ctx, gorsel, p)
}

/** Gövdenin fotoğraftaki sınır kutusu (baskın rengi bulmak için). */
export function govdeKutusu(n: Noktalar): { x: number; y: number; w: number; h: number } {
  const g = [n.omuz_sag, n.omuz_sol, n.etek_sag, n.etek_sol, n.yaka_orta]
  const xs = g.map((p) => p[0]), ys = g.map((p) => p[1])
  const x = Math.max(0, Math.min(...xs)), y = Math.max(0, Math.min(...ys))
  return { x, y, w: Math.max(0.01, Math.min(1, Math.max(...xs)) - x), h: Math.max(0.01, Math.min(1, Math.max(...ys)) - y) }
}
