import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import Menu from './bilesenler/Menu'
import OlculerSayfasi from './olcu/OlculerSayfasi'
import YuzKup from './yuz/YuzKup'
import YakindaSayfasi from './ekranlar/YakindaSayfasi'
import KarsilamaSayfasi, { tanitimGoruldu } from './ekranlar/KarsilamaSayfasi'
import DenemeSayfasi from './kiyafet/DenemeSayfasi'
import { OlcuSaglayici } from './olcu/OlcuBaglami'
import { UrunSaglayici } from './urun/UrunBaglami'
import UrunEkleSayfasi from './urun/UrunEkleSayfasi'

// İlk girişte tanıtım; "Başla"ya basmış kullanıcı doğrudan Ölçülerim'e gider (tanıtım markadan açılır)
function Baslangic() {
  return tanitimGoruldu() ? <Navigate to="/olculer" replace /> : <KarsilamaSayfasi />
}

export default function App() {
  return (
    <BrowserRouter>
      <OlcuSaglayici>
      <UrunSaglayici>
      <div className="kabuk">
        <Menu />
        <main className="kabuk-icerik">
          <Routes>
            <Route path="/" element={<Baslangic />} />
            <Route path="/tanitim" element={<KarsilamaSayfasi />} />
            <Route path="/olculer" element={<OlculerSayfasi />} />
            <Route path="/kiyafet" element={<DenemeSayfasi />} />
            <Route path="/kiyafet/ekle" element={<UrunEkleSayfasi />} />
            <Route path="/gozluk" element={<YuzKup />} />
            <Route
              path="/favori"
              element={<YakindaSayfasi baslik="Favoriler" aciklama="Kaydedilen ürünler burada listelenecek (2. dönem)." />}
            />
          </Routes>
        </main>
      </div>
      </UrunSaglayici>
      </OlcuSaglayici>
    </BrowserRouter>
  )
}
