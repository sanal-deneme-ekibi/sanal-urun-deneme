# ml – Model eğitimi (Sorumlu: C, etiketleme: herkes)

| Model | Görev | Mimari | Ölçüt |
|---|---|---|---|
| 1 | Kıyafet türü sınıflandırma | EfficientNet-B0 / MobileNetV3 | doğruluk, F1 |
| 2 | Segmentasyon | U-Net / YOLOv8-seg | mIoU, Dice |
| 3 | Anahtar noktalar | YOLOv8-pose | nokta hatası, PCK |
| 4 | Uygunluk (isteğe bağlı) | Gradient boosting / MLP | doğruluk |

Kıyaslama (baseline): CLIP, SAM, rembg.

Veri toplama ve etiketleme kuralları: [veri-protokolu.md](veri-protokolu.md)

## Veri hazırlama betikleri (`scripts/`)

Kurallar `veri-protokolu.md`'de; betikler o kuralları uygular.

```bash
pip install -r ml/scripts/requirements.txt
```

| Betik | Ne yapar | Ne zaman |
|---|---|---|
| `yuz_bulanik.py` | Yüzleri bulanıklaştırır, görseli yerinde değiştirir | toplamadan hemen sonra |
| `kirp.py` | Maskenin kutusundan %5 paylı kırpma üretir (Model 1 girdisi) | etiketlemeden sonra |
| `bol.py` | Tür + görünüm katmanlı %70/15/15 bölme, sabit seed | etiketlemeden sonra |
| `birlestir.py` | Datumaro aktarmasını tek COCO dosyasına çevirir (maske + 7 nokta + nitelik) | her dışa aktarmadan hemen sonra |
| `dogrula.py` | Dışa aktarmayı denetler: tür adları, 7 nokta, poligonlar | `birlestir.py`'den sonra |

Tipik sıra:

```bash
python ml/scripts/yuz_bulanik.py ham/ --dene     # önce ne yapacağına bak
python ml/scripts/yuz_bulanik.py ham/

# CVAT'tan Datumaro 1.0 ile indirip aç, sonra:
python ml/scripts/birlestir.py annotations/default.json -o etiketli/annotations.json
python ml/scripts/dogrula.py etiketli/annotations.json
python ml/scripts/bol.py etiketli/annotations.json --cikti etiketli/bolme.json
python ml/scripts/kirp.py etiketli/annotations.json ham/ kirpik/
```

CVAT'tan **COCO ile indirilmez**: COCO 1.0 anahtar noktaları sessizce düşürür, COCO
Keypoints 1.0 ise maskeyi düşürür. Ölçüm ve gerekçe: `veri-protokolu.md` bölüm 6.1.

`dogrula.py` hata bulursa 1 döner, yalnızca uyarı varsa 0. `birlestir.py` maske ile
iskeletini eşleştiremezse (bir görselde birden çok kıyafet var ve gruplanmamış) hata verir
ve durur. `bol.py` bir kutuda test payı boş kalırsa uyarır ve 1 döner.

Aynı ürünün ikinci fotoğrafı `-2` ekiyle yazılır (`tisort_tr01_0042-2.jpg`); `bol.py` ikisini
aynı ürün sayar ve aynı bölüme koyar.

## Kurallar

- **Veri setleri bu klasöre konmaz** (`data/` ve `datasets/` .gitignore'da). Drive / Kaggle'da tutulur.
- Eğitim Kaggle veya Colab GPU'da yapılır; notebook'lar `notebooks/` altında saklanır.
- Sonuçlar (metrikler, karışıklık matrisi) `results/` altına yazılır.
