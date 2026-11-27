import { describe, expect, it } from 'vitest'
import {
  ESIKLER,
  UZUNLUK_ESIKLERI,
  cevreyeCevir,
  durumBul,
  enUygunBeden,
  olcuyuAnlat,
  uygunlukHesapla,
  uzunlukDurumu,
  uzunluguAnlat,
} from './uygunluk'
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

  it('eşiğe tam oturan pay kayan nokta gürültüsünden etkilenmez', () => {
    // Çözücünün ulaştığı ölçü 92 yerine 91,9999999 olabiliyor; pay eşiğin kıl payı altına
    // düşüp kullanıcıyı sebepsiz bir üst bedene yönlendiriyordu.
    expect(durumBul(ESIKLER.dar - 1e-9)).toBe('uygun')
    expect(durumBul(ESIKLER.bol + 1e-9)).toBe('uygun')
    // Gerçek bir fark hâlâ yakalanmalı.
    expect(durumBul(ESIKLER.dar - 0.01)).toBe('dar')
    expect(durumBul(ESIKLER.bol + 0.01)).toBe('bol')
  })
})

describe('eşit uzaklıktaki bedenler', () => {
  it('beraberlikte küçük beden seçilir ve sonuç kararlıdır', () => {
    // Göğüs 92 → M'nin payı 4, L'nin payı 12; ikisi de ortadan (8) tam 4 cm uzakta.
    const bedenler: BedenSatiri[] = [
      { beden: 'M', en_cm: 48 },
      { beden: 'L', en_cm: 52 },
    ]
    expect(enUygunBeden('tisort', bedenler, VUCUT)?.beden).toBe('M')
    // Ölçüdeki mikroskobik gürültü sonucu değiştirmemeli.
    const gurultulu: VucutOlculeri = { ...VUCUT, gogus: VUCUT.gogus + 1e-9 }
    expect(enUygunBeden('tisort', bedenler, gurultulu)?.beden).toBe('M')
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

  it('iç bacak girilmemişse karşılaştırılamaz', () => {
    const sonuc = uygunlukHesapla('pantolon', beden, VUCUT)
    expect(sonuc.karsilastirilamayan).toContain('ic_bacak_cm')
    expect(sonuc.uzunluklar).toEqual([])
  })
})

describe('iç bacak (isteğe bağlı)', () => {
  const beden: BedenSatiri = { beden: '38', bel_cm: 38, kalca_cm: 52, ic_bacak_cm: 78 }

  it('girildiyse karşılaştırılır, düz uzunluk olarak (ikiyle çarpılmaz)', () => {
    const sonuc = uygunlukHesapla('pantolon', beden, { ...VUCUT, ic_bacak: 76 })

    expect(sonuc.uzunluklar).toEqual([{ sutun: 'ic_bacak_cm', etiket: 'İç bacak', durum: 'uygun', farkCm: 2 }])
    expect(sonuc.karsilastirilamayan).toEqual(['boy_cm'])
  })

  it('kısa ve uzun eşikleri', () => {
    expect(uzunlukDurumu(UZUNLUK_ESIKLERI.kisa)).toBe('uygun')
    expect(uzunlukDurumu(UZUNLUK_ESIKLERI.kisa - 0.1)).toBe('kisa')
    expect(uzunlukDurumu(UZUNLUK_ESIKLERI.uzun)).toBe('uygun')
    expect(uzunlukDurumu(UZUNLUK_ESIKLERI.uzun + 0.1)).toBe('uzun')
  })

  it('kısa pantolon bedeni değiştirmez, yalnızca not düşülür', () => {
    // 78 − 86 = −8 cm: kısa; bel ve kalça uygun kaldığı için ürün hâlâ uygun
    const sonuc = uygunlukHesapla('pantolon', beden, { ...VUCUT, ic_bacak: 86 })

    expect(sonuc.uzunluklar[0].durum).toBe('kisa')
    expect(sonuc.durum).toBe('uygun')
    expect(uzunluguAnlat(sonuc.uzunluklar[0])).toBe('İç bacak 5 cm kısa') // eşiğin (−3) ötesindeki kısım
    expect(enUygunBeden('pantolon', [beden], { ...VUCUT, ic_bacak: 86 })?.beden).toBe('38')
  })

  it('tabloda iç bacak yoksa eksik sütun sayılır', () => {
    const sonuc = uygunlukHesapla('pantolon', { beden: '38', bel_cm: 38, kalca_cm: 52 }, { ...VUCUT, ic_bacak: 80 })

    expect(sonuc.uzunluklar).toEqual([])
    expect(sonuc.eksikSutunlar).toEqual(['ic_bacak_cm'])
  })

  it('tişörtte iç bacağa bakılmaz', () => {
    const sonuc = uygunlukHesapla('tisort', { beden: 'M', en_cm: 50 }, { ...VUCUT, ic_bacak: 80 })

    expect(sonuc.uzunluklar).toEqual([])
    expect(sonuc.karsilastirilamayan).toEqual(['boy_cm', 'kol_cm'])
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
