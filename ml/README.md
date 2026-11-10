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
| `dogrula.py` | Dışa aktarmayı denetler: tür adları, 7 nokta, poligonlar | her dışa aktarmadan sonra |

Tipik sıra:

```bash
python ml/scripts/yuz_bulanik.py ham/ --dene     # önce ne yapacağına bak
python ml/scripts/yuz_bulanik.py ham/

python ml/scripts/dogrula.py etiketli/annotations.json
python ml/scripts/bol.py etiketli/annotations.json --cikti etiketli/bolme.json
python ml/scripts/kirp.py etiketli/annotations.json ham/ kirpik/
```

`dogrula.py` hata bulursa 1 döner, yalnızca uyarı varsa 0. `bol.py` bir kutuda test payı
boş kalırsa uyarır ve 1 döner.

Aynı ürünün ikinci fotoğrafı `-2` ekiyle yazılır (`tisort_tr01_0042-2.jpg`); `bol.py` ikisini
aynı ürün sayar ve aynı bölüme koyar.

## Kurallar

- **Veri setleri bu klasöre konmaz** (`data/` ve `datasets/` .gitignore'da). Drive / Kaggle'da tutulur.
- Eğitim Kaggle veya Colab GPU'da yapılır; notebook'lar `notebooks/` altında saklanır.
- Sonuçlar (metrikler, karışıklık matrisi) `results/` altına yazılır.
