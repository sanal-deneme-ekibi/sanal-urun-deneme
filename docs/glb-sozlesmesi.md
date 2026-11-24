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
yatay düzlemle kesilip çevre ölçülür, kilo da hacimden hesaplanır. Key'ler birbirini
etkilediği için (göğsü büyütmek beli de bir miktar büyütür, `weight` bütün çevreleri
büyütür) her taramada **beş ölçünün hepsi** kaydedilir.

### Biçim

Aşağıdaki değerler `assets/models/avatar_kadin.calib.json` dosyasından, kısaltılarak alınmıştır.

```json
{
  "surum": 1,
  "model": "avatar_kadin",
  "betik": "blender/scripts/avatar_olustur.py",
  "tarih": "2026-11-06",
  "birim": "cm",
  "birim_kilo": "kg",
  "keyler": ["height", "chest", "waist", "hip", "weight"],
  "olcumler": ["boy", "gogus", "bel", "kalca", "kilo"],

  "taban": { "boy": 145.6, "gogus": 67.8, "bel": 48.3, "kalca": 78.2, "kilo": 30.0 },

  "etki": {
    "height": { "boy": 43.0, "gogus": 13.2, "bel": 11.4, "kalca": 15.6, "kilo": 26.6 },
    "chest":  { "boy":  0.0, "gogus": 29.9, "bel":  0.5, "kalca":  0.0, "kilo":  5.9 },
    "waist":  { "boy":  0.0, "gogus":  0.0, "bel": 22.9, "kalca":  1.0, "kilo":  4.7 },
    "hip":    { "boy":  0.0, "gogus":  0.0, "bel":  0.0, "kalca": 22.8, "kilo":  4.5 },
    "weight": { "boy":  0.0, "gogus": 20.1, "bel": 27.1, "kalca": 30.1, "kilo": 25.9 }
  },

  "ornekler": [
    {
      "agirliklar": { "height": 0.64, "chest": 0.03, "waist": 0.28, "hip": 0.22, "weight": 0.74 },
      "olculen":    { "boy": 173.1, "gogus": 92.5, "bel": 81.7, "kalca": 115.0, "kilo": 74.0 }
    }
  ]
}
```

| Alan | Anlamı |
|---|---|
| `birim` | çevre ve uzunluk ölçülerinin birimi (`cm`) |
| `birim_kilo` | `kilo` ölçüsünün birimi (`kg`); diğerlerinden farklı olduğu için ayrı yazılır |
| `taban` | bütün key'ler 0 iken ölçülen değerler |
| `etki[key][olcu]` | o key 0'dan 1'e giderken o ölçünün değişimi |
| `ornekler` | karışık ağırlıklarla alınmış ham ölçümler; doğrusal yaklaşımın hatasını raporlamak için |

Model şu doğrusal varsayıma dayanır:

```
olcu = taban[olcu] + Σ  etki[key][olcu] × agirlik[key]
                   key
```

`ornekler` bu varsayımın ne kadar tuttuğunu gösterir. Eşikler ölçü türüne göre ayrıdır:

| Ölçü | Eşik | Neden |
|---|---|---|
| `boy`, `gogus`, `bel`, `kalca` | 1 cm | çevreler shape key'lerle neredeyse doğrusal değişir |
| `kilo` | 4 kg | hacim kabaca boy × çevre² ile büyür, doğrusal değil |

Bir ölçünün ortalama sapması kendi eşiğini geçerse doğrusal model o ölçü için yetmiyor
demektir; o zaman `ornekler` genişletilir ve çözücü ara değerleri tablodan okur (bu durumda
biçim `surum: 2` ile değişir).

Sapma tek örnekten değil, bütün `ornekler` üzerinden ortalanarak ölçülür.
`avatar_kadin` için 10 örnekte bugünkü değerler: boy 0,03 · göğüs 0,4 · bel 0,2 ·
kalça 0,6 cm, kilo 3,6 kg. Hepsi kendi eşiğinin altında.

### Kurallar

- Alan ve key adları buradaki yazımla **birebir** aynıdır; ölçü adları Türkçe
  (`boy`, `gogus`, `bel`, `kalca`, `kilo`), key adları İngilizce
  (`height`, `chest`, `waist`, `hip`, `weight`).
- Ölçü adları Supabase'deki `measurements` tablosunun sütunlarıyla eşleşir:

  | Ölçü | Sütun |
  |---|---|
  | `boy` | `boy_cm` |
  | `gogus` | `gogus_cm` |
  | `bel` | `bel_cm` |
  | `kalca` | `kalca_cm` |
  | `kilo` | `kilo_kg` |

  `kilo_kg` boş bırakılabilir: kilo hassas bir bilgi ve kullanıcı girmek zorunda değil. Boşsa
  çözücüye `kilo` hedefi verilmez, `weight` key'i diğer ölçülerden çözülür.
