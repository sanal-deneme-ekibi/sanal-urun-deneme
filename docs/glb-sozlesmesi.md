# GLB sözleşmesi (taslak – 2. hafta sonunda sabitlenir)

Üç kişinin aynı dili konuşması için 3B dosyaların uyması gereken kurallar.

## Genel

- Format: `.glb` (glTF 2.0, ikili), Draco sıkıştırma açık
- Birim: metre · Yukarı yön: +Y (Blender dışa aktarımında "+Y Up")
- Poz: A-pozu, iskelet (rig) yok
- Yön: model +Z yönüne bakar (glTF "ön"ü). **Sol/sağ her zaman giyenin solu/sağıdır**:
  giyenin solu +X tarafıdır (kameradan bakınca ekranın sağı). Dosya, nokta ve bölge
  adlarındaki `sol`/`sag` bu kurala uyar (ör. `omuz_sol`).
- Üçgen bütçesi: avatar ≤ 20.000, kıyafet ≤ 10.000, gözlük ≤ 5.000

## Avatar

- Dosya adları: `assets/models/avatar_kadin.glb`, `assets/models/avatar_erkek.glb`
- Mesh adı: `Avatar`
- Görünüm: vitrin mankeni (anatomik ayrıntılar yumuşatılmış, tek renk mat)
- Vücut shape key'leri (0–1 arası, varsayılan 0, bu sırayla):

| Shape key | Anlamı | Ölçü | 0 değeri | 1 değeri (yalnız bu key) |
|---|---|---|---|---|
| `height` | boy | `boy` (cm) | 145,6 | 188,6 |
| `chest` | göğüs çevresi | `gogus` (cm) | 67,8 | 97,7 |
| `waist` | bel çevresi | `bel` (cm) | 48,3 | 71,2 |
| `hip` | kalça çevresi | `kalca` (cm) | 78,2 | 101,0 |
| `weight` | genel dolgunluk (kollar, bacaklar, gövde) | `kilo` (kg) | 30,0 | 55,9 |

Değerler `avatar_kadin` içindir. Key'ler birbirini etkiler (ör. `weight` bütün çevreleri,
`height` kiloyu büyütür); bütün etkiler kalibrasyon tablosundadır:
`assets/models/avatar_kadin.calib.json`. Kilo, mesh hacminden 1 kg/L ile hesaplanır.

## Kıyafet şablonları

- Dosya adları: `assets/models/sablon_<tur>.glb` → `tisort`, `pantolon`, `gomlek`, `elbise`, `etek`
- Mesh adı: `Garment`
- Avatarla **aynı adlı** vücut shape key'leri: `height`, `chest`, `waist`, `hip`, `weight`
- Ürün ölçüsü shape key'leri: `length` (boy), `width` (en), `sleeve` (kol; yoksa eklenmez)
- Kalibrasyon: `assets/models/sablon_<tur>.calib.json`

## Kalibrasyon dosyası biçimi

Shape key'ler 0–1 arası birimsiz sayılardır; kullanıcı ise cm ile düşünür. Kalibrasyon
dosyası bu ikisi arasındaki çeviriyi taşır. Ölçüm betiğinin (A) çıktısı, ölçü çözücünün (C)
girdisidir.

### Nasıl üretilir

Her key 0'dan 1'e 0,1 adımlarla taranır, diğer key'ler 0'da bırakılır; her adımda avatar
yatay düzlemle kesilip çevre ölçülür. Key'ler birbirini etkilediği için (göğsü büyütmek beli
de bir miktar büyütür) her taramada **dört ölçünün hepsi** kaydedilir.

### Biçim

```json
{
  "surum": 1,
  "model": "avatar_kadin",
  "betik": "blender/olcum.py",
  "tarih": "2026-11-10",
  "birim": "cm",
  "keyler": ["height", "chest", "waist", "hip"],
  "olcumler": ["boy", "gogus", "bel", "kalca"],

  "taban": { "boy": 158.0, "gogus": 82.0, "bel": 62.0, "kalca": 86.0 },

  "etki": {
    "height": { "boy": 28.0, "gogus": 2.1, "bel": 1.4, "kalca": 2.0 },
    "chest":  { "boy":  0.0, "gogus": 26.0, "bel": 4.2, "kalca": 1.1 },
    "waist":  { "boy":  0.0, "gogus":  3.0, "bel": 30.0, "kalca": 5.4 },
    "hip":    { "boy":  0.0, "gogus":  0.6, "bel": 4.8, "kalca": 28.0 }
  },

  "ornekler": [
    {
      "agirliklar": { "height": 0.5, "chest": 0.3, "waist": 0.2, "hip": 0.4 },
      "olculen":    { "boy": 172.0, "gogus": 91.5, "bel": 71.6, "kalca": 99.3 }
    }
  ]
}
```

| Alan | Anlamı |
|---|---|
| `taban` | bütün key'ler 0 iken ölçülen değerler (cm) |
| `etki[key][olcu]` | o key 0'dan 1'e giderken o ölçünün cm cinsinden değişimi |
| `ornekler` | karışık ağırlıklarla alınmış ham ölçümler; doğrusal yaklaşımın hatasını raporlamak için |

