import { BrowserRouter, Routes, Route } from 'react-router'
import AltMenu from './bilesenler/AltMenu'
import OlculerSayfasi from './olcu/OlculerSayfasi'
import YuzKup from './yuz/YuzKup'
import YakindaSayfasi from './ekranlar/YakindaSayfasi'
import DenemeSayfasi from './kiyafet/DenemeSayfasi'
import { OlcuSaglayici } from './olcu/OlcuBaglami'
import { UrunSaglayici } from './urun/UrunBaglami'
import UrunEkleSayfasi from './urun/UrunEkleSayfasi'

export default function App() {
  return (
    <BrowserRouter>
      <OlcuSaglayici>
      <UrunSaglayici>
      <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: '#eef2f6' }}>
        <main style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<OlculerSayfasi />} />
            <Route path="/kiyafet" element={<DenemeSayfasi />} />
            <Route path="/kiyafet/ekle" element={<UrunEkleSayfasi />} />
            <Route path="/gozluk" element={<YuzKup />} />
            <Route
              path="/favori"
              element={<YakindaSayfasi baslik="Favoriler" aciklama="Kaydedilen ürünler burada listelenecek (2. dönem)." />}
            />
          </Routes>
        </main>
        <AltMenu />
      </div>
      </UrunSaglayici>
      </OlcuSaglayici>
    </BrowserRouter>
  )
}