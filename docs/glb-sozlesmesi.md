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

| Shape key | Anlamı | Ölçü | Kadın: 0 → 1 (yalnız bu key) | Erkek: 0 → 1 |
|---|---|---|---|---|
| `height` | boy | `boy` (cm) | 133,5 → 176,5 | 147,3 → 180,5 |
| `chest` | göğüs çevresi (erkekte sırt/kanat ve omuz genişliği) | `gogus` (cm) | 67,4 → 97,6 | 86,1 → 101,7 |
| `waist` | bel çevresi | `bel` (cm) | 48,5 → 75,3 | 58,5 → 84,7 |
| `hip` | kalça çevresi | `kalca` (cm) | 76,2 → 101,4 | 77,9 → 102,3 |
| `weight` | genel dolgunluk (kollar, bacaklar, gövde) | `kilo` (kg) | 23,6 → 56,6 | 41,5 → 70,7 |
| `arm_length` | kol boyu (omuz başından bileğe) | `kol_boyu` (cm) | 40,0 → 55,1 | 45,8 → 59,0 |
| `leg_length` | bacak boyu (kasıktan yere) | `ic_bacak` (cm) | 54,4 → 82,8 | 63,7 → 92,0 |

Key'ler birbirini etkiler (ör. `weight` bütün çevreleri, `height` kiloyu, kol ve bacağı
büyütür); bütün etkiler kalibrasyon tablolarındadır: `assets/models/avatar_<model>.calib.json`.
Kilo, mesh hacminden modelin yoğunluğuyla hesaplanır (kadın 1,06, erkek 1,12 kg/L; ANSUR II'deki gerçek
kişilerle ayarlandı, #34). Yoğunluk kalibrasyon dosyasında `yogunluk_kg_l` alanında durur.

- `arm_length` ve `leg_length` boydan bağımsızdır: aynı boyda kolu ya da bacağı uzun insanlar için.
- Erkekte `chest` göğsü öne büyütmez; sırtın kanat kasını (latissimus dorsi), V gövdeyi ve omuz
  genişliğini büyütür. Kadında göğüs boyutu ve göğüs çevresiyle büyür.
- Çevreler kasık ile koltuk altı arasına göre tanımlı yüksekliklerde ölçülür; böylece bacak ve
  kol uzunluğu değişince göğüs/bel/kalça ölçüsü kaymaz.

## Kıyafet şablonları

- Dosya adları: `assets/models/sablon_<tur>_<model>.glb` → tür `tisort`, `pantolon`, `gomlek`,
  `elbise`, `etek`; model `kadin` veya `erkek` (ör. `sablon_tisort_erkek.glb`). Her şablon kendi
  avatarının üzerine kurulur ve o avatarın vücut key'lerini taşır; kadın avatarına `_kadin`,
  erkek avatarına `_erkek` şablonu giydirilir. UV düzeni ve anahtar noktalar ikisinde aynıdır.
- Mesh adı: `Garment`
- Avatarla **aynı adlı** vücut shape key'leri: `height`, `chest`, `waist`, `hip`, `weight`,
  `arm_length`, `leg_length`
- Ürün ölçüsü shape key'leri: `length` (boy), `width` (en), `sleeve` (kol; yoksa eklenmez)
- Kalibrasyon: `assets/models/sablon_<tur>_<model>.calib.json`

## Kalibrasyon dosyası biçimi

Shape key'ler 0–1 arası birimsiz sayılardır; kullanıcı ise cm ile düşünür. Kalibrasyon
dosyası bu ikisi arasındaki çeviriyi taşır. Ölçüm betiğinin (A) çıktısı, ölçü çözücünün (C)
girdisidir.

### Nasıl üretilir

Avatar; taban, her key tek başına 1 ve 40 rastgele karışımda kurulup ölçülür (yatay kesitlerle
çevreler, hacimden kilo). Her ölçüde **bütün ölçüler** kaydedilir, çünkü key'ler birbirini etkiler
(`weight` bütün çevreleri büyütür). `taban` ve `etki` bu ölçümlere **en küçük kareler** uyumuyla
bulunur; key'leri tek tek 0→1 götürmek karışımlarda göğsü sistematik olarak 1–2 cm fazla tahmin
ediyordu, çünkü key'lerin etkileri tam toplanmıyor (#34). Bu yüzden `taban`, bütün key'ler 0'dayken
ölçülen değerden birkaç birim farklı olabilir: o, ölçüm değil uyumun sabit terimidir.

### Biçim

Aşağıdaki değerler `assets/models/avatar_kadin.calib.json` dosyasından, kısaltılarak alınmıştır.

```json
{
  "surum": 1,
  "model": "avatar_kadin",
  "betik": "blender/scripts/avatar_olustur.py",
  "tarih": "2026-11-27",
  "birim": "cm",
  "birim_kilo": "kg",
  "yogunluk_kg_l": 1.06,
  "keyler": ["height", "chest", "waist", "hip", "weight", "arm_length", "leg_length"],
  "olcumler": ["boy", "gogus", "bel", "kalca", "kilo", "kol_boyu", "ic_bacak"],

  "taban": { "boy": 133.5, "gogus": 67.4, "bel": 48.5, "kalca": 76.2, "kilo": 23.6, "kol_boyu": 40.0, "ic_bacak": 54.4 },

  "etki": {
    "height": { "boy": 43.0, "gogus": 13.6, "bel": 11.9, "kalca": 14.6, "kilo": 34.6, "kol_boyu": 14.9, "ic_bacak": 25.7 },
    "chest": { "boy": 0.0, "gogus": 30.2, "bel": 1.2, "kalca": -0.5, "kilo": 8.8, "kol_boyu": -1.0, "ic_bacak": -0.0 },
    "waist": { "boy": 0.0, "gogus": 1.5, "bel": 26.8, "kalca": 1.3, "kilo": 7.6, "kol_boyu": -0.1, "ic_bacak": -0.0 },
    "hip": { "boy": -0.0, "gogus": -0.6, "bel": -0.1, "kalca": 25.2, "kilo": 7.2, "kol_boyu": 0.2, "ic_bacak": 0.0 },
    "weight": { "boy": 0.0, "gogus": 20.1, "bel": 26.4, "kalca": 29.7, "kilo": 33.0, "kol_boyu": -2.0, "ic_bacak": -1.0 },
    "arm_length": { "boy": 0.0, "gogus": -0.3, "bel": -0.2, "kalca": -0.5, "kilo": 1.7, "kol_boyu": 15.1, "ic_bacak": -0.0 },
    "leg_length": { "boy": 28.7, "gogus": -0.3, "bel": 0.2, "kalca": -0.9, "kilo": 7.3, "kol_boyu": -0.2, "ic_bacak": 28.4 }
  },

  "ornekler": [
    {
      "agirliklar": { "height": 0.64, "chest": 0.03, "waist": 0.28, "hip": 0.22, "weight": 0.74, "arm_length": 0.68, "leg_length": 0.89 },
      "olculen":    { "boy": 186.6, "gogus": 92.9, "bel": 83.0, "kalca": 112.4, "kilo": 83.6, "kol_boyu": 58.5, "ic_bacak": 95.4 }
    }
  ]
}
```

| Alan | Anlamı |
|---|---|
| `birim` | çevre ve uzunluk ölçülerinin birimi (`cm`) |
| `birim_kilo` | `kilo` ölçüsünün birimi (`kg`); diğerlerinden farklı olduğu için ayrı yazılır |
| `yogunluk_kg_l` | hacimden kiloya çeviren yoğunluk (kg/L) |
| `taban` | doğrusal modelin sabit terimi (bütün key'ler 0 iken beklenen ölçü) |
| `etki[key][olcu]` | o key 0'dan 1'e giderken o ölçünün beklenen değişimi |
| `ornekler` | karışık ağırlıklarla alınmış ham ölçümler; doğrusal yaklaşımın hatasını raporlamak için |

Model şu doğrusal varsayıma dayanır:

```
olcu = taban[olcu] + Σ  etki[key][olcu] × agirlik[key]
                   key
```

`ornekler` bu varsayımın ne kadar tuttuğunu gösterir. Eşikler ölçü türüne göre ayrıdır:

| Ölçü | Eşik | Neden |
|---|---|---|
| `boy`, `gogus`, `bel`, `kalca`, `kol_boyu`, `ic_bacak` | 1 cm | uzunluk ve çevreler shape key'lerle neredeyse doğrusal değişir |
| `kilo` | 4 kg | hacim kabaca boy × çevre² ile büyür, doğrusal değil |

Bir ölçünün ortalama sapması kendi eşiğini geçerse doğrusal model o ölçü için yetmiyor
demektir; o zaman `ornekler` genişletilir ve çözücü ara değerleri tablodan okur (bu durumda
biçim `surum: 2` ile değişir).

Sapma tek örnekten değil, bütün `ornekler` üzerinden ortalanarak ölçülür.
Uyumda kullanılmayan 12 örnekte bugünkü ortalama sapmalar (cm; kilo kg); hepsi eşiğin altında:

| Model | boy | göğüs | bel | kalça | kol_boyu | ic_bacak | kilo |
|---|---|---|---|---|---|---|---|
| `avatar_kadin` | 0,02 | 0,36 | 0,28 | 0,4 | 0,37 | 0,04 | 1,78 |
| `avatar_erkek` | 0,02 | 0,46 | 0,67 | 0,54 | 0,34 | 0,03 | 1,22 |

Gerçek insanlarla sınama (ANSUR II, 20 kişi, çözücü → avatar → ölçüm):
`ml/results/olcu-dogrulugu/rapor.md`.

### Kurallar

- Alan ve key adları buradaki yazımla **birebir** aynıdır; ölçü adları Türkçe
  (`boy`, `gogus`, `bel`, `kalca`, `kilo`, `kol_boyu`, `ic_bacak`), key adları İngilizce
  (`height`, `chest`, `waist`, `hip`, `weight`, `arm_length`, `leg_length`).
- Ölçü adları Supabase'deki `measurements` tablosunun sütunlarıyla eşleşir:

  | Ölçü | Sütun |
  |---|---|
  | `boy` | `boy_cm` |
  | `gogus` | `gogus_cm` |
  | `bel` | `bel_cm` |
  | `kalca` | `kalca_cm` |
  | `kilo` | `kilo_kg` |
  | `kol_boyu` | `kol_boyu_cm` |
  | `ic_bacak` | `ic_bacak_cm` |

  `kilo_kg` boş bırakılabilir: kilo hassas bir bilgi ve kullanıcı girmek zorunda değil. Boşsa
  çözücüye `kilo` hedefi verilmez, `weight` key'i diğer ölçülerden çözülür. `kol_boyu_cm` ve
  `ic_bacak_cm` de boş bırakılabilir (çoğu kullanıcı bilmez); boşsa `arm_length` ve `leg_length`
  diğer ölçülerden çözülür.
- Sayılar en fazla bir ondalık basamakla yazılır.
- `avatar_erkek.calib.json` aynı biçimdedir, yalnızca sayılar değişir.
- Yukarıdaki **Avatar** bölümündeki tablonun "0 değeri" sütunu `taban`, "1 değeri" sütunu
  `taban + etki[key][kendi ölçüsü]` demektir; tablo o dosyadan doldurulur.

### Kıyafet şablonu kalibrasyonu

`sablon_<tur>_<model>.calib.json` aynı yapıyı kullanır, yalnızca adlar değişir:

- `keyler`: `["length", "width", "sleeve"]` (kolsuz türlerde `sleeve` yok)
- `olcumler`: `["boy", "en", "kol"]` — Supabase'deki `size_charts` sütunlarıyla aynı
- Şablonun vücut key'leri (`height`, `chest`, `waist`, `hip`, `weight`) `keyler`'de **yer almaz**;
  onlar avatardan çözülen ağırlıklarla doğrudan aynı değere set edilir, yeniden çözülmez.
- Ama vücut key'leri kıyafetin ölçüsünü de değiştirir (daha büyük göğüslü vücuttaki tişört de
  daha geniştir). Bu etki `govde_etki` alanında taşınır: vücut key'i 0'dan 1'e giderken kıyafet
  ölçüsünün değişimi (cm). Ürün key'leri çözülürken önce taban vücuda göre kaydırılır:

  ```
  taban_efektif[olcu] = taban[olcu] + Σ govde_etki[vkey][olcu] × vucut_agirligi[vkey]
  olcu = taban_efektif[olcu] + Σ etki[key][olcu] × agirlik[key]
  ```

  Ölçüm (#41): 27 durumda ortalama hata vücut etkisi yok sayılınca 6,8 cm, bu formülle 3,2 cm.
  `en` için vücut key'lerinin toplam etkisi (32,5 cm) `width` key'inin aralığının 2,5 katı.

Pantolon ve etek için bu üç key yetmiyor: beden tablosunda `bel_cm`, `kalca_cm` ve
`ic_bacak_cm` da var. `sablon_pantolon` için `waist`, `hip`, `inseam` key'leri gerekiyor.
Karara bağlanınca buraya yazılacak.

## Ölçü çözücü

Kullanıcının cm cinsinden ölçülerini shape key ağırlıklarına çevirir. Tarayıcıda çalışır
(TypeScript), `apps/web` içinden çağrılır.

### Girdi

```ts
type OlcuAdi = 'boy' | 'gogus' | 'bel' | 'kalca' | 'kilo' | 'kol_boyu' | 'ic_bacak';
type KeyAdi  = 'height' | 'chest' | 'waist' | 'hip' | 'weight' | 'arm_length' | 'leg_length';

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
`Σ (ulasilan − hedef)²` en küçüklenir. Yedi bilinmeyen ve en çok yedi denklem olduğu için
küçük bir yineleyici çözüm (projected gradient) yeterlidir; dış kütüphane gerekmez.

### Sınır durumları

- Kullanıcının ölçüsü avatarın kapsadığı aralığın dışındaysa ağırlık 0 veya 1'e dayanır ve
  o key `sinirda` listesine girer. Hesap yine de sürer.
- **Arayüz uyarıyı `sinirda`'ya değil `fark`'a bakarak gösterir.** Bir ağırlığın sınıra
  dayanması tek başına sorun değil: key'ler birbirinin yerini tutabildiği için çözücü
  ölçüyü başka bir key'le yakalayabilir. Ölçünün gerçekten tutturulamadığını `fark`
  söyler. `sinirda` tanı amaçlıdır — hangi key'in manevra alanı kalmadığını gösterir.
- `fark` ölçü başına ayrı döner, çünkü 3 cm'lik bel hatası ile 3 cm'lik boy hatası aynı şey
  değildir. Raporlanan ölçüt `ortalamaHataCm`'dir (ölçü doğruluğu testi, #34).
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

Tablodaki v, Blender'ın UV ekseninde (v yukarı). GLB'de dışa aktarıcı v'yi ters çevirir
(glTF: 0,0 sol üst köşe), yani GLB'deki `TEXCOORD_0` için gövde v 0–0,73, kollar v 0,75–1'dir.

Tişörtte (`sablon_tisort_kadin.glb`, `sablon_tisort_erkek.glb`) yönler:

- Gövde: u = sağ yan (0) → ön orta (0,25) → sol yan (0,5) → arka orta (0,75) → sağ yan (1).
  Ön, karşıdan bakınca göründüğü gibi; arka, arkadan bakınca göründüğü gibi durur.
  v etekten (0,27) yakaya (1) çıkar.
- Kollar: sağ kol u 0–0,5, sol kol u 0,5–1. Her kolda u = koltuk altı → ön → üst → arka;
  v omuzdan (0,25) manşete (0) iner.

## Anahtar noktalar (yapay zekâ ↔ şablon)

Tişört için 7 nokta. Kanonik sıra:
`0 yaka_orta, 1 omuz_sol, 2 omuz_sag, 3 kol_sol, 4 kol_sag, 5 etek_sol, 6 etek_sag`
Her noktanın şablonun UV'sindeki karşılığı `sablon_<tur>_<model>.keypoints.json` dosyasında tutulur.

**Noktalar isimle eşleştirilir, dizideki sırayla değil.** Yukarıdaki sıra bu belgenin ve
`sablon_<tur>_<model>.keypoints.json`'un kanonik sırasıdır, ama etiket dosyasından okunan noktalar
adlarına bakılarak eşlenir. Sebebi: CVAT dışa aktarmada iskeleti çizerken kullanılan noktalama
sırasını yazıyor ve bu sıra buradakiyle aynı olmak zorunda değil — nitekim değil. Adlar
dosyada da taşındığı için isimle eşleştirmek hem çalışıyor hem de konuma dayalı varsayımdan
daha sağlam.

**Sol ve sağ, giyen kişinin solu ve sağıdır**, görsele bakanın değil. Düz serili bir tişörtte
ekranda solda duran kol `kol_sag`'dır.
