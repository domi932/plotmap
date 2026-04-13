import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { useToast } from './Toast.jsx'
import './AnnotationPanel.css'

const TYPE_CONFIG = {
  flaw:       { label: 'Flaw',       color: '#c0524a' },
  suggestion: { label: 'Suggestion', color: '#5a7a3a' },
  question:   { label: 'Question',   color: '#3a5a8a' },
}

function formatAuthor(email) {
  if (!email) return 'Anonymous'
  const name = email.split('@')[0]
  return name.length > 18 ? name.slice(0, 16) + '…' : name
}

export default function AnnotationPanel({ mapId, nodeId, mode, user }) {
  const addToast = useToast()
  const [annotations, setAnnotations] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [content,     setContent]     = useState('')
  const [type,        setType]        = useState('flaw')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState(null)

  // In suggest mode with a logged-in user and a saved map, allow submitting.
  const canSuggest = mode === 'suggest' && !!user && !!mapId

  // Fetch annotations whenever the selected node changes.
  const fetchAnnotations = useCallback(() => {
    if (!mapId || !nodeId) {
      setAnnotations([])
      return
    }
    setLoading(true)
    api.getAnnotations(mapId)
      .then((all) => {
        const forNode = all.filter((a) => a.node_id === nodeId)
        setAnnotations(forNode)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mapId, nodeId])

  useEffect(() => {
    fetchAnnotations()
  }, [fetchAnnotations])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() || !mapId || !nodeId) return
    setSubmitting(true)
    setError(null)
    try {
      const ann = await api.createAnnotation(mapId, nodeId, null, content.trim(), type)
      // Insert and re-sort by upvotes desc
      setAnnotations((prev) =>
        [ann, ...prev].sort((a, b) => b.upvotes - a.upvotes)
      )
      setContent('')
      addToast('Annotation submitted', 'success')
    } catch (err) {
      setError(err.message)
      addToast('Failed to submit annotation', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvote = async (ann) => {
    try {
      const updated = await api.upvoteAnnotation(ann.id)
      setAnnotations((prev) =>
        prev.map((a) => (a.id === ann.id ? updated : a))
          .sort((a, b) => b.upvotes - a.upvotes)
      )
    } catch { /* silent — upvote is best-effort */ }
  }

  // ── Empty state when nothing is selected ─────────────────────────────────
  if (!nodeId) {
    return (
      <div className="ann-panel ann-panel--empty">
        <p className="ann-panel__hint">Select a node to see annotations.</p>
      </div>
    )
  }

  return (
    <div className="ann-panel">
      <div className="ann-panel__header">
        <span className="ann-panel__title">Annotations</span>
        {annotations.length > 0 && (
          <span className="ann-panel__count">{annotations.length}</span>
        )}
      </div>

      {/* ── Annotation list ── */}
      <div className="ann-panel__list-wrap">
        {loading ? (
          <p className="ann-panel__hint">Loading…</p>
        ) : annotations.length === 0 ? (
          <p className="ann-panel__hint">No annotations yet.</p>
        ) : (
          <ul className="ann-panel__list">
            {annotations.map((ann) => {
              const cfg = TYPE_CONFIG[ann.annotation_type] ?? { label: ann.annotation_type, color: '#888' }
              return (
                <li key={ann.id} className="ann-panel__item">
                  <div className="ann-panel__item-header">
                    <span
                      className="ann-panel__badge"
                      style={{ '--badge-color': cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <span className="ann-panel__author">{formatAuthor(ann.author_email)}</span>
                  </div>
                  <p className="ann-panel__content">{ann.content}</p>
                  <div className="ann-panel__item-footer">
                    {canSuggest ? (
                      <button
                        className="ann-panel__upvote"
                        onClick={() => handleUpvote(ann)}
                        title="Upvote this annotation"
                      >
                        ▲ {ann.upvotes}
                      </button>
                    ) : (
                      <span className="ann-panel__upvote-count">▲ {ann.upvotes}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Submit form (suggest mode only) ── */}
      {canSuggest && (
        <form className="ann-panel__form" onSubmit={handleSubmit}>
          <div className="ann-panel__type-row">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                className={`ann-panel__type-btn${type === key ? ' ann-panel__type-btn--active' : ''}`}
                style={{ '--badge-color': cfg.color }}
                onClick={() => setType(key)}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          <textarea
            className="ann-panel__textarea"
            placeholder="Describe the flaw, suggestion, or question…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          {error && <p className="ann-panel__error">{error}</p>}
          <button
            className="ann-panel__submit"
            type="submit"
            disabled={submitting || !content.trim()}
          >
            {submitting ? 'Posting…' : 'Submit'}
          </button>
        </form>
      )}

      {/* Map not saved yet — can't annotate */}
      {mode === 'suggest' && !!user && !mapId && (
        <p className="ann-panel__hint ann-panel__hint--warn">
          Save this map first to enable annotations.
        </p>
      )}
    </div>
  )
}
