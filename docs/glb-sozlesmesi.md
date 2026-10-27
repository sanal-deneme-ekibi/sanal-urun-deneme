# GLB sözleşmesi (taslak – 2. hafta sonunda sabitlenir)

Üç kişinin aynı dili konuşması için 3B dosyaların uyması gereken kurallar.

## Genel

- Format: `.glb` (glTF 2.0, ikili), Draco sıkıştırma açık
- Birim: metre · Yukarı yön: +Y (Blender dışa aktarımında "+Y Up")
- Poz: A-pozu, iskelet (rig) yok
- Üçgen bütçesi: avatar ≤ 20.000, kıyafet ≤ 10.000, gözlük ≤ 5.000

## Avatar

- Dosya adları: `assets/models/avatar_kadin.glb`, `assets/models/avatar_erkek.glb`
- Mesh adı: `Avatar`
- Vücut shape key'leri (0–1 arası):

| Shape key | Anlamı | 0 değeri | 1 değeri |
|---|---|---|---|
| `height` | boy | _cm_ | _cm_ |
| `chest` | göğüs çevresi | _cm_ | _cm_ |
| `waist` | bel çevresi | _cm_ | _cm_ |
| `hip` | kalça çevresi | _cm_ | _cm_ |

Gerçek cm değerleri ölçüm betiğinin kalibrasyon tablosundan gelir: `assets/models/avatar_kadin.calib.json`

## Kıyafet şablonları

- Dosya adları: `assets/models/sablon_<tur>.glb` → `tisort`, `pantolon`, `gomlek`, `elbise`, `etek`
- Mesh adı: `Garment`
- Avatarla **aynı adlı** vücut shape key'leri: `height`, `chest`, `waist`, `hip`
- Ürün ölçüsü shape key'leri: `length` (boy), `width` (en), `sleeve` (kol; yoksa eklenmez)
- Kalibrasyon: `assets/models/sablon_<tur>.calib.json`

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
