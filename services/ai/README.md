# services/ai – Yapay zekâ servisi (Sorumlu: C)

FastAPI (Python). Kıyafet türü tanıma, segmentasyon, anahtar nokta, desen bükme, link okuma ve OCR uç noktaları.

## İlk kurulum (1. hafta)

```bash
cd services/ai
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install fastapi uvicorn
uvicorn main:app --reload
```

Eğitilmiş modeller (`.onnx`) bu servise `models/` klasöründen yüklenir.