Model şu doğrusal varsayıma dayanır:

```
olcu = taban[olcu] + Σ  etki[key][olcu] × agirlik[key]
                   key
```

`ornekler` bu varsayımın ne kadar tuttuğunu gösterir. Ortalama sapma 1 cm'yi geçerse
doğrusal model yetmiyor demektir; o zaman `ornekler` genişletilir ve çözücü ara değerleri
tablodan okur (bu durumda biçim `surum: 2` ile değişir).

### Kurallar

- Alan ve key adları buradaki yazımla **birebir** aynıdır; ölçü adları Türkçe
  (`boy`, `gogus`, `bel`, `kalca`), key adları İngilizce (`height`, `chest`, `waist`, `hip`).
- Ölçü adları Supabase'deki `measurements` tablosunun sütunlarıyla eşleşir
  (`boy_cm` → `boy`, `gogus_cm` → `gogus`, …).
- Sayılar en fazla bir ondalık basamakla yazılır.
- `avatar_erkek.calib.json` aynı biçimdedir, yalnızca sayılar değişir.
- Yukarıdaki **Avatar** bölümündeki tablonun "0 değeri" sütunu `taban`, "1 değeri" sütunu
  `taban + etki[key][kendi ölçüsü]` demektir; tablo o dosyadan doldurulur.

### Kıyafet şablonu kalibrasyonu

`sablon_<tur>.calib.json` aynı yapıyı kullanır, yalnızca adlar değişir:

- `keyler`: `["length", "width", "sleeve"]` (kolsuz türlerde `sleeve` yok)
- `olcumler`: `["boy", "en", "kol"]` — Supabase'deki `size_charts` sütunlarıyla aynı
- Şablonun vücut key'leri (`height`, `chest`, `waist`, `hip`) burada **yer almaz**;
  onlar avatardan çözülen ağırlıklarla doğrudan aynı değere set edilir, yeniden çözülmez.

## Ölçü çözücü

Kullanıcının cm cinsinden ölçülerini shape key ağırlıklarına çevirir. Tarayıcıda çalışır
(TypeScript), `apps/web` içinden çağrılır.

### Girdi

```ts
type Olculer   = { boy: number; gogus: number; bel: number; kalca: number };   // cm
type Agirliklar = { height: number; chest: number; waist: number; hip: number }; // 0–1

function olcuCozucu(hedef: Olculer, kalib: Kalibrasyon): CozucuSonucu;
```

### Çıktı

```ts
type CozucuSonucu = {
  agirliklar: Agirliklar;   // GLB'ye morphTargetInfluences olarak verilir
  ulasilan: Olculer;        // bu ağırlıklarla avatarın beklenen ölçüsü
  fark: Olculer;            // ulasilan − hedef, ölçü başına cm
  ortalamaHataCm: number;   // |fark| değerlerinin ortalaması
  sinirda: string[];        // 0 veya 1'e dayanmış key'ler, örn. ["hip"]
};
```

### Yöntem

Sınırlı en küçük kareler: `agirliklar` 0–1 aralığında kalmak koşuluyla
`Σ (ulasilan − hedef)²` en küçüklenir. Dört bilinmeyen ve dört denklem olduğu için
küçük bir yineleyici çözüm (projected gradient) yeterlidir; dış kütüphane gerekmez.

### Sınır durumları

- Kullanıcının ölçüsü avatarın kapsadığı aralığın dışındaysa ağırlık 0 veya 1'e dayanır.
  O key `sinirda` listesine girer ve arayüz "bu ölçü avatarın sınırında" uyarısı gösterir;
  hesap yine de sürer.
- `fark` ölçü başına ayrı döner, çünkü 3 cm'lik bel hatası ile 3 cm'lik boy hatası aynı şey
  değildir. Raporlanan ölçüt `ortalamaHataCm`'dir (ölçü doğruluğu testi, #19).
- Çözücü `kalib.surum` değerini kontrol eder; beklemediği bir sürümde hata verir.

### Uygunluk payı

Çözücünün çıktısı uygunluk hesabının girdisidir: ürünün beden tablosundaki ölçülerle
avatarın ulaştığı ölçüler karşılaştırılır ve fark dar / uygun / bol olarak sunulur.
Payların cm cinsinden eşikleri ayrı issue'da belirlenecek.

## Standart UV düzeni (kıyafet)

| Bölge (UV) | Parça |
|---|---|
| sol yarı (u 0–0.5, v 0.27–1) | ön |
| sağ yarı (u 0.5–1, v 0.27–1) | arka |
| alt şerit (v 0–0.25) | kollar / paçalar |

## Anahtar noktalar (yapay zekâ ↔ şablon)

Tişört için 7 nokta, sırası sabit:
`0 yaka_orta, 1 omuz_sol, 2 omuz_sag, 3 kol_sol, 4 kol_sag, 5 etek_sol, 6 etek_sag`
Her noktanın şablonun UV'sindeki karşılığı `sablon_<tur>.keypoints.json` dosyasında tutulur.
