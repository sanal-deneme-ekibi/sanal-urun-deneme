# services/ai – Yapay zekâ servisi (Sorumlu: C)

FastAPI (Python). Kıyafet türü tanıma, segmentasyon, anahtar nokta, desen bükme, link okuma ve OCR uç noktaları.

## Kurulum ve çalıştırma

### 1. Sanal ortamı kur

```bash
cd services/ai
python -m venv .venv
```

### 2. Sanal ortamı etkinleştir

Komut, kullandığınız kabuğa göre değişir:

| Kabuk | Komut |
|---|---|
| Windows cmd.exe | `.venv\Scripts\activate` |
| Windows PowerShell | `.venv\Scripts\Activate.ps1` |
| Git Bash (Windows) | `source .venv/Scripts/activate` |
| macOS / Linux | `source .venv/bin/activate` |

> **Komut isteminin başında `(.venv)` yazdığını görün.** Görmüyorsanız ortam
> etkinleşmemiştir; `pip install` yapmayın, yoksa paketler sistem Python'unuza
> kurulur ve başka projelerinizdeki sürümleri bozabilir.
>
> cmd.exe'de `source` komutu yoktur; o Git Bash'e aittir.

Çıkmak için: `deactivate`

### 3. Paketleri kur ve servisi başlat

```bash
pip install -r requirements-dev.txt
uvicorn main:app --reload
```

Servis `http://localhost:8000` adresinde açılır.

- `GET /health` → `{"durum": "ok", "surum": "0.1.0"}`
- `POST /tur` → görseldeki kıyafetin türü
- Etkileşimli dokümantasyon: `http://localhost:8000/docs`

## POST /tur

```
POST /tur     multipart/form-data, alan adı: gorsel
              JPEG veya PNG, en çok 5 MB

200 -> { "tur": "tisort", "guven": 0.0, "model_hazir": false }
400 -> { "detail": "..." }
```

`tur` şu beşinden biridir: `tisort`, `pantolon`, `gomlek`, `elbise`, `etek` — yazım
`docs/glb-sozlesmesi.md` ve veritabanındaki `products.tur` ile aynıdır.

**`model_hazir: false` iken cevap sahtedir.** Model 1 henüz eğitilmedi (#33); uç nokta
şimdilik hep `tisort` ve `guven: 0.0` döner. Arayüz bu alana bakıp kullanıcıya tür seçimini
elle yaptırabilir. Model gelince yalnızca `_tahmin_et` değişir, sözleşme aynı kalır.

400 dönen durumlar: JPEG/PNG dışı içerik türü, boş dosya, 5 MB aşımı, uzantısı doğru ama
içeriği bozuk dosya.

## Testler

```bash
pytest
```

## Ayarlar

| Ortam değişkeni | Varsayılan | Açıklama |
|---|---|---|
| `AI_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Tarayıcıdan çağırmasına izin verilen adresler (virgülle ayrılır) |

Arayüz tarafı bu servisin adresini `.env` içindeki `VITE_AI_SERVICE_URL` ile okur.

Eğitilmiş modeller (`.onnx`) bu servise `models/` klasöründen yüklenir.
