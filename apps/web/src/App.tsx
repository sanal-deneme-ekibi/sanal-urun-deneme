import { BrowserRouter, Routes, Route } from 'react-router'
import AltMenu from './bilesenler/AltMenu'
import OlculerSayfasi from './olcu/OlculerSayfasi'
import YuzKup from './yuz/YuzKup'
import YakindaSayfasi from './ekranlar/YakindaSayfasi'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: '#eef2f6' }}>
        <main style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<OlculerSayfasi />} />
            <Route
              path="/kiyafet"
              element={
                <YakindaSayfasi
                  baslik="Ürün ekle"
                  aciklama="Fotoğraf yükleme, kırpma, tür seçimi ve beden tablosu burada olacak (16–22 Kasım)."
                />
              }
            />
            <Route path="/gozluk" element={<YuzKup />} />
            <Route
              path="/favori"
              element={<YakindaSayfasi baslik="Favoriler" aciklama="Kaydedilen ürünler burada listelenecek (2. dönem)." />}
            />
          </Routes>
        </main>
        <AltMenu />
      </div>
    </BrowserRouter>
  )
}