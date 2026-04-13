import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import './MapLinkModal.css'

export default function MapLinkModal({ onSelect, onClose }) {
  const [maps,    setMaps]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([api.getPublishedMaps(), api.listMaps()])
      .then(([pubRes, myRes]) => {
        if (cancelled) return
        const pub  = pubRes.status  === 'fulfilled' ? pubRes.value  : []
        const mine = myRes.status === 'fulfilled' ? myRes.value : []
        // Merge own maps first (they may not be published yet), then published
        const seen = new Set()
        const combined = []
        for (const m of [...mine, ...pub]) {
          if (!seen.has(m.id)) {
            seen.add(m.id)
            combined.push(m)
          }
        }
        combined.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        setMaps(combined)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filtered = maps.filter((m) => {
    const q = search.toLowerCase()
    return (
      (m.title || '').toLowerCase().includes(q) ||
      (m.owner_email || '').toLowerCase().includes(q)
    )
  })

  return (
    <div
      className="mlm-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="mlm-modal">
        <div className="mlm-modal__header">
          <span className="mlm-modal__title">Link a map</span>
          <button className="mlm-modal__close" onClick={onClose}>✕</button>
        </div>

        <input
          ref={inputRef}
          className="mlm-modal__search"
          placeholder="Search maps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="mlm-modal__list">
          {loading ? (
            <div className="mlm-modal__hint">Loading maps…</div>
          ) : filtered.length === 0 ? (
            <div className="mlm-modal__hint">
              {search ? 'No maps match your search.' : 'No maps available.'}
            </div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                className="mlm-modal__item"
                onClick={() => { onSelect(m.id, m.title || ''); onClose() }}
              >
                <span className="mlm-modal__item-title">{m.title || '(untitled)'}</span>
                {m.owner_email && (
                  <span className="mlm-modal__item-author">
                    {m.owner_email.split('@')[0]}
                  </span>
                )}
                {m.is_published && (
                  <span className="mlm-modal__item-badge">published</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
