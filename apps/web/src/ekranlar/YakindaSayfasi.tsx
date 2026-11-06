// Henüz yapılmamış ekranlar için geçici sayfa
export default function YakindaSayfasi({ baslik, aciklama }: { baslik: string; aciklama: string }) {
  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>{baslik}</h1>
      <p style={{ margin: 0, color: '#55565c', lineHeight: 1.5 }}>{aciklama}</p>
    </div>
  )
}