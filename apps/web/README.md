# apps/web – Uygulama (Sorumlu: B)

React + React Three Fiber (Three.js) + Vite + TypeScript. PWA olarak telefonda çalışır.

## İlk kurulum (1. hafta)

```bash
cd apps/web
npm create vite@latest . -- --template react-ts
npm install three @react-three/fiber @react-three/drei
npm run dev
```

İlk hedef: `assets/models/avatar_kadin.glb` dosyasını ekranda göstermek ve fareyle döndürmek.

## Testler

```bash
npm test          # bir kez çalıştır
npm run test:izle # dosya değiştikçe çalıştır
```

Vitest kullanılıyor (plandaki araç). Test dosyaları kaynağın yanında durur: `uygunluk.test.ts`.

## `src/uygunluk/` – Uygunluk hesabı

Ürünün beden tablosu ile avatarın ulaştığı ölçüleri karşılaştırıp **dar / uygun / bol** verir.

```ts
import { uygunlukHesapla, enUygunBeden, olcuyuAnlat } from './uygunluk/uygunluk'

const sonuc = uygunlukHesapla('tisort', { beden: 'M', en_cm: 50 }, { gogus: 92, bel: 70, kalca: 96 })
// sonuc.durum === 'uygun'
// olcuyuAnlat(sonuc.olculer[0]) === 'Göğüs uygun'
```

Bilinmesi gereken üç şey:

**Birim.** Beden tablosundaki ölçüler düz serili genişliktir, vücut ölçüleri çevredir. Hesap
ürün ölçüsünü 2 ile çarpar. Kural `docs/glb-sozlesmesi.md` ve `ml/veri-protokolu.md`'de.

**Neye bakılıyor.** Yalnızca çevre karşılığı olan sütunlar: tişört ve gömlekte `en_cm`,
pantolon ve etekte `bel_cm` ile `kalca_cm`, elbisede üçü birden. Ürünün boyu, kol boyu ve iç
bacak uzunluğu beden tablosunda var ama vücut tarafında karşılığı yok (kol ve bacak uzunluğu
toplamıyoruz); bunlar `karsilastirilamayan` listesinde dönüyor.

**Eşikler geçici.** `ESIKLER = { dar: 4, bol: 12 }`, yani ürün çevresi vücut çevresinden 4 cm
az fazlaysa dar, 12 cm'den fazlaysa bol. Gerçek ürünlerle denenip ayarlanacak; tek yerde
durduğu için değiştirmek kolay.
