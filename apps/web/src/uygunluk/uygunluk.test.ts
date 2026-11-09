import { describe, expect, it } from 'vitest'
import { ESIKLER, cevreyeCevir, durumBul, enUygunBeden, olcuyuAnlat, uygunlukHesapla } from './uygunluk'
import type { BedenSatiri, VucutOlculeri } from './uygunluk'

// Göğüs 92, bel 70, kalça 96 cm çevre.
const VUCUT: VucutOlculeri = { gogus: 92, bel: 70, kalca: 96 }

describe('birim çevrimi', () => {
  it('düz serili genişliği çevreye çevirir', () => {
    expect(cevreyeCevir(50)).toBe(100)
  })
})

describe('durumBul', () => {
  it('eşiklerin altında dar, üstünde bol', () => {
    expect(durumBul(ESIKLER.dar - 0.1)).toBe('dar')
    expect(durumBul(ESIKLER.dar)).toBe('uygun')
    expect(durumBul(ESIKLER.bol)).toBe('uygun')
    expect(durumBul(ESIKLER.bol + 0.1)).toBe('bol')
  })
})

describe('tişört', () => {
  it('göğsü dar ürün dar sayılır', () => {
    // 46 × 2 = 92 çevre, vücutla aynı → pay 0, eşiğin altında
    const sonuc = uygunlukHesapla('tisort', { beden: 'S', en_cm: 46, boy_cm: 66 }, VUCUT)

    expect(sonuc.durum).toBe('dar')
    expect(sonuc.olculer).toHaveLength(1)
    expect(sonuc.olculer[0].payCm).toBe(0)
  })

  it('makul paylı ürün uygun sayılır', () => {
    // 50 × 2 = 100, pay 8 cm
    const sonuc = uygunlukHesapla('tisort', { beden: 'M', en_cm: 50 }, VUCUT)

    expect(sonuc.durum).toBe('uygun')
    expect(sonuc.olculer[0].payCm).toBe(8)
  })

  it('çok geniş ürün bol sayılır', () => {
    // 56 × 2 = 112, pay 20 cm
    expect(uygunlukHesapla('tisort', { beden: 'XL', en_cm: 56 }, VUCUT).durum).toBe('bol')
  })

  it('boy ve kol karşılaştırılamayan olarak raporlanır', () => {
    const sonuc = uygunlukHesapla('tisort', { beden: 'M', en_cm: 50, boy_cm: 70, kol_cm: 21 }, VUCUT)

    expect(sonuc.karsilastirilamayan).toEqual(['boy_cm', 'kol_cm'])
  })
})

describe('pantolon', () => {
  const beden: BedenSatiri = { beden: '38', bel_cm: 38, kalca_cm: 52, ic_bacak_cm: 78 }

  it('bel ve kalçaya bakar', () => {
    const sonuc = uygunlukHesapla('pantolon', beden, VUCUT)

    expect(sonuc.olculer.map((o) => o.sutun)).toEqual(['bel_cm', 'kalca_cm'])
    expect(sonuc.olculer[0].payCm).toBe(6) // 38×2 − 70
    expect(sonuc.olculer[1].payCm).toBe(8) // 52×2 − 96
    expect(sonuc.durum).toBe('uygun')
  })

  it('bir ölçü darsa ürünün tamamı dar sayılır', () => {
    const dar = uygunlukHesapla('pantolon', { ...beden, bel_cm: 35 }, VUCUT)

    expect(dar.olculer[0].durum).toBe('dar') // 35×2 − 70 = 0
    expect(dar.olculer[1].durum).toBe('uygun')
    expect(dar.durum).toBe('dar')
  })

  it('iç bacak karşılaştırılamaz', () => {
    expect(uygunlukHesapla('pantolon', beden, VUCUT).karsilastirilamayan).toContain('ic_bacak_cm')
  })
})

describe('elbise', () => {
  it('üç çevreye birden bakar', () => {
    const sonuc = uygunlukHesapla(
      'elbise',
      { beden: 'M', en_cm: 50, bel_cm: 40, kalca_cm: 53 },
      VUCUT,
    )

    expect(sonuc.olculer.map((o) => o.sutun)).toEqual(['en_cm', 'bel_cm', 'kalca_cm'])
    expect(sonuc.durum).toBe('uygun')
  })
})

describe('eksik ölçü', () => {
  it('eksik sütun atlanır, hesap çökmez', () => {
    const sonuc = uygunlukHesapla('pantolon', { beden: '38', bel_cm: 38 }, VUCUT)

    expect(sonuc.olculer).toHaveLength(1)
    expect(sonuc.eksikSutunlar).toEqual(['kalca_cm'])
  })

  it('null da eksik sayılır', () => {
    const sonuc = uygunlukHesapla('pantolon', { beden: '38', bel_cm: 38, kalca_cm: null }, VUCUT)

    expect(sonuc.eksikSutunlar).toEqual(['kalca_cm'])
  })

  it('hiç ölçü yoksa değerlendirme boş döner', () => {
    const sonuc = uygunlukHesapla('tisort', { beden: 'M' }, VUCUT)

    expect(sonuc.olculer).toHaveLength(0)
    expect(sonuc.eksikSutunlar).toEqual(['en_cm'])
  })
})

describe('enUygunBeden', () => {
  const bedenler: BedenSatiri[] = [
    { beden: 'S', en_cm: 46 },
    { beden: 'M', en_cm: 50 },
    { beden: 'L', en_cm: 53 },
    { beden: 'XL', en_cm: 58 },
  ]

  it('uygun olanlar arasından paya en yakın olanı seçer', () => {
    // Hedef aralığın ortası 8 cm pay → M (pay 8)
    expect(enUygunBeden('tisort', bedenler, VUCUT)?.beden).toBe('M')
  })

  it('hiçbiri uygun değilse yine de bir beden döner', () => {
    const hepsiDar: BedenSatiri[] = [
      { beden: 'XS', en_cm: 40 },
      { beden: 'S', en_cm: 44 },
    ]

    const sonuc = enUygunBeden('tisort', hepsiDar, VUCUT)

    expect(sonuc?.durum).toBe('dar')
    expect(sonuc?.beden).toBe('S') // ikisinden daha az dar olanı
  })

  it('ölçüsü olmayan bedenler elenir, hiç kalmazsa null döner', () => {
    expect(enUygunBeden('tisort', [{ beden: 'M' }, { beden: 'L' }], VUCUT)).toBeNull()
  })
})

describe('olcuyuAnlat', () => {
  it('dar ölçüyü cm ile anlatır', () => {
    const sonuc = uygunlukHesapla('tisort', { beden: 'S', en_cm: 46 }, VUCUT)

    expect(olcuyuAnlat(sonuc.olculer[0])).toBe('Göğüs 4 cm dar')
  })

  it('uygun ölçüde miktar yazmaz', () => {
    const sonuc = uygunlukHesapla('tisort', { beden: 'M', en_cm: 50 }, VUCUT)

    expect(olcuyuAnlat(sonuc.olculer[0])).toBe('Göğüs uygun')
  })

  it('bol ölçüyü cm ile anlatır', () => {
    const sonuc = uygunlukHesapla('tisort', { beden: 'XL', en_cm: 56 }, VUCUT)

    expect(olcuyuAnlat(sonuc.olculer[0])).toBe('Göğüs 8 cm bol')
  })
})
