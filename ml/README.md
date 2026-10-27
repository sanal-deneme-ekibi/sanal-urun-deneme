# ml – Model eğitimi (Sorumlu: C, etiketleme: herkes)

| Model | Görev | Mimari | Ölçüt |
|---|---|---|---|
| 1 | Kıyafet türü sınıflandırma | EfficientNet-B0 / MobileNetV3 | doğruluk, F1 |
| 2 | Segmentasyon | U-Net / YOLOv8-seg | mIoU, Dice |
| 3 | Anahtar noktalar | YOLOv8-pose | nokta hatası, PCK |
| 4 | Uygunluk (isteğe bağlı) | Gradient boosting / MLP | doğruluk |

Kıyaslama (baseline): CLIP, SAM, rembg.

## Kurallar

- **Veri setleri bu klasöre konmaz** (`data/` ve `datasets/` .gitignore'da). Drive / Kaggle'da tutulur.
- Eğitim Kaggle veya Colab GPU'da yapılır; notebook'lar `notebooks/` altında saklanır.
- Sonuçlar (metrikler, karışıklık matrisi) `results/` altına yazılır.
