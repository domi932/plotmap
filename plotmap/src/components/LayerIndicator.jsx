import { LAYER_NAMES } from '../LayerContext.js'
import './LayerIndicator.css'

export default function LayerIndicator({ activeLayer, onChange }) {
  return (
    <div className="layer-ind">
      <span className="layer-ind__icon" aria-hidden="true">⬡</span>
      <select
        className="layer-ind__select"
        value={activeLayer}
        onChange={(e) => onChange(Number(e.target.value))}
        title="Active layer — changes automatically when you select a node"
      >
        {LAYER_NAMES.map((name, i) => (
          <option key={i} value={i}>
            Layer {i} — {name}
          </option>
        ))}
      </select>
      {activeLayer > 0 && (
        <button
          className="layer-ind__back"
          onClick={() => onChange(activeLayer - 1)}
          title={`Go up to Layer ${activeLayer - 1}`}
        >
          ↑
        </button>
      )}
    </div>
  )
}
