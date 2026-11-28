// Beden önerisi paneli — uygunluk.ts'i ekrana bağlar.
//
// Vücut ölçüsü olarak kullanıcının yazdığı hedef değil, avatarın ULAŞTIĞI ölçü kullanılır
// (`sonuc.ulasilan`): kullanıcı avatarda ne görüyorsa beden önerisi de ona göre çıkmalı.

import { useMemo, useState } from 'react'
import { enUygunBeden, olcuyuAnlat, uygunlukHesapla, uzunluguAnlat } from './uygunluk'
import type { BedenSatiri, Durum, UrunTuru, VucutOlculeri } from './uygunluk'
import { ORNEK_BEDENLER, SUTUN_ETIKETLERI, TUR_ETIKETLERI, TURLER } from './ornekBedenler'

type Props = { vucut: VucutOlculeri }

const RENK: Record<Durum, { yazi: string; zemin: string; cerceve: string; etiket: string }> = {
  dar: { yazi: 'var(--dar)', zemin: 'var(--dar-zemin)', cerceve: 'var(--dar-cizgi)', etiket: 'Dar' },
  uygun: { yazi: 'var(--uygun)', zemin: 'var(--uygun-zemin)', cerceve: 'var(--uygun-cizgi)', etiket: 'Uygun' },
  bol: { yazi: 'var(--bol)', zemin: 'var(--bol-zemin)', cerceve: 'var(--bol-cizgi)', etiket: 'Bol' },
}

/** Türe göre tabloda gösterilecek sütunlar: o türün satırlarında dolu olanlar. */
function sutunlariBul(satirlar: BedenSatiri[]): (keyof Omit<BedenSatiri, 'beden'>)[] {
  const adaylar = Object.keys(SUTUN_ETIKETLERI) as (keyof Omit<BedenSatiri, 'beden'>)[]
  return adaylar.filter((s) => satirlar.some((r) => r[s] !== undefined && r[s] !== null))
}

