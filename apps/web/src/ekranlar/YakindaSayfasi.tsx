// Henüz yapılmamış ekranlar için geçici sayfa
export default function YakindaSayfasi({ baslik, aciklama }: { baslik: string; aciklama: string }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px max(20px, env(safe-area-inset-left, 0px))' }}>
      <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="etiket">Yakında</span>
        <h1>{baslik}</h1>
        <p style={{ margin: 0, color: 'var(--metin)' }}>{aciklama}</p>
      </div>
    </div>
  )
}
