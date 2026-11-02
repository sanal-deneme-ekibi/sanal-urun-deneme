import { useState } from 'react'
import Viewer from './viewer/Viewer'
import YuzKup from './yuz/YuzKup'

type Sayfa = 'avatar' | 'yuz'

export default function App() {
  const [sayfa, setSayfa] = useState<Sayfa>('avatar')

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#eef2f6' }}>
      <nav style={{ display: 'flex', gap: 8, padding: 8 }}>
        <button onClick={() => setSayfa('avatar')} disabled={sayfa === 'avatar'}>Avatar</button>
        <button onClick={() => setSayfa('yuz')} disabled={sayfa === 'yuz'}>Yüz takibi</button>
      </nav>
      <div style={{ flex: 1, minHeight: 0 }}>
        {sayfa === 'avatar' ? <Viewer /> : <YuzKup />}
      </div>
    </div>
  )
}