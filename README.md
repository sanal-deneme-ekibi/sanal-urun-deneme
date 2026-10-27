# Sanal Ürün Deneme Uygulaması

Yapay zekâ destekli sanal kıyafet ve gözlük deneme – bitirme projesi.

Kullanıcı internetten almak istediği kıyafetin fotoğrafını yükler veya linkini yapıştırır. Kendi eğittiğimiz yapay zekâ modelleri kıyafetin türünü, maskesini ve anahtar noktalarını bulur; desen ve ürün sayfasındaki ölçüler 3B bir şablona uygulanır ve şablon, kullanıcının ölçüleriyle şekillenen kişisel avatara giydirilir. Gözlükler telefon kamerasında yüze gerçek zamanlı yerleştirilir.

## Ekip

| Üye | Alan | Klasörler |
|---|---|---|
| A | 3B / Blender | `blender/`, `assets/models/` |
| B | Ön yüz / görselleştirme | `apps/web/` |
| C | Yapay zekâ / arka uç | `services/ai/`, `ml/`, `supabase/` |

## Klasör yapısı

```
apps/web/          React + React Three Fiber uygulaması (TypeScript)
services/ai/       FastAPI yapay zekâ servisi (Python)
ml/                Model eğitim kodları ve notebook'lar (Python, PyTorch)
blender/           .blend dosyaları ve Blender Python betikleri
assets/models/     Uygulamanın okuduğu GLB dosyaları
supabase/          Veritabanı tabloları (SQL)
docs/              Planlar, sözleşmeler, toplantı notları
```

## Teknolojiler

- **3B:** Blender + MPFB2, Marvelous Designer, GLB
- **Uygulama:** React, React Three Fiber (Three.js), Vite, TypeScript, PWA
- **Yapay zekâ:** PyTorch, Ultralytics YOLOv8, EfficientNet, ONNX, FastAPI
- **Gözlük:** MediaPipe Face Landmarker
- **Veritabanı:** Supabase (PostgreSQL)

## Başlarken

```bash
git clone https://github.com/sanal-deneme-ekibi/sanal-urun-deneme.git
cd sanal-urun-deneme
git lfs install
git lfs pull
```

Çalışma kuralları için: [docs/calisma-kurallari.md](docs/calisma-kurallari.md)
Ortak 3B dosya kuralları için: [docs/glb-sozlesmesi.md](docs/glb-sozlesmesi.md)
