import { useEffect, useState } from 'react'
import { api } from '../api.js'
import './MyMapsModal.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MyMapsModal({ onLoad, onClose }) {
  const [maps, setMaps]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    api.listMaps()
      .then(setMaps)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleBackdropDown = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="mym__backdrop" onMouseDown={handleBackdropDown}>
      <div className="mym__card">

        <div className="mym__header">
          <span className="mym__title">My Maps</span>
          <button className="mym__close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        <div className="mym__body">
          {loading && (
            <div className="mym__state">Loading…</div>
          )}

          {!loading && error && (
            <div className="mym__state mym__state--error">
              Could not reach the server.<br />
              <span className="mym__error-detail">{error}</span>
            </div>
          )}

          {!loading && !error && maps.length === 0 && (
            <div className="mym__state">
              No maps saved yet. Use <strong>Save</strong> to store your current map.
            </div>
          )}

          {!loading && !error && maps.map((m) => (
            <button
              key={m.id}
              className="mym__item"
              onClick={() => { onLoad(m.id); onClose() }}
            >
              <span className="mym__item-title">{m.title || '(untitled)'}</span>
              <span className="mym__item-date">Updated {formatDate(m.updated_at)}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
