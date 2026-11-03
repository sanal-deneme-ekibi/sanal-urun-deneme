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
