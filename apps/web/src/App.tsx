import { useState } from 'react'
import OlculerSayfasi from './olcu/OlculerSayfasi'
import YuzKup from './yuz/YuzKup'

type Sayfa = 'olcu' | 'yuz'

export default function App() {
  const [sayfa, setSayfa] = useState<Sayfa>('olcu')

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#eef2f6' }}>
      <nav style={{ display: 'flex', gap: 8, padding: 8 }}>
        <button onClick={() => setSayfa('olcu')} disabled={sayfa === 'olcu'}>Ölçülerim</button>
        <button onClick={() => setSayfa('yuz')} disabled={sayfa === 'yuz'}>Yüz takibi</button>
      </nav>
      <div style={{ flex: 1, minHeight: 0 }}>
        {sayfa === 'olcu' ? <OlculerSayfasi /> : <YuzKup />}
      </div>
    </div>
  )
}