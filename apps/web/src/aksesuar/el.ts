// El noktalarından yüzüğün ekrandaki yeri, yönü ve boyutu.
//
// MediaPipe Hand Landmarker her el için 21 nokta verir (görüntüye göre 0–1; z derinlik, bileğe
// göre, x ile aynı ölçekte). Yüzük parmağının noktaları:
//   13 = parmağın köküdeki eklem (MCP), 14 = ilk orta eklem (PIP), 15, 16 = uç
// Yüzük 13 ile 14 arasına, köke yakın oturur. Komşu parmak kökleri (9 = orta parmak, 17 = serçe)
// arasındaki uzaklık parmak genişliği için ölçek verir.
//
// Bütün hesap ekran pikselinde yapılır: x sağa, y yukarı, z kameraya doğru (three.js ile aynı).

export type ElNoktasi = { x: number; y: number; z: number }
export type V3 = [number, number, number]

export const YUZUK_PARMAGI = { kok: 13, eklem: 14 } as const
export const KOMSU_KOKLER = { orta: 9, serce: 17 } as const
/** Yüzüğün kökten ilk ekleme doğru ne kadar ilerde durduğu (0 = kök, 1 = eklem) */
export const YUZUK_YERI = 0.38
/** Komşu parmak kökleri arası uzaklık → parmak genişliği */
export const GENISLIK_ORANI = 0.82

/**
 * Video ekranda `object-fit: cover` ile gösterildiğinde, videonun 0–1 koordinatını ekran pikseline
 * çevirir (orta nokta 0,0; y yukarı). `ayna`: ön kamerada görüntü aynalanır, x de aynalanmalı.
 */
export function ekranaCevir(
  n: ElNoktasi,
  video: { w: number; h: number },
  kutu: { w: number; h: number },
  ayna: boolean,
): V3 {
  const olcek = Math.max(kutu.w / video.w, kutu.h / video.h)
  const gw = video.w * olcek
  const gh = video.h * olcek
  const x = (ayna ? 1 - n.x : n.x) * gw - gw / 2
  const y = gh / 2 - n.y * gh
  // z, x ile aynı ölçekte ve kameraya yaklaştıkça küçülür
  const z = -n.z * gw
  return [x, y, z]
}

const fark = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const topla = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const nokta = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const capraz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const boy = (a: V3) => Math.hypot(a[0], a[1], a[2])
const birim = (a: V3): V3 => {
  const l = boy(a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const duzlemde = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1])

export type YuzukDurusu = {
  /** Yüzüğün merkezi (ekran pikseli) */
  merkez: V3
  /** Parmağın yönü: yüzüğün ekseni bu yöne bakar */
  eksen: V3
  /** Yüzüğün taşının baktığı yön: elin üstü, kameraya dönük taraf */
  ust: V3
  /** Parmak genişliği (ekran pikseli) */
  genislikPx: number
}

/** 21 el noktasından yüzüğün duruşu. Noktalar ekran pikseline çevrilmiş olmalı. */
export function yuzukDurusu(p: V3[]): YuzukDurusu {
  const kok = p[YUZUK_PARMAGI.kok]
  const eklem = p[YUZUK_PARMAGI.eklem]
  const eksen = birim(fark(eklem, kok))
  const merkez = topla(kok, fark(eklem, kok), YUZUK_YERI)

  // Avuç düzleminin normali: bilek (0), işaret kökü (5), serçe kökü (17)
  let normal = birim(capraz(fark(p[5], p[0]), fark(p[17], p[0])))
  // Taş her zaman izleyiciye dönük tarafta olsun (sağ/sol el ve ayna farkını böyle çözüyoruz)
  if (normal[2] < 0) normal = [-normal[0], -normal[1], -normal[2]]
  // Eksene dik bileşen
  let ust = fark(normal, [eksen[0] * nokta(normal, eksen), eksen[1] * nokta(normal, eksen), eksen[2] * nokta(normal, eksen)])
  if (boy(ust) < 1e-6) ust = [0, 0, 1]
  ust = birim(ust)

  const genislikPx =
    ((duzlemde(kok, p[KOMSU_KOKLER.orta]) + duzlemde(kok, p[KOMSU_KOKLER.serce])) / 2) * GENISLIK_ORANI
  return { merkez, eksen, ust, genislikPx }
}

/**
 * Parmak genişliği tahmini (mm). MediaPipe'ın "dünya" noktaları metre cinsindendir ama ortalama bir
 * el boyuna göre ölçeklenir; gerçek ölçüm değildir. Yalnızca yaklaşık değer olarak gösterilir.
 */
export function parmakGenisligiMm(dunya: ElNoktasi[]): number {
  const d = (a: ElNoktasi, b: ElNoktasi) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
  const kok = dunya[YUZUK_PARMAGI.kok]
  const ort = (d(kok, dunya[KOMSU_KOKLER.orta]) + d(kok, dunya[KOMSU_KOKLER.serce])) / 2
  return ort * 1000 * GENISLIK_ORANI
}
