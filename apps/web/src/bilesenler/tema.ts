// Tema seçimi: "otomatik" cihazın temasını izler; "koyu" / "acik" kullanıcının seçimidir.
// Seçim <html data-tema="…"> olarak yazılır, CSS tokenları (index.css) buna göre değişir.

export type Tema = 'otomatik' | 'koyu' | 'acik'

const ANAHTAR = 'sanal-urun-deneme.tema'

export function temaOku(): Tema {
  try {
    const t = localStorage.getItem(ANAHTAR)
    return t === 'koyu' || t === 'acik' ? t : 'otomatik'
  } catch {
    return 'otomatik'
  }
}

export function temaUygula(t: Tema) {
  const kok = document.documentElement
  if (t === 'otomatik') kok.removeAttribute('data-tema')
  else kok.setAttribute('data-tema', t)
  try {
    if (t === 'otomatik') localStorage.removeItem(ANAHTAR)
    else localStorage.setItem(ANAHTAR, t)
  } catch {
    // Depolama kapalıysa seçim yalnızca bu oturumda geçerli
  }
}

/** Şu an gerçekte hangi tema görünüyor (otomatikte cihaza bakılır) */
export function gorunenTema(t: Tema): 'koyu' | 'acik' {
  if (t !== 'otomatik') return t
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'acik' : 'koyu'
}
