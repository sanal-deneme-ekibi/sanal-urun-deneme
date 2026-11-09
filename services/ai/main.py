"""Sanal Ürün Deneme – yapay zekâ servisi.

Şimdilik yalnızca sağlık kontrolü var. Tür tanıma, segmentasyon, anahtar
nokta, desen bükme, link okuma ve OCR uç noktaları buraya eklenecek.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

SURUM = "0.1.0"

# Tarayıcıdan çağıracak arayüzün adresleri. Virgülle ayrılmış liste olarak
# AI_CORS_ORIGINS ortam değişkeninden okunur.
_VARSAYILAN_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS = [
    o.strip() for o in os.getenv("AI_CORS_ORIGINS", _VARSAYILAN_ORIGINS).split(",") if o.strip()
]

app = FastAPI(
    title="Sanal Ürün Deneme – yapay zekâ servisi",
    version=SURUM,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SaglikYaniti(BaseModel):
    durum: str
    surum: str


@app.get("/health", response_model=SaglikYaniti, summary="Servis ayakta mı?")
def health() -> SaglikYaniti:
    return SaglikYaniti(durum="ok", surum=SURUM)
