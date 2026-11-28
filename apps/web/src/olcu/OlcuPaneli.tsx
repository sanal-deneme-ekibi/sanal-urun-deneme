import { useState } from 'react'
import { ISTEGE_BAGLI, KAYDIRICI_ARALIGI, OLCU_ADLARI, OLCU_BIRIMI, OLCU_ETIKETLERI, OLCUNUN_KEYI } from './kalibrasyon'
import type { HedefOlculer, OlcuAdi } from './kalibrasyon'
import type { CozucuSonucu } from './cozucu'

type Props = {
  olculer: HedefOlculer
  sonuc: CozucuSonucu
  /** undefined: isteğe bağlı ölçü kaldırıldı */
  degisti: (ad: OlcuAdi, deger: number | undefined) => void
}

// Bu farkın altındaki sapmalar gözle görülmez; uyarı göstermiyoruz.
// Kilo doğrusal değil (hacim ≈ boy × çevre²), eşiği sözleşmeyle aynı: 4 kg.
const UYARI_ESIGI: Record<OlcuAdi, number> = { boy: 1, gogus: 1, bel: 1, kalca: 1, kilo: 4, kol_boyu: 1, ic_bacak: 1 }

const ISTEGE_BAGLI_ADLAR: readonly OlcuAdi[] = ISTEGE_BAGLI
const ZORUNLU_ADLAR = OLCU_ADLARI.filter((ad) => !ISTEGE_BAGLI_ADLAR.includes(ad))

// İsteğe bağlı ölçülerin nasıl alınacağı. Kol boyu ve iç bacak en sık yanlış ölçülenler.
const OLCUM_IPUCU: Partial<Record<OlcuAdi, string>> = {
  kilo: 'Tartıdaki kilon. Avatar çevre ölçülerinden kurulur; kilo yalnızca ince ayar yapar.',
  kol_boyu: 'Kol yanda, hafif bükük: omuz başındaki kemik çıkıntısından bilek kemiğine kadar.',
  ic_bacak: 'Ayakkabısız, dik dururken kasıktan yere kadar. Pantolon tablolarındaki iç bacakla aynı ölçü.',
}

const ikincilDugme = {
  fontSize: 13,
  padding: '4px 10px',
  borderRadius: 8,
  border: '1px solid var(--cizgi)',
  background: 'var(--kart)',
  color: 'var(--metin)',
  cursor: 'pointer',
} as const

export default function OlcuPaneli({ olculer, sonuc, degisti }: Props) {
  const [teknik, setTeknik] = useState(false)

  const satir = (ad: OlcuAdi, deger: number, kaldirilabilir: boolean) => {
    const { min, max } = KAYDIRICI_ARALIGI[ad]
    const birim = OLCU_BIRIMI[ad]
    const key = OLCUNUN_KEYI[ad]
    const gosterilemiyor = Math.abs(sonuc.fark[ad]) >= UYARI_ESIGI[ad]
    return (
      <div key={ad} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <label htmlFor={`olcu-${ad}`}>{OLCU_ETIKETLERI[ad]}</label>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <b>
              {deger} {birim}
            </b>
            {kaldirilabilir && (
              <button type="button" style={ikincilDugme} onClick={() => degisti(ad, undefined)}>
                Kaldır
              </button>
            )}
          </span>
        </span>
        <input
          id={`olcu-${ad}`}
          type="range"
          min={min}
          max={max}
          step={1}
          value={deger}
          onChange={(e) => degisti(ad, Number(e.target.value))}
        />
        {gosterilemiyor && (
          <span
            role="status"
            style={{
              fontSize: 13,
              lineHeight: 1.4,
              color: 'var(--bol)',
              background: 'var(--bol-zemin)',
              border: '1px solid var(--bol-cizgi)',
              borderRadius: 8,
              padding: '6px 10px',
            }}
          >
            Avatar bu ölçüyü tam gösteremiyor: {deger} {birim} yerine{' '}
            <b>
              {Math.round(sonuc.ulasilan[ad])} {birim}
            </b>{' '}
            görünüyor.
          </span>
        )}
        {teknik && (
          <small style={{ color: 'var(--soluk)', fontFamily: 'var(--mono)' }}>
            {key} = {sonuc.agirliklar[key].toFixed(2)} · avatar {sonuc.ulasilan[ad].toFixed(1)} {birim}
          </small>
        )}
      </div>
    )
  }

  // Eklenen ölçü, avatarın o an zaten gösterdiği değerden başlar: avatar eklerken zıplamaz.
  const ekle = (ad: OlcuAdi) => {
    const { min, max } = KAYDIRICI_ARALIGI[ad]
    degisti(ad, Math.min(max, Math.max(min, Math.round(sonuc.ulasilan[ad]))))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Ölçülerim</h2>

      {ZORUNLU_ADLAR.map((ad) => satir(ad, olculer[ad as keyof HedefOlculer] as number, false))}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--cizgi)', paddingTop: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>İsteğe bağlı ölçüler</h3>
          <small style={{ color: 'var(--soluk)', lineHeight: 1.5 }}>
            Bilmiyorsan boş bırak; avatar bunları diğer ölçülerinden tahmin eder. Girersen avatar sana daha çok benzer.
          </small>
        </div>
        {ISTEGE_BAGLI_ADLAR.map((ad) => {
          const deger = olculer[ad as keyof HedefOlculer]
          return (
            <div key={ad} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {deger !== undefined ? (
                satir(ad, deger, true)
              ) : (
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--metin)' }}>{OLCU_ETIKETLERI[ad]}</span>
                  <button type="button" style={ikincilDugme} onClick={() => ekle(ad)}>
                    Ekle
                  </button>
                </span>
              )}
              <small style={{ color: 'var(--soluk)', lineHeight: 1.4 }}>{OLCUM_IPUCU[ad]}</small>
            </div>
          )
        })}
      </section>

      <div style={{ borderTop: '1px solid var(--cizgi)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--metin)' }}>
          <input type="checkbox" checked={teknik} onChange={(e) => setTeknik(e.target.checked)} />
          Teknik ayrıntılar
        </label>
        {teknik && (
          <small style={{ color: 'var(--soluk)', lineHeight: 1.5 }}>
            Kaydırıcıdaki cm değerleri ölçü çözücüyle shape key ağırlıklarına (0–1) çevrilir. Bütün ölçüler
            birlikte çözülür. Ortalama sapma: <b>{sonuc.ortalamaHataCm.toFixed(1)} cm</b>
            {sonuc.sinirda.length > 0 && <> · sınıra dayanan key'ler: {sonuc.sinirda.join(', ')}</>}
          </small>
        )}
      </div>
    </div>
  )
}