- Sayılar en fazla bir ondalık basamakla yazılır.
- `avatar_erkek.calib.json` aynı biçimdedir, yalnızca sayılar değişir.
- Yukarıdaki **Avatar** bölümündeki tablonun "0 değeri" sütunu `taban`, "1 değeri" sütunu
  `taban + etki[key][kendi ölçüsü]` demektir; tablo o dosyadan doldurulur.

### Kıyafet şablonu kalibrasyonu

`sablon_<tur>.calib.json` aynı yapıyı kullanır, yalnızca adlar değişir:

- `keyler`: `["length", "width", "sleeve"]` (kolsuz türlerde `sleeve` yok)
- `olcumler`: `["boy", "en", "kol"]` — Supabase'deki `size_charts` sütunlarıyla aynı
- Şablonun vücut key'leri (`height`, `chest`, `waist`, `hip`, `weight`) burada **yer almaz**;
  onlar avatardan çözülen ağırlıklarla doğrudan aynı değere set edilir, yeniden çözülmez.

Pantolon ve etek için bu üç key yetmiyor: beden tablosunda `bel_cm`, `kalca_cm` ve
`ic_bacak_cm` da var. `sablon_pantolon` için `waist`, `hip`, `inseam` key'leri gerekiyor.
Karara bağlanınca buraya yazılacak.

## Ölçü çözücü

Kullanıcının cm cinsinden ölçülerini shape key ağırlıklarına çevirir. Tarayıcıda çalışır
(TypeScript), `apps/web` içinden çağrılır.

### Girdi

```ts
type OlcuAdi = 'boy' | 'gogus' | 'bel' | 'kalca' | 'kilo';
type KeyAdi  = 'height' | 'chest' | 'waist' | 'hip' | 'weight';

type Olculer    = Record<OlcuAdi, number>;  // boy/gogus/bel/kalca cm, kilo kg
type Agirliklar = Record<KeyAdi, number>;   // 0–1

function olcuCozucu(hedef: Olculer, kalib: Kalibrasyon): CozucuSonucu;
```

`kilo` kullanıcıdan gelmemişse (`measurements.kilo_kg` boş) hedefe konmaz; çözücü kalan dört
ölçüden `weight` dahil bütün ağırlıkları bulur.

**Arayüz şu an kiloyu hedef olarak vermiyor.** Avatar aynı anda hem çevreleri hem kiloyu
tutturamıyor: kilo hedefe eklendiğinde çevre hatası 0,0 cm'den 0,5–1,5 cm'ye çıkıyor, kilo
yine de 7–14 kg sapıyor. Kıyafet uygunluğu çevrelere bağlı olduğu için çevreler önceliklidir.
Kilo yine de sözleşmede: kalibrasyon dosyası taşıyor ve çözücü verildiğinde kullanıyor.

### Çıktı

```ts
type CozucuSonucu = {
  agirliklar: Agirliklar;   // GLB'ye morphTargetInfluences olarak verilir
  ulasilan: Olculer;        // bu ağırlıklarla avatarın beklenen ölçüsü
  fark: Olculer;            // ulasilan − hedef, ölçü başına (cm, kilo için kg)
  ortalamaHataCm: number;   // |fark| değerlerinin ortalaması, kilo hariç
  sinirda: KeyAdi[];        // 0 veya 1'e dayanmış key'ler, örn. ["hip"]
};
```

`ortalamaHataCm` yalnızca cm cinsinden ölçüleri kapsar; kilo kg olduğu için ortalamaya
karıştırılmaz, `fark.kilo`'dan ayrı okunur.

### Yöntem

Sınırlı en küçük kareler: `agirliklar` 0–1 aralığında kalmak koşuluyla
`Σ (ulasilan − hedef)²` en küçüklenir. Beş bilinmeyen ve en çok beş denklem olduğu için
küçük bir yineleyici çözüm (projected gradient) yeterlidir; dış kütüphane gerekmez.

### Sınır durumları

- Kullanıcının ölçüsü avatarın kapsadığı aralığın dışındaysa ağırlık 0 veya 1'e dayanır ve
  o key `sinirda` listesine girer. Hesap yine de sürer.
- **Arayüz uyarıyı `sinirda`'ya değil `fark`'a bakarak gösterir.** Bir ağırlığın sınıra
  dayanması tek başına sorun değil: key'ler birbirinin yerini tutabildiği için çözücü
  ölçüyü başka bir key'le yakalayabilir. Ölçünün gerçekten tutturulamadığını `fark`
  söyler. `sinirda` tanı amaçlıdır — hangi key'in manevra alanı kalmadığını gösterir.
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
