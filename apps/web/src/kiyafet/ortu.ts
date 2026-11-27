// Kıyafetin altında kalan ten. Avatarın bazı yerleri (özellikle omuz başı) şablonun içinden
// dışarı taşıyor; kumaşı vücuttan uzağa itmek omuzları köşeli ve şişkin gösteriyordu.
// Bunun yerine avatarın kıyafetle örtülen köşeleri biraz içeri çekilir: dışarıdan görünmezler,
// kumaş da vücuda yakın kalır.
//
// Bir avatar köşesi şöyle "örtülü" sayılır: köşeden dışa doğru (normal yönünde) atılan kısa bir
// ışın kıyafetin bir üçgenine çarpıyorsa. Işın vücudun biraz içinden başlar, böylece kumaşın
// zaten vücudun içine girdiği yerler de bulunur. Hesap bir kez, iki modelin dinlenme halinde
// yapılır; kıyafet vücut key'lerini avatarla birlikte taşıdığı için örtü ilişkisi korunur.

type V3 = [number, number, number]

export const ISIN_GERI_M = 0.03 // ışın vücudun bu kadar içinden başlar
export const ISIN_BOYU_M = 0.08 // vücuttan bu kadar uzaktaki kumaş da örter (uzun tutulunca çeneden atılan ışın yakaya çarpıyordu)
const HUCRE_M = 0.05

function ucgenKesisir(o: V3, d: V3, a: V3, b: V3, c: V3, tMax: number): boolean {
  // Möller–Trumbore
  const e1: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const e2: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const p: V3 = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]]
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2]
  if (Math.abs(det) < 1e-12) return false
  const inv = 1 / det
  const s: V3 = [o[0] - a[0], o[1] - a[1], o[2] - a[2]]
  const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv
  const E = 1e-6 // iki üçgenin ortak kenarına tam denk gelen ışın kaçmasın
  if (u < -E || u > 1 + E) return false
  const q: V3 = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]]
  const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv
  if (v < -E || u + v > 1 + E) return false
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv
  return t >= 0 && t <= tMax
}

const anahtar = (x: number, y: number, z: number) => `${x},${y},${z}`
const hucre = (v: number) => Math.floor(v / HUCRE_M)

/**
 * avatarKonum/avatarNormal: avatarın köşe konumları ve normalleri (xyz dizisi).
 * kiyafetKonum + kiyafetIndeks: kıyafetin üçgenleri (indeks yoksa sıralı üçlüler).
 * Her avatar köşesi için 1 (örtülü) veya 0 döner.
 */
export function ortuluKoseler(
  avatarKonum: ArrayLike<number>,
  avatarNormal: ArrayLike<number>,
  kiyafetKonum: ArrayLike<number>,
  kiyafetIndeks: ArrayLike<number> | null,
): Float32Array {
  const ucgenSayisi = kiyafetIndeks ? kiyafetIndeks.length / 3 : kiyafetKonum.length / 9
  const kose = (i: number): V3 => [kiyafetKonum[i * 3], kiyafetKonum[i * 3 + 1], kiyafetKonum[i * 3 + 2]]
  const ucgenler: [V3, V3, V3][] = []
  for (let t = 0; t < ucgenSayisi; t++) {
    const i0 = kiyafetIndeks ? kiyafetIndeks[t * 3] : t * 3
    const i1 = kiyafetIndeks ? kiyafetIndeks[t * 3 + 1] : t * 3 + 1
    const i2 = kiyafetIndeks ? kiyafetIndeks[t * 3 + 2] : t * 3 + 2
    ucgenler.push([kose(i0), kose(i1), kose(i2)])
  }

  // Üçgenleri, sınır kutularının değdiği ızgara hücrelerine dağıt
  const izgara = new Map<string, number[]>()
  ucgenler.forEach(([a, b, c], t) => {
    const lo = [0, 1, 2].map((k) => hucre(Math.min(a[k], b[k], c[k])))
    const hi = [0, 1, 2].map((k) => hucre(Math.max(a[k], b[k], c[k])))
    for (let x = lo[0]; x <= hi[0]; x++)
      for (let y = lo[1]; y <= hi[1]; y++)
        for (let z = lo[2]; z <= hi[2]; z++) {
          const k = anahtar(x, y, z)
          const l = izgara.get(k)
          if (l) l.push(t)
          else izgara.set(k, [t])
        }
  })

  const n = avatarKonum.length / 3
  const sonuc = new Float32Array(n)
  const tMax = ISIN_GERI_M + ISIN_BOYU_M
  const adim = HUCRE_M / 2
  for (let i = 0; i < n; i++) {
    let dx = avatarNormal[i * 3], dy = avatarNormal[i * 3 + 1], dz = avatarNormal[i * 3 + 2]
    const l = Math.hypot(dx, dy, dz) || 1
    dx /= l; dy /= l; dz /= l
    const o: V3 = [avatarKonum[i * 3] - dx * ISIN_GERI_M, avatarKonum[i * 3 + 1] - dy * ISIN_GERI_M, avatarKonum[i * 3 + 2] - dz * ISIN_GERI_M]
    const d: V3 = [dx, dy, dz]
    const denenen = new Set<number>()
    let carpti = false
    for (let s = 0; s <= tMax + 1e-9 && !carpti; s += adim) {
      const k = anahtar(hucre(o[0] + dx * s), hucre(o[1] + dy * s), hucre(o[2] + dz * s))
      for (const t of izgara.get(k) ?? []) {
        if (denenen.has(t)) continue
        denenen.add(t)
        const [a, b, c] = ucgenler[t]
        if (ucgenKesisir(o, d, a, b, c, tMax)) {
          carpti = true
          break
        }
      }
    }
    sonuc[i] = carpti ? 1 : 0
  }
  return sonuc
}

