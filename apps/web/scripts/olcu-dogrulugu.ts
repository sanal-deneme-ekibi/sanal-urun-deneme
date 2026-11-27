// Ölçü doğruluğu testi (#34), 1. adım: uygulamanın gerçek ölçü çözücüsünü ANSUR II setleriyle çalıştırır.
// Çıktı (cozumler.json), avatarı bu ağırlıklarla kurup ölçen Blender betiğinin girdisidir:
//   blender/scripts/olcu_dogrulugu.py
//
// Kullanım (apps/web içinden):
//   npx vite-node scripts/olcu-dogrulugu.ts
//
// İki senaryo:
//   tam   — kullanıcı boy, göğüs, bel, kalça, kol boyu ve iç bacağı girmiş
//   temel — yalnızca boy, göğüs, bel, kalça (kol ve bacak bilinmiyor)
// Kilo iki senaryoda da verilmez: arayüz kiloyu hedef olarak kullanmıyor (docs/glb-sozlesmesi.md).
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import kadinKalib from '../../../assets/models/avatar_kadin.calib.json'
import erkekKalib from '../../../assets/models/avatar_erkek.calib.json'
import { olcuCozucu } from '../src/olcu/cozucu'
import type { HedefOlculer, Kalibrasyon, Olculer } from '../src/olcu/kalibrasyon'

const KLASOR = resolve(__dirname, '../../../ml/results/olcu-dogrulugu')
const KALIBRASYON: Record<string, Kalibrasyon> = {
  kadin: kadinKalib as Kalibrasyon,
  erkek: erkekKalib as Kalibrasyon,
}

type Set = { id: string; model: string; olculer: Olculer }
const { setler } = JSON.parse(readFileSync(resolve(KLASOR, 'setler.json'), 'utf-8')) as { setler: Set[] }

const SENARYOLAR: Record<string, (o: Olculer) => HedefOlculer> = {
  tam: ({ boy, gogus, bel, kalca, kol_boyu, ic_bacak }) => ({ boy, gogus, bel, kalca, kol_boyu, ic_bacak }),
  temel: ({ boy, gogus, bel, kalca }) => ({ boy, gogus, bel, kalca }),
}

const cozumler = setler.flatMap((s) =>
  Object.entries(SENARYOLAR).map(([senaryo, hedefYap]) => {
    const hedef = hedefYap(s.olculer)
    const sonuc = olcuCozucu(hedef, KALIBRASYON[s.model])
    return {
      id: s.id,
      model: s.model,
      senaryo,
      hedef,
      agirliklar: sonuc.agirliklar,
      tahmin: sonuc.ulasilan, // çözücünün doğrusal modelle beklediği ölçüler
      sinirda: sonuc.sinirda,
    }
  }),
)

writeFileSync(resolve(KLASOR, 'cozumler.json'), JSON.stringify({ cozumler }, null, 2) + '\n')
console.log(`${cozumler.length} çözüm yazıldı: ${resolve(KLASOR, 'cozumler.json')}`)