export default function UygunlukPaneli({ vucut }: Props) {
  const [tur, setTur] = useState<UrunTuru>('tisort')
  // Tablo düzenlenebilir: hoca ya da ekip "şu ürünün tablosunu girsek ne olur" diye deneyebilsin.
  const [tablolar, setTablolar] = useState<Record<UrunTuru, BedenSatiri[]>>(() =>
    structuredClone(ORNEK_BEDENLER),
  )

  const satirlar = tablolar[tur]
  const sutunlar = useMemo(() => sutunlariBul(satirlar), [satirlar])
  const sonuclar = useMemo(() => satirlar.map((s) => uygunlukHesapla(tur, s, vucut)), [tur, satirlar, vucut])
  const oneri = useMemo(() => enUygunBeden(tur, satirlar, vucut), [tur, satirlar, vucut])
  const bakilamayan = sonuclar[0]?.karsilastirilamayan ?? []

  function degistir(sira: number, sutun: keyof Omit<BedenSatiri, 'beden'>, deger: string) {
    setTablolar((eski) => {
      const yeni = structuredClone(eski)
      yeni[tur][sira][sutun] = deger === '' ? null : Number(deger)
      return yeni
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 20,
        borderTop: '1px solid var(--cizgi)',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 20 }}>Beden önerisi</h2>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 14, color: 'var(--metin)' }}>Ürün türü</span>
        <select
          value={tur}
          onChange={(e) => setTur(e.target.value as UrunTuru)}
          style={{ padding: '6px 8px', fontSize: 15, borderRadius: 8, border: '1px solid var(--cizgi)' }}
        >
          {TURLER.map((t) => (
            <option key={t} value={t}>
              {TUR_ETIKETLERI[t]}
            </option>
          ))}
        </select>
      </label>

      {oneri ? (
        <div
          role="status"
          style={{
            background: RENK[oneri.durum].zemin,
            border: `1px solid ${RENK[oneri.durum].cerceve}`,
            color: RENK[oneri.durum].yazi,
            borderRadius: 10,
            padding: '10px 12px',
            lineHeight: 1.5,
          }}
        >
          Size <b>{oneri.beden}</b> bedeni öneriyoruz
          {oneri.durum !== 'uygun' && <> — ama {oneri.durum === 'dar' ? 'dar' : 'bol'} gelebilir</>}.
          <br />
          <small>{[...oneri.olculer.map(olcuyuAnlat), ...oneri.uzunluklar.map(uzunluguAnlat)].join(' · ')}</small>
        </div>
      ) : (
        <div style={{ fontSize: 14, color: 'var(--soluk)' }}>
          Bu tabloda karşılaştırılabilecek ölçü yok; en az bir çevre ölçüsü (en, bel veya kalça) gerekiyor.
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 14, width: '100%' }}>
          <thead>
            <tr>
              {/* Tablo yana kaydığında hangi satırın hangi beden olduğu kaybolmasın. */}
              <th
                style={{
                  textAlign: 'left',
                  padding: '4px 6px',
                  color: 'var(--metin)',
                  position: 'sticky',
                  left: 0,
                  background: 'var(--kart)',
                }}
              >
                Beden
              </th>
              {sutunlar.map((s) => (
                <th key={s} style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--metin)', fontWeight: 500 }}>
                  {SUTUN_ETIKETLERI[s]}
                </th>
              ))}
              <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--metin)' }}>Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((satir, i) => {
              const s = sonuclar[i]
              const secili = oneri?.beden === satir.beden
              return (
                <tr key={satir.beden} style={{ background: secili ? 'var(--vurgu-zemin)' : undefined }}>
                  <td
                    style={{
                      padding: '4px 6px',
                      fontWeight: secili ? 700 : 400,
                      position: 'sticky',
                      left: 0,
                      background: secili ? 'var(--vurgu-zemin)' : 'transparent',
                    }}
                  >
                    {satir.beden}
                  </td>
                  {sutunlar.map((sutun) => (
                    <td key={sutun} style={{ padding: '4px 6px' }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        aria-label={`${satir.beden} ${SUTUN_ETIKETLERI[sutun]}`}
                        value={satir[sutun] ?? ''}
                        onChange={(e) => degistir(i, sutun, e.target.value)}
                        style={{
                          width: 56,
                          padding: '3px 5px',
                          fontSize: 14,
                          borderRadius: 6,
                          border: '1px solid var(--cizgi)',
                        }}
                      />
                    </td>
                  ))}
                  <td style={{ padding: '4px 6px' }}>
                    {s.olculer.length ? (
                      <span
                        style={{
                          background: RENK[s.durum].zemin,
                          border: `1px solid ${RENK[s.durum].cerceve}`,
                          color: RENK[s.durum].yazi,
                          borderRadius: 999,
                          padding: '1px 8px',
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {RENK[s.durum].etiket}
                      </span>
                    ) : (
                      <small style={{ color: 'var(--soluk)' }}>ölçü yok</small>
                    )}
                    {/* Uzunluk bedeni değiştirmez, yalnızca not düşülür */}
                    {s.uzunluklar
                      .filter((u) => u.durum !== 'uygun')
                      .map((u) => (
                        <small key={u.sutun} style={{ display: 'block', color: 'var(--soluk)', whiteSpace: 'nowrap' }}>
                          {uzunluguAnlat(u)}
                        </small>
                      ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <small style={{ color: 'var(--soluk)', lineHeight: 1.5 }}>
        Tablodaki değerler <b>düz serili genişliktir</b> (ürün masaya serilmişken ölçülen en); hesapta ikiyle
        çarpılıp vücut çevresiyle karşılaştırılır. Değerleri değiştirip deneyebilirsiniz.
        {bakilamayan.length > 0 && (
          <>
            {' '}
            <b>
              {bakilamayan.map((s) => SUTUN_ETIKETLERI[s as keyof Omit<BedenSatiri, 'beden'>] ?? s).join(' ve ')}
            </b>{' '}
            için vücutta karşılık ölçmüyoruz, bu yüzden uygunluğa girmiyor.
          </>
        )}
        {bakilamayan.includes('ic_bacak_cm') && (
          <> İç bacağını Ölçülerim'deki isteğe bağlı ölçülere eklersen pantolonun boyuna da bakarız.</>
        )}
        {sonuclar.some((r) => r.uzunluklar.length > 0) && (
          <> İç bacak bedeni değiştirmez; kısa ya da uzun gelecekse not olarak gösterilir.</>
        )}{' '}
        Örnek tablolar; gerçek ürün tabloları Supabase'den gelecek.
      </small>
    </div>
  )
}