/**
 * Kıyafetin açık kenar döngüleri (etek, yaka, kol uçları...). Köşeler konuma göre birleştirilir,
 * çünkü UV dikişlerinde aynı noktada birden çok köşe olur.
 */
export function acikKenarlar(konum: ArrayLike<number>, indeks: ArrayLike<number>): V3[][] {
  const id = new Map<string, number>()
  const kid: number[] = []
  const yer: V3[] = []
  for (let i = 0; i < konum.length / 3; i++) {
    const p: V3 = [konum[i * 3], konum[i * 3 + 1], konum[i * 3 + 2]]
    const k = p.map((v) => Math.round(v * 1e4)).join(',')
    if (!id.has(k)) {
      id.set(k, id.size)
      yer.push(p)
    }
    kid.push(id.get(k)!)
  }
  const kenar = new Map<string, number>()
  for (let t = 0; t < indeks.length; t += 3)
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const u = kid[indeks[t + a]], v = kid[indeks[t + b]]
      const k = u < v ? `${u}_${v}` : `${v}_${u}`
      kenar.set(k, (kenar.get(k) ?? 0) + 1)
    }
  const komsu = new Map<number, number[]>()
  for (const [k, n] of kenar) {
    if (n !== 1) continue
    const [u, v] = k.split('_').map(Number)
    komsu.set(u, [...(komsu.get(u) ?? []), v])
    komsu.set(v, [...(komsu.get(v) ?? []), u])
  }
  const gorulen = new Set<number>()
  const donguler: V3[][] = []
  for (const bas of komsu.keys()) {
    if (gorulen.has(bas)) continue
    const dongu: V3[] = []
    const yigin = [bas]
    while (yigin.length) {
      const x = yigin.pop()!
      if (gorulen.has(x)) continue
      gorulen.add(x)
      dongu.push(yer[x])
      yigin.push(...(komsu.get(x) ?? []))
    }
    donguler.push(dongu)
  }
  return donguler
}

/**
 * Tişört şablonunda kollar gövdeye dikili değil: her kol iki ucu açık bir boru, iç ucu omuzda
 * gövdenin üstüne biniyor. Kolun üstüyle gövde arasında kalan aralıktan omuz başının teni görünüyor.
 * Bu ten kumaşla örtülü olmadığı için ışın testi onu bulamaz; bu yüzden omuz bölgesi şablonun
 * kendi açık kenarlarından çıkarılan bir kutuyla işaretlenir:
 *   yükseklik: kolun iç ucunun altından yakanın biraz üstüne kadar,
 *   yanlar: yakanın kenarından kolun dış ucuna (manşet) kadar.
 * Etek ve yaka en büyük iki döngüdür (yaka yukarıdaki); geri kalanlar kol uçlarıdır.
 */
export type OmuzKutusu = { yAlt: number; yUst: number; xIc: number; xDis: number }

export function omuzKutusu(donguler: V3[][]): OmuzKutusu | null {
  if (donguler.length < 4) return null
  const sirali = [...donguler].sort((a, b) => b.length - a.length)
  const ortaY = (d: V3[]) => d.reduce((t, p) => t + p[1], 0) / d.length
  const [d1, d2] = sirali
  const yaka = ortaY(d1) > ortaY(d2) ? d1 : d2
  const kollar = sirali.slice(2)
  const ortaX = (d: V3[]) => Math.abs(d.reduce((t, p) => t + p[0], 0) / d.length)
  const enYakin = Math.min(...kollar.map(ortaX))
  const icUclar = kollar.filter((d) => ortaX(d) - enYakin < 0.03)
  const disUclar = kollar.filter((d) => !icUclar.includes(d))
  if (!icUclar.length || !disUclar.length) return null
  const ys = icUclar.flat().map((p) => p[1])
  return {
    yAlt: Math.min(...ys) - 0.02,
    yUst: Math.max(...yaka.map((p) => p[1])) + 0.03,
    xIc: Math.max(...yaka.map((p) => Math.abs(p[0]))) + 0.01,
    xDis: Math.min(...disUclar.flat().map((p) => Math.abs(p[0]))),
  }
}

/** Omuz kutusundaki avatar köşelerini 2 ile işaretler: hem içeri çekilir hem kumaş rengine boyanır. */
export function omuzuIsaretle(ortu: Float32Array, avatarKonum: ArrayLike<number>, k: OmuzKutusu): Float32Array {
  for (let i = 0; i < ortu.length; i++) {
    const ax = Math.abs(avatarKonum[i * 3]), y = avatarKonum[i * 3 + 1]
    if (y >= k.yAlt && y <= k.yUst && ax >= k.xIc && ax <= k.xDis) ortu[i] = 2
  }
  return ortu
}
