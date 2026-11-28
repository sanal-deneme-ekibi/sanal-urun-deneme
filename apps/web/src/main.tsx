import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { temaOku, temaUygula } from './bilesenler/tema'

// Kayıtlı tema seçimi ilk çizimden önce uygulanır (açılışta yanlış temanın görünüp değişmesin diye)
temaUygula(temaOku())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
