# Veri toplama protokolü ve etiket şeması

Hangi görselleri, nereden, nasıl toplayacağımız ve CVAT'ta nasıl etiketleyeceğimiz.
Üç üye de etiketlemeye katılır, bu yüzden herkesin aynı kuralları uygulaması gerekir.

İlgili dosyalar: [ml/README.md](README.md) · [docs/glb-sozlesmesi.md](../docs/glb-sozlesmesi.md) · [docs/calisma-kurallari.md](../docs/calisma-kurallari.md)

---

## 1. Hangi veriyi topluyoruz

| Kaynak | İçerik | Hangi model | Nasıl elde edilir |
|---|---|---|---|
| DeepFashion2 | ~491 bin görsel, 13 tür, maske + anahtar nokta | 1, 2, 3 | Başvuru formu (#10) |
| Fashionpedia | Segmentasyon maskeleri | 2 (ek veri) | Açık indirme |
| VITON-HD | Düz ürün fotoğrafları | 2 (ek veri) | Açık indirme |
| ANSUR II | Vücut ölçüleri (binlerce kişi) | Avatar aralıkları, 4 | Açık indirme |
| **Kendi setimiz** | 800–1500 Türk e-ticaret ürün görseli | İnce ayar, test | Elle toplanır |
| **Kendi setimiz** | 60–90 kendi kıyafetimiz, mezurayla ölçülmüş | Uçtan uca ölçü doğrulama | Kendimiz çekeriz |
| **Kendi setimiz** | 300–500 beden tablosu | Ölçü çözücü testi | Ürün sayfasından |

Hazır modeller (CLIP, SAM, rembg) yalnızca kıyaslama içindir; eğitim verisi üretmezler.

### Hedef dağılım (kendi setimiz)

Beş tür arasında dengeli olmalı, yoksa Model 1 çoğunluk sınıfa kayar.

| Tür | Hedef görsel |
|---|---|
| `tisort` | 200–300 |
| `pantolon` | 200–300 |
| `gomlek` | 150–250 |
| `elbise` | 150–250 |
| `etek` | 100–200 |

Her tür içinde en az %30'u manken/insan üzerinde, en az %30'u düz (katlanmış veya askıda) olsun. Model ikisini de görmeli.

---

## 2. Toplama kuralları

### Toplanır

- Ürünün tek başına göründüğü, 400×400 pikselden büyük görseller
- Arka planı sade olanlar **ve** karışık olanlar (ikisi de lazım)
- Ürün sayfasındaki beden tablosu (ekran görüntüsü değil, sayı olarak CSV'ye)

### Toplanmaz

- İnsan yüzünün tanınabildiği görseller — yüz görünüyorsa görsel kırpılır
- Filigranlı (watermark) görseller
- Aynı ürünün farklı açılardan 2'den fazla fotoğrafı (set şişer, çeşitlilik artmaz)
- 5 tür dışındaki ürünler (ayakkabı, çanta, mont, iç giyim)

### Yasal ve etik sınır

- E-ticaret görselleri **yalnızca araştırma için** kullanılır.
- Veri seti **yayınlanmaz**, repoya konmaz, üçüncü kişiyle paylaşılmaz.
- Raporda örnek görsel gösterilecekse kendi çektiğimiz fotoğraflardan seçilir.
- Her görselin kaynak linki `kaynak.csv` içinde tutulur; kaynağı belirsiz görsel sete girmez.
- Site `robots.txt`'ine uyulur; toplu indirme betiği yazılmaz, görseller elle alınır.

---

## 3. Dosya düzeni ve adlandırma

Veri **repoya girmez**. Google Drive'da ortak klasörde durur:

```
sanal-urun-deneme-veri/
  ham/                      toplanan görseller, dokunulmamış
    tisort/
    pantolon/
    gomlek/
    elbise/
    etek/
  etiketli/                 CVAT'tan dışa aktarılan
    train/  val/  test/
  kendi-kiyafetlerimiz/     mezurayla ölçtüğümüz 60-90 parça
  kaynak.csv                her görselin kaynağı
  beden-tablolari.csv       300-500 beden tablosu
```

Repoda yalnızca indirme ve hazırlama betikleri bulunur (`ml/scripts/`).

### Görsel adı

```
<tur>_<kaynak>_<sira>.jpg        tisort_tr01_0042.jpg
```

- `<tur>`: `tisort` · `pantolon` · `gomlek` · `elbise` · `etek` (GLB sözleşmesiyle birebir aynı)
- `<kaynak>`: site kısaltması (`tr01`, `tr02`…) veya `kendi`
- `<sira>`: 4 haneli, sıfır dolgulu

### kaynak.csv

| Sütun | Örnek |
|---|---|
| `dosya` | `tisort_tr01_0042.jpg` |
| `url` | ürün sayfasının adresi |
| `tarih` | `2026-11-05` |
| `toplayan` | `zeynep` |

### beden-tablolari.csv

| Sütun | Örnek |
|---|---|
| `urun_id` | `tisort_tr01_0042` |
| `beden` | `M` |
| `boy_cm` | `70` |
| `en_cm` | `52` |
| `kol_cm` | `21` |

Sütun adları Supabase'deki `size_charts` tablosuyla aynı, böylece doğrudan aktarılır.

---

## 4. CVAT etiket şeması

Proje adı: `sanal-urun-deneme`. Üç etiket türü aynı anda kullanılır.

### 4.1 Tür (sınıflandırma — Model 1)

Her görsele tam bir tür etiketi. Görselde birden fazla ürün varsa (örn. tişört + pantolon giymiş manken) **her ürün ayrı maske alır** ve her maskenin kendi türü olur.

| Etiket | Karşılığı |
|---|---|
| `tisort` | kısa kollu, yakasız üst |
| `gomlek` | düğmeli, yakalı üst |
| `elbise` | tek parça, üst + alt birleşik |
| `pantolon` | iki paçalı alt |
| `etek` | tek parçalı alt |

Sınırda kalan durumlar:

- **Uzun kollu yakasız üst** → `tisort`
- **Tulum** → sete girmez
- **Şort** → `pantolon`
- **Elbise + ceket** → yalnızca elbise etiketlenir, ceket atlanır

### 4.2 Maske (segmentasyon — Model 2)

- CVAT şekli: **Polygon**
- Etiket adı: türün kendisi (`tisort`, `pantolon`, …)
- Yalnızca kumaş; ten, saç, arka plan, askı, manken ayağı dışarıda kalır
- Ürünün arkasından görünen parçalar (örn. kolun arkası) maskeye **dahil edilmez**
- Kıyafet başka bir şeyle örtülüyorsa yalnızca görünen kısım çizilir
- Poligon 200 noktayı geçmesin; kıvrımlar makul sadelikte

Nitelik (attribute):

| Nitelik | Değerler | Anlamı |
|---|---|---|
| `gorunum` | `duz` · `manken` · `insan` | ürün nasıl sergilenmiş |
| `kirpik` | `evet` · `hayir` | ürünün bir kısmı kadraj dışında mı |

### 4.3 Anahtar noktalar (Model 3)

- CVAT şekli: **Skeleton** (7 nokta)
- Yalnızca `tisort` için (1. dönem). Diğer türler 2. dönemde eklenir.
- Nokta sırası GLB sözleşmesiyle **birebir aynı olmalı**, yoksa desen bükme yanlış yere oturur:

| # | Ad | Nerede |
|---|---|---|
| 0 | `yaka_orta` | yaka açıklığının ön ortası |
| 1 | `omuz_sol` | sol omuz dikişinin en dış noktası |
| 2 | `omuz_sag` | sağ omuz dikişinin en dış noktası |
| 3 | `kol_sol` | sol kol ucunun orta noktası |
| 4 | `kol_sag` | sağ kol ucunun orta noktası |
| 5 | `etek_sol` | alt kenarın sol köşesi |
| 6 | `etek_sag` | alt kenarın sağ köşesi |

**Sol/sağ, görsele bakanın değil, kıyafeti giyen kişinin solu ve sağıdır.** Düz serili bir tişörtte bakanın solundaki kol, giyenin sağ koludur.

Görünmeyen nokta (örn. kol arkada kalmış) `occluded` işaretlenir, silinmez — Model 3 nokta sayısını sabit bekler.

---

## 5. Veri bölme

| Bölüm | Oran | Kullanım |
|---|---|---|
| `train` | %70 | eğitim |
| `val` | %15 | hiperparametre ve erken durdurma |
| `test` | %15 | yalnızca son rapor |

- Bölme **ürün bazında** yapılır, görsel bazında değil: aynı ürünün iki fotoğrafı farklı bölümlere düşmemeli, yoksa test sonucu olduğundan iyi çıkar.
- `test` bölümüne eğitim sırasında **hiç bakılmaz**.
- Bölme `ml/scripts/bol.py` ile sabit `seed` kullanılarak yapılır; sonuç tekrarlanabilir olmalı.

---

## 6. Dışa aktarma

- CVAT'tan format: **COCO 1.0** (maske ve anahtar nokta aynı formatta taşınır)
- Dışa aktarılan dosya: `etiketli/<bolum>/annotations.json`
- Her dışa aktarma sonrası `ml/scripts/dogrula.py` çalıştırılır: tür adları listeye uyuyor mu, her tişört maskesinin 7 noktası var mı, poligonlar kapalı mı.

---

## 7. Kalite kontrol

- Her üye kendi etiketlediğinin **%10'unu** başka bir üyeye çapraz kontrol ettirir.
- İlk 50 görsel üçü birlikte etiketlenir; sınırda kalan durumlar burada konuşulur ve bu belgeye eklenir.
- Anlaşmazlık ölçütü: aynı 20 görseli üç kişi ayrı ayrı etiketler, maske mIoU'su %85'in altındaysa kurallar netleştirilir.
- Düzeltilen her kural bu belgeye yazılır; belge değişince PR ile gelir.

---

## 8. Kim ne yapıyor

| İş | Kim |
|---|---|
| DeepFashion2 başvurusu (#10) | C |
| Bu belge ve etiket şeması | C |
| CVAT projesinin kurulması | C |
| Görsel toplama | A, B, C (tür başına paylaşılır) |
| Etiketleme | A, B, C |
| Kendi kıyafetlerimizin ölçülmesi | A, B, C |
| Doğrulama betikleri | C |
