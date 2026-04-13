import { useState, useEffect, useRef } from 'react'
import './ConnectToModal.css'

const TYPE_COLORS = {
  event:     '#3a5a8a',
  character: '#6a3a6a',
  note:      '#8a6a3a',
}

export default function ConnectToModal({ sourceNode, nodes, edges, onConnect, onClose }) {
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // All edges that touch the source node — used to detect existing connections
  const connected = new Set(
    edges
      .filter((e) => e.source === sourceNode.id || e.target === sourceNode.id)
      .map((e) => (e.source === sourceNode.id ? e.target : e.source))
  )

  const sourceName = sourceNode.data?.title || sourceNode.data?.name || '(untitled)'

  const targets = nodes
    .filter((n) => n.id !== sourceNode.id && n.type !== 'region')
    .sort((a, b) => {
      const ta = (a.data?.title || a.data?.name || '').toLowerCase()
      const tb = (b.data?.title || b.data?.name || '').toLowerCase()
      return ta.localeCompare(tb)
    })
    .filter((n) => {
      const q = search.toLowerCase()
      const name = (n.data?.title || n.data?.name || '').toLowerCase()
      return name.includes(q) || n.type.includes(q)
    })

  const handleOverlayDown = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="ct-overlay" onMouseDown={handleOverlayDown}>
      <div className="ct-modal">
        <div className="ct-modal__header">
          <span className="ct-modal__title">Connect to…</span>
          <button className="ct-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="ct-modal__source">
          From: <strong>{sourceName}</strong>
        </div>

        <input
          ref={inputRef}
          className="ct-modal__search"
          placeholder="Search nodes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="ct-modal__list">
          {targets.length === 0 && (
            <div className="ct-modal__empty">No nodes match your search.</div>
          )}
          {targets.map((n) => {
            const name = n.data?.title || n.data?.name || '(untitled)'
            const alreadyLinked = connected.has(n.id)
            const layer = n.data?.layer ?? 0
            return (
              <button
                key={n.id}
                className={`ct-modal__item${alreadyLinked ? ' ct-modal__item--disabled' : ''}`}
                disabled={alreadyLinked}
                onClick={() => {
                  if (!alreadyLinked) {
                    onConnect(sourceNode.id, n.id)
                    onClose()
                  }
                }}
              >
                <span
                  className="ct-modal__badge"
                  style={{ background: TYPE_COLORS[n.type] || '#555' }}
                >
                  {n.type}
                </span>
                <span className="ct-modal__name">{name}</span>
                <span className="ct-modal__layer">L{layer}</span>
                {alreadyLinked && (
                  <span className="ct-modal__tag">connected</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
