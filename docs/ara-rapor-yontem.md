# Ara rapor — Yöntem bölümü (taslak)

Bu belge ara raporun yöntem bölümünün taslağıdır (#35). Rapora kopyalanmadan önce ekip
okumalı; sonundaki **Rapora girmeden önce kapatılacaklar** listesi henüz kapanmadı.

Kaynak belgeler: [`ml/veri-protokolu.md`](../ml/veri-protokolu.md) ·
[`docs/glb-sozlesmesi.md`](glb-sozlesmesi.md) · [`services/ai/README.md`](../services/ai/README.md)

> **Sayılar hakkında:** bu taslakta yer alan ölçüm sonuçları yalnızca çalıştırılıp
> kaydedilmiş olanlardır. Model 1 metrikleri (#33) ve ölçü doğruluğu testi (#34) henüz
> çalışmadı; o tablolar `ml/results/` altındaki gerçek çıktılarla doldurulacak, buraya
> tahmini değer yazılmayacak.

---

## 1. Sistemin genel akışı

Kullanıcı almak istediği kıyafetin fotoğrafını yükler. Sistem sırasıyla şunları yapar:

1. **Tür tanıma** — ürün beş türden hangisi (tişört, gömlek, elbise, pantolon, etek).
2. **Segmentasyon** — ürünün kumaş maskesi çıkarılır, arka plan ve manken ayıklanır.
3. **Anahtar nokta bulma** — maskenin üzerinde sabit sayıda yapısal nokta bulunur
   (tişört için 7: yaka ortası, iki omuz, iki kol ucu, iki etek ucu).
4. **Desen bükme** — ürünün dokusu, anahtar noktalar kullanılarak 3B kıyafet şablonunun
   standart UV düzenine oturtulur.
5. **Giydirme** — şablon, kullanıcının ölçüleriyle şekillenmiş kişisel avatara giydirilir.

Buna paralel iki hat daha çalışır: kullanıcının cm cinsinden ölçüleri avatarın shape key
ağırlıklarına çevrilir (**ölçü çözücü**), ve ürün sayfasındaki beden tablosu avatarın
ölçüleriyle karşılaştırılarak **beden uygunluğu** dar/uygun/bol olarak sunulur.

Birinci dönemin kapsamı: 1–3. adımların veri altyapısı ve eğitimi, ölçü çözücü, beden
uygunluğu, servis sözleşmesi ve veri tabanı şeması. 4. ve 5. adımlar ikinci döneme bırakıldı.

---

## 2. Yapay zekâ hattı ve modeller

### 2.1 Model 1 — tür sınıflandırma

Beş sınıflı sınıflandırma. Mimari olarak **EfficientNet-B0** (alternatif: MobileNetV3)
seçildi; önceden eğitilmiş ağırlıklarla başlatılıp DeepFashion2 ile ön eğitim, kendi
setimizle ince ayar yapılacak.

Modelin gördüğü girdi **görselin tamamı değil, kırpılmış üründür**. Kırpma, segmentasyon
maskesinin sınırlayıcı kutusundan %5 pay bırakılarak üretilir (`ml/scripts/kirp.py`). Bu
seçimin gerekçesi: bir manken fotoğrafında hem tişört hem pantolon bulunur; kırpma sayesinde
tek fotoğraf iki ayrı eğitim örneği verir ve iki sınıf birbirine karışmaz. Çalışma zamanında
kullanıcı tek ürün yüklediği için görselin tamamı zaten o ürünün kırpılmış hâlidir.

Sınıf tanımı kumaş ya da kol uzunluğuna değil tek bir yapısal kurala bağlandı: **boydan boya
düğme sırası ve yakası olan üst `gomlek`, olmayan `tisort`.** Polo yaka, kazak ve uzun kollu
yakasız üstler bu kurala göre `tisort` sayılır. Kurala rağmen tereddüt edilen görsel
etiketlenmez, haftalık toplantıda karara bağlanır ve karar protokole eklenir. Amaç
etiketleyiciler arası tutarlılık: üç kişi etiketlediği için öznel sınırlar sistematik
gürültü üretir.

**Kıyas:** CLIP, eğitimsiz ve sıfır örnekli. Karşılaştırmada doğruluk tek başına değil,
**çıkarım süresi (ms) ve model boyutu (MB)** de raporlanacak.

### 2.2 Model 2 — segmentasyon

Ürünün kumaş maskesini çıkarır. Maskeye yalnızca kumaş girer; ten, saç, arka plan, askı ve
manken ayağı dışarıda kalır. Ürünün arkasından görünen parçalar (örneğin kolun arkası)
maskeye dâhil edilmez, örtülü kıyafette yalnızca görünen kısım çizilir.

Eğitim verisi CVAT'ta poligon olarak etiketlenir. Her maskeye iki nitelik yazılır:
`gorunum` (düz / manken / insan) ve `kirpik` (ürünün bir kısmı kadraj dışında mı).
`gorunum` niteliği hem bölmede katman değişkeni olarak kullanılır hem de modelin her iki
sergileme biçimini de görmesini güvence altına alır.

### 2.3 Model 3 — anahtar nokta bulma

Tişört için 7 nokta: `yaka_orta`, `omuz_sol`, `omuz_sag`, `kol_sol`, `kol_sag`, `etek_sol`,
`etek_sag`. Sol ve sağ **giyenin** solu ve sağıdır, bakanın değil.

İki tasarım kararı:

- **Nokta sayısı sabittir.** Görünmeyen nokta (örneğin kol arkada kalmış) silinmez,
  `occluded` işaretlenir; model sabit uzunlukta çıktı bekler.
- **Noktalar isimle eşleştirilir, sırayla değil.** CVAT'ın dışa aktarmada sırayı
  değiştirebildiği görüldüğü için hem doğrulama betiği hem dönüştürücü eşleştirmeyi isim
  üzerinden yapar. Sıra bağımlılığı sessiz bir hata kaynağıdır: yanlış sıralanmış noktalar
  desen bükmeyi yanlış yere oturtur ve bu ancak görsel sonuçta fark edilir.

### 2.4 Model 4

> **Eksik.** Dördüncü model depodaki hiçbir belgede tanımlı değil. Rapora girmeden önce
> ekipçe karara bağlanması gerekiyor: hangi görevi yapacak (fotoğraftan vücut ölçüsü kestirimi
> mi, desen bükme ağı mı, başka bir şey mi), hangi dönemde, hangi veriyle. Bu taslakta
> uydurulmadı.

---

## 3. Veri seti

### 3.1 Kaynaklar ve lisans koşulları

| Kaynak | İçerik | Kullanım | Lisans / koşul |
|---|---|---|---|
| DeepFashion2 | ~491 bin görsel, 13 tür, maske + anahtar nokta | Model 1–3 ön eğitim | Başvuru formu ile erişim. Yalnızca ticari olmayan araştırma; görsellerin telifi CUHK'de değil; çoğaltma, satış ve dağıtım yasak (kurum içi kendi kullanımı istisna); erişim her an kesilebilir |
| Fashionpedia | Segmentasyon maskeleri | Model 2 ek veri | Etiketler ve ontoloji **CC BY 4.0**. Görsellerin telifi Fashionpedia'da değil; Flickr, Unsplash, Pexels gibi sağlayıcıların kendi koşulları geçerli. Ticari olmayan kısıt yok |
| VITON-HD | Düz ürün fotoğrafları | Model 2 ek veri | **CC BY-NC 4.0** — ticari olmayan kullanım, makaleye atıf ve yapılan değişikliklerin belirtilmesi şartıyla. Veri seti açıkça yalnızca araştırma amaçlı |
| ANSUR II | Binlerce kişinin vücut ölçüsü | Avatar aralıkları, ölçü doğruluğu testi | ABD Ordusu Natick tarafından 2017'de kamuya açıldı; ilgili teknik raporlar "approved for public release, distribution unlimited" ibaresi taşır |
| Kendi setimiz | 800–1500 Türk e-ticaret ürün görseli | İnce ayar ve test | Yalnızca araştırma; yayınlanmaz, depoya konmaz, üçüncü kişiyle paylaşılmaz |
| Kendi setimiz | 60–90 kendi kıyafetimiz, mezurayla ölçülmüş | Uçtan uca ölçü doğrulama | Kendi çektiğimiz fotoğraflar; raporda örnek görsel bunlardan seçilir |
| Kendi setimiz | 300–500 beden tablosu | Ölçü çözücü testi | Ürün sayfasından sayı olarak alınır |

### 3.2 Kendi setimiz neden gerekli

Hazır setler Türk e-ticaret sitelerinin görsel diliyle eşleşmiyor ve hiçbiri **beden tablosu**
içermiyor. Projenin ayırt edici tarafı ürünün gerçek ölçülerini kullanması olduğu için,
görsel ile o ürünün beden tablosunu birlikte içeren bir sete ihtiyaç var; bu yalnızca elle
toplanarak elde edilebiliyor.

Tür dağılımı dengeli tutuluyor (tişört ve pantolon 200–300, gömlek ve elbise 150–250, etek
100–200), aksi hâlde Model 1 çoğunluk sınıfa kayar. Her tür içinde en az %30 düz, en az %30
manken/insan olması şartı var.

### 3.3 Toplama kuralları

Toplu indirme betiği yazılmıyor, görseller elle alınıyor ve sitelerin `robots.txt`
kurallarına uyuluyor. Filigranlı görseller alınmıyor; aynı ürünün ikiden fazla fotoğrafı
alınmıyor (set şişer, çeşitlilik artmaz). Her görselin kaynak linki `kaynak.csv`'de tutuluyor;
kaynağı belirsiz görsel sete girmiyor.

**İnsan yüzü:** yüz görünen görsel atılmıyor, yüz bulanıklaştırılıyor (OpenCV yüz bulma +
Gaussian, `ml/scripts/yuz_bulanik.py`). Kırpma tercih edilmedi, çünkü yakadan kesilen bir
tişörtte `yaka_orta` anahtar noktası kaybolur ve görsel Model 3 için kullanılamaz hâle gelir.
Bulanıklaştırılmış görsel orijinalinin yerine geçer, orijinal saklanmaz.

### 3.4 Etiketleme ve dışa aktarma

Etiketleme CVAT üzerinde, üç üyenin de aynı şema ile çalıştığı tek bir projede yapılıyor.
Şema: beş tür için poligon etiketi (`gorunum` ve `kirpik` nitelikleriyle) ve tişört için
7 noktalı ayrı bir iskelet etiketi.

**Dışa aktarma biçimi ölçülerek seçildi.** Üç görsellik bir deneme görevinde maske, 7 nokta
ve nitelikler elle yazılıp üç biçim de denendi:

| Biçim | Maske | 7 nokta | `gorunum` / `kirpik` |
|---|---|---|---|
| COCO 1.0 | var | **sessizce düşüyor** | var |
| COCO Keypoints 1.0 | yok | var | yok |
| Datumaro 1.0 | var | var | var |

COCO 1.0'ın davranışı özellikle tehlikeli: nokta adları `categories` bölümünde göründüğü için
dosyaya bakıldığında noktalar varmış gibi durur, ama `annotations` bölümünde tek bir anahtar
nokta yoktur. Bu deneme yapılmasaydı kayıp ancak model eğitimi aşamasında fark edilecekti.

Sebep şemada bir hata değil: CVAT iskeleti ayrı bir etiket olarak tutar, poligon etiketinin
içine nokta gömülemez. Bu yüzden dışa aktarma Datumaro 1.0 ile yapılıyor ve
`ml/scripts/birlestir.py` ile tek bir COCO dosyasına çevriliyor; eğitim tarafı standart COCO
okumaya devam ediyor. Maske ile iskeleti CVAT'ın grup numarasından eşleşiyor; bir görselde
birden çok kıyafet varsa gruplama zorunlu, gruplanmamışsa betik sessizce yanlış eşleştirmek
yerine hata verip duruyor.

Her dışa aktarmadan sonra `ml/scripts/dogrula.py` çalıştırılıyor: tür adları listeye uyuyor mu,
her tişört maskesinin 7 noktası var mı, poligonlar kapalı mı, nitelikler dolu mu.

### 3.5 Bölme

Eğitim / doğrulama / test ayrımı %70 / %15 / %15. İki kural var:

- **Bölme ürün bazlıdır, görsel bazlı değil.** Aynı ürünün ikinci fotoğrafı `-2` ekiyle
  adlandırılıyor ve bölme betiği ikisini aynı ürün sayıp aynı bölüme koyuyor. Aksi hâlde aynı
  ürünün bir fotoğrafı eğitimde diğeri testte kalır ve test sonucu olduğundan iyi çıkar.
- **Bölme tür ve görünüm değişkenlerine göre katmanlı yapılır**, böylece test bölümünde her
  türden ve her sergileme biçiminden örnek bulunur.

Bölme sabit bir rastgelelik tohumuyla üretiliyor, yani tekrarlanabilir (`ml/scripts/bol.py`).

---

## 4. Ölçü çözücü

### 4.1 Problem

Avatar, Blender'da tanımlanmış beş shape key ile şekilleniyor: `height`, `chest`, `waist`,
`hip`, `weight`. Her key 0–1 arasında bir ağırlık alıyor. Kullanıcı ise cm cinsinden ölçü
giriyor. Çözücünün işi bu dönüşümü ters yönde yapmak: verilen ölçülere en yakın avatarı
üreten ağırlıkları bulmak.

Zorluk, key'lerin birbirinden bağımsız olmaması. `weight` bütün çevreleri büyütüyor, `height`
kiloyu artırıyor. Yani tek bir ölçüyü tek bir key'le ayarlamak mümkün değil.

### 4.2 Kalibrasyon tablosu ve doğrusal model

Her key'in her ölçüye etkisi Blender'da bir kez ölçülüp kalibrasyon dosyasına yazılıyor
(`assets/models/avatar_kadin.calib.json`). Model doğrusal:

```
olcu = taban[olcu] + Σ etki[key][olcu] × agirlik[key]
```

Doğrusallık varsayımı dosyadaki örnek ağırlık kümeleriyle doğrulanıyor: tahmin ile ölçülen
arasındaki en büyük fark 0,1 cm mertebesinde kalıyor; bu, kayıtlı ölçümlerin 0,1 cm'e
yuvarlanmış olmasıyla aynı büyüklükte, yani varsayım bu aralıkta tutuyor.

### 4.3 Yöntem

Ağırlıklar 0–1 aralığında kalmak koşuluyla `Σ (ulasilan − hedef)²` en küçükleniyor:
**sınırlı en küçük kareler**, izdüşümlü gradyan (projected gradient) ile çözülüyor. En çok
beş bilinmeyen ve beş denklem olduğu için küçük bir yineleyici çözüm yetiyor, dış kütüphane
gerekmiyor ve hesap tarayıcıda çalışıyor.

Her ölçünün bir önem katsayısı var; boy diğerlerinden yüksek tutuldu, çünkü boy hatası
görsel olarak en çabuk fark edilen hata.

### 4.4 Kilo kararı

Avatar aynı anda hem çevreleri hem kiloyu tutturamıyor. Ölçüldü: kilo hedefe eklenmediğinde
normal aralıklarda çevre hatası 0,0 cm'ye iniyor; kilo hedefe eklendiğinde çevre hatası
0,5–1,5 cm'ye çıkıyor ve kilo yine de 7–14 kg sapıyor. Kıyafet uygunluğu çevrelere bağlı
olduğu için **arayüz kiloyu hedef olarak vermiyor**. Kilo yine de sözleşmede duruyor:
kalibrasyon dosyası taşıyor ve çözücü verildiğinde kullanıyor.

### 4.5 Sınır durumları

Kullanıcının ölçüsü avatarın kapsadığı aralığın dışındaysa ilgili ağırlık 0 veya 1'e dayanıyor
ve o key `sinirda` listesine giriyor. Arayüz uyarıyı `sinirda`'ya değil ölçü başına dönen
`fark` değerine bakarak gösteriyor: bir ağırlığın sınıra dayanması tek başına sorun değil,
çünkü key'ler birbirinin yerini tutabiliyor ve çözücü ölçüyü başka bir key'le yakalayabiliyor.
Ölçünün gerçekten tutturulamadığını `fark` söylüyor; `sinirda` tanı amaçlı.

---

## 5. Beden uygunluğu

Çözücünün çıktısı uygunluk hesabının girdisi. Ürünün beden tablosundaki ölçüler avatarın
**ulaştığı** ölçülerle karşılaştırılıyor (kullanıcının yazdığı hedefle değil: kullanıcı
avatarda ne görüyorsa öneri de ona göre olmalı).

**Birim kuralı:** ürün ölçüleri düz serili genişliktir (ürün masaya serilmişken ölçülen en),
vücut ölçüleri çevredir. Karşılaştırma `urun_olcusu × 2` ile yapılıyor. `boy`, `kol` ve
`ic_bacak` uzunluk olduğu için çarpılmıyor; bunların vücutta karşılığı ölçülmediği için
uygunluk hesabına girmiyor ve kullanıcıya "karşılaştırılamayan" olarak bildiriliyor.

Türe göre bakılan ölçüler: tişört ve gömlekte göğüs; elbisede göğüs, bel, kalça; pantolonda
bel ve kalça; etekte bel ve kalça.

Sonuç tek bir etiket değil, **ölçü başına** dönüyor ("göğüs 4 cm dar"), çünkü beli uyan ama
kalçası dar bir pantolonu "dar" diye tek kelimeyle geçmek kullanıcıya bilgi vermiyor.

Eşikler (`dar: 4 cm`, `bol: 12 cm`) şu an ilk tahmin; gerçek ürünlerle ayarlanacak. Eşiklerin
tek bir yerde sabit tutulmasının nedeni bu.

İki kayan nokta hatası bu hesapta bulunup düzeltildi: eşiğe tam oturan payların yuvarlama
gürültüsüyle yanlış tarafa düşmesi, ve ortadan eşit uzaklıktaki iki bedenin arasında kazananın
gürültüyle belirlenmesi. İkincisi aynı kullanıcıya aynı ölçülerle farklı beden önerilmesi
anlamına geliyordu.

---

## 6. Servis ve veri tabanı

**Servis.** Yapay zekâ tarafı FastAPI ile ayrı bir servis olarak yazıldı. İlk uç nokta
`POST /tur`: görsel yüklenir, tür ve güven değeri döner. Model 1 henüz eğitilmediği için
cevap şu an sahte; yanıt `model_hazir: false` alanını taşıyor, böylece arayüz cevabın gerçek
olmadığını biliyor. Bu sıralama bilinçli: **sözleşme modelden önce sabitlendi**, arayüz uca
baştan bağlanabildi ve model gelince yalnızca içi değişecek. Dosya türü ve boyut denetimi
(5 MB sınırı) var, hatalar 400 ile dönüyor.

**Veri tabanı.** PostgreSQL (Supabase). Beş tablo: kullanıcı profilleri, ölçüler, ürünler,
beden tabloları ve denemeler. Yetkilendirme uygulama katmanında değil **veri tabanı
seviyesinde satır bazlı güvenlikle (RLS)** yapılıyor: bir kullanıcı yalnızca kendi
satırlarını görebiliyor. Gerekçe, ölçü ve vücut verisinin hassas olması; uygulama
katmanındaki bir hata bu durumda veriyi açığa çıkarmıyor.

Kilo sütunu isteğe bağlı bırakıldı, çünkü hassas bir bilgi ve kullanıcının girmesi zorunlu
değil. Beden tabloları için "en az bir ölçü dolu olmalı" kısıtı var; tür başına hangi
sütunların anlamlı olduğu değiştiği için tek tek zorunlu kılınmadı.

---

## 7. Araştırma sorusu ve deneyler

**Araştırma sorusu:** küçük ve hızlı bir model, sanal deneme hattında büyük bir temel modele
ne kadar yaklaşabilir? Ölçüt yalnızca doğruluk değil; çıkarım süresi ve model boyutu da
ölçütün parçası, çünkü hedef tarayıcıda ve telefonda çalışabilmek.

Bundan çıkan deneyler:

1. **Model 1 ile CLIP kıyası** (#33) — aynı test bölümünde doğruluk, F1, çıkarım süresi (ms)
   ve model boyutu (MB).
2. **Ölçü doğruluğu testi** (#34) — 20 farklı ölçü seti için çözücü → avatar → Blender ile
   gerçek ölçüm zinciri; ölçü başına ortalama ve en büyük fark. Bu aynı zamanda kalibrasyon
   tablosunun doğrusal varsayımının ne kadar tuttuğunu gösteriyor. Kabul eşikleri: çevreler
   için 1 cm, kilo için 4 kg.

---

## 8. Ölçülebilir sonuçlar

> Bu bölüm henüz doldurulamıyor. Aşağıdaki tablolar #33 ve #34 çalıştıktan sonra
> `ml/results/` altındaki çıktılardan alınacak; buraya elle sayı yazılmayacak.

**Tablo 1 — Model 1 ve CLIP kıyası** (ayrılmış test bölümü)

| Model | Doğruluk | F1 (makro) | Çıkarım süresi (ms) | Boyut (MB) |
|---|---|---|---|---|
| EfficientNet-B0 | — | — | — | — |
| CLIP (sıfır örnekli) | — | — | — | — |

Karışıklık matrisi ayrıca verilecek.

**Tablo 2 — Ölçü doğruluğu** (20 ölçü seti)

| Ölçü | Ortalama fark (cm) | En büyük fark (cm) | Eşik |
|---|---|---|---|
| Boy | — | — | 1 cm |
| Göğüs | — | — | 1 cm |
| Bel | — | — | 1 cm |
| Kalça | — | — | 1 cm |

Sınırda kalan setler ayrıca işaretlenecek.

---

## Rapora girmeden önce kapatılacaklar

- [ ] **Model 4 tanımlanmalı** (bölüm 2.4) — ekip kararı gerekiyor, bu taslakta uydurulmadı
- [ ] Tablo 1, #33 çalıştıktan sonra `ml/results/` çıktısından doldurulmalı
- [ ] Tablo 2, #34 çalıştıktan sonra `ml/results/` çıktısından doldurulmalı
- [ ] Ekip taslağı okumalı (özellikle 3B tarafı: bölüm 1'deki 4. ve 5. adımların anlatımı
      Tuğçe tarafından doğrulanmalı)
- [ ] ANSUR II'nin indirileceği kaynaktaki dağıtım ibaresi birebir teyit edilmeli
- [ ] Hocaya sunulacak demoyla tutarlılık kontrolü
