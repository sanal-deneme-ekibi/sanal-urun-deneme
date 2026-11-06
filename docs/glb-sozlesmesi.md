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
