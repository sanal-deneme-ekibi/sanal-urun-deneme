# Ölçü doğruluğu testi (#34)

Uygulamanın ölçü çözücüsü, ANSUR II'den seçilen 20 gerçek kişinin (10 kadın, 10 erkek) ölçüleriyle çalıştırıldı; bulunan ağırlıklarla avatar kurulup Blender'da gerçekten ölçüldü. Seçim ve yöntem: `ml/scripts/olcu_setleri.py`, `apps/web/scripts/olcu-dogrulugu.ts`, `blender/scripts/olcu_dogrulugu.py`. Ham sonuçlar: `sonuclar.csv`.

Senaryolar: **tam** = boy, göğüs, bel, kalça, kol boyu, iç bacak girilmiş; **temel** = yalnızca boy, göğüs, bel, kalça. Kilo iki senaryoda da girilmedi.

## Avatar kişiye ne kadar benziyor (ölçülen − girilen, cm)

Ortalama / en büyük mutlak fark. Eşik 1 cm.

| Model | Senaryo | boy | gogus | bel | kalca | kol_boyu | ic_bacak |
|---|---|---|---|---|---|---|---|
| kadin | tam | 0,0 / 0,2 | 0,6 / 1,2 | **1,0 / 4,2** | **1,2 / 3,9** | 0,4 / 0,8 | 0,4 / 2,0 |
| kadin | temel | 0,0 / 0,0 | 0,6 / 1,1 | 0,9 / 4,0 | **1,3 / 5,0** | girilmedi | girilmedi |
| erkek | tam | 0,1 / 0,3 | 0,4 / 1,3 | 0,7 / 1,4 | 0,9 / 1,6 | 0,7 / 3,5 | 0,7 / 3,4 |
| erkek | temel | 0,0 / 0,0 | 0,3 / 0,9 | 0,7 / 1,3 | 1,0 / 1,6 | girilmedi | girilmedi |

## Doğrusal model ne kadar tutuyor (ölçülen − çözücünün tahmini, cm)

Kalibrasyondaki `taban + Σ etki × ağırlık` varsayımının gerçek karışımlardaki hatası.

| Model | boy | gogus | bel | kalca | kol_boyu | ic_bacak |
|---|---|---|---|---|---|---|
| kadin | 0,0 / 0,0 | 0,6 / 1,1 | 0,8 / 2,6 | 1,2 / 4,1 | 0,3 / 0,8 | 0,1 / 0,1 |
| erkek | 0,0 / 0,0 | 0,3 / 1,1 | 0,7 / 1,4 | 1,0 / 1,6 | 0,4 / 0,9 | 0,0 / 0,1 |

## Kilo (avatarın hacimden kilosu − gerçek kilo, kg)

Kilo hedef olarak verilmediği için avatarın kilosu diğer ölçülerden çıkar. Eşik 4 kg.

| Model | ortalama fark | ortalama mutlak | en büyük | gerçek / avatar oranı |
|---|---|---|---|---|
| kadin | 0,8 | 2,8 | 10,2 | 0,99 |
| erkek | 1,4 | 2,7 | 6,9 | 0,98 |

## Sınırda kalan setler

Çözücünün bir ağırlığı 0'a ya da 1'e dayandı: avatar bu kişinin vücuduna o yönde tam ulaşamıyor.

| Set | Senaryo | Sınıra dayanan key'ler | En büyük hedef farkı |
|---|---|---|---|
| kadin_p25 | tam | arm_length | 0,7 cm (bel) |
| kadin_kisa_dolu | tam | waist | 2,8 cm (kalca) |
| kadin_kisa_dolu | temel | waist | 2,8 cm (kalca) |
| kadin_elma | tam | waist hip weight | 4,2 cm (bel) |
| kadin_elma | temel | waist hip weight | 5,0 cm (kalca) |
| kadin_uzun_bacak | tam | height | 2,0 cm (ic_bacak) |
| erkek_p05 | tam | weight leg_length | 0,7 cm (bel) |
| erkek_p95 | tam | chest weight leg_length | 1,7 cm (ic_bacak) |
| erkek_p95 | temel | chest weight leg_length | 0,3 cm (kalca) |
| erkek_uzun_zayif | tam | weight | 0,5 cm (kalca) |
| erkek_kisa_dolu | tam | chest weight | 1,4 cm (kalca) |
| erkek_elma | tam | arm_length | 1,1 cm (kol_boyu) |
| erkek_uzun_bacak | tam | arm_length | 3,5 cm (kol_boyu) |
