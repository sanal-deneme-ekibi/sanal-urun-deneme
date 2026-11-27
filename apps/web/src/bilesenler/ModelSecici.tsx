import { MODELLER, MODEL_ETIKETLERI } from '../olcu/kalibrasyon'
import { useOlculer } from '../olcu/OlcuBaglami'

// Kadın / erkek avatar seçimi. Her modelin ölçüleri ayrı saklanır.
export default function ModelSecici() {
  const { model, modelSec } = useOlculer()
  return (
    <div role="group" aria-label="Avatar" className="segment">
      {MODELLER.map((m) => (
        <button key={m} type="button" aria-pressed={m === model} onClick={() => modelSec(m)}>
          {MODEL_ETIKETLERI[m]}
        </button>
      ))}
    </div>
  )
}
