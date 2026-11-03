# services/ai – Yapay zekâ servisi (Sorumlu: C)

FastAPI (Python). Kıyafet türü tanıma, segmentasyon, anahtar nokta, desen bükme, link okuma ve OCR uç noktaları.

## Kurulum ve çalıştırma

```bash
cd services/ai
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements-dev.txt
uvicorn main:app --reload
```

Servis `http://localhost:8000` adresinde açılır.

- `GET /health` → `{"durum": "ok", "surum": "0.1.0"}`
- Etkileşimli dokümantasyon: `http://localhost:8000/docs`

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
