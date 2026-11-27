import { MODELLER, MODEL_ETIKETLERI } from '../olcu/kalibrasyon'
import { useOlculer } from '../olcu/OlcuBaglami'

// Kadın / erkek avatar seçimi. Her modelin ölçüleri ayrı saklanır.
export default function ModelSecici() {
  const { model, modelSec } = useOlculer()
  return (
    <div role="group" aria-label="Avatar" style={{ display: 'flex', gap: 6 }}>
      {MODELLER.map((m) => {
        const secili = m === model
        return (
          <button
            key={m}
            type="button"
            aria-pressed={secili}
            onClick={() => modelSec(m)}
            style={{
              minHeight: 36,
              padding: '6px 14px',
              borderRadius: 999,
              border: `1px solid ${secili ? '#1b1b1f' : '#cbd5e1'}`,
              background: secili ? '#1b1b1f' : '#fff',
              color: secili ? '#fff' : '#1b1b1f',
              fontWeight: secili ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {MODEL_ETIKETLERI[m]}
          </button>
        )
      })}
    </div>
  )
}
