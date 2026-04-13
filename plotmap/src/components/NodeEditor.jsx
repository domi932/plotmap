import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { useToast } from './Toast.jsx'
import MapLinkModal from './MapLinkModal.jsx'
import './NodeEditor.css'

const FIELD_MAP = {
  event:     [{ key: 'title', label: 'Title', type: 'text' }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'time', label: 'Time / Chapter', type: 'text' }],
  character: [{ key: 'title', label: 'Name',  type: 'text' }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'role', label: 'Role (e.g. Protagonist)', type: 'text' }],
  note:      [{ key: 'title', label: 'Title', type: 'text' }, { key: 'description', label: 'Content', type: 'textarea' }],
  region:    [{ key: 'title', label: 'Label', type: 'text' }],
  portal:    [{ key: 'label', label: 'Display label', type: 'text' }],
}

const LAYER_NAMES = ['Main Story', 'Subplot A', 'Subplot B', 'Subplot C', 'Subplot D']

const SWATCHES = ['#3a5a8a', '#6a3a6a', '#5a7a3a', '#8a6a3a', '#c0524a', '#c8a96e', '#5a7a7a', '#7a5a8a']

const SHAPES = [
  { value: 'rectangle', icon: '▭', label: 'Rectangle' },
  { value: 'circle',    icon: '○', label: 'Circle'    },
  { value: 'diamond',   icon: '◇', label: 'Diamond'   },
  { value: 'hexagon',   icon: '⬡', label: 'Hexagon'   },
  { value: 'pill',      icon: '⬮', label: 'Pill'      },
]

function ImagePreview({ url, onClear }) {
  const imgRef = useRef(null)
  return (
    <div className="node-editor__img-row">
      <img
        ref={imgRef}
        src={url}
        alt=""
        className="node-editor__img-preview"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
      {onClear && (
        <button className="node-editor__img-clear" onClick={onClear} title="Clear image">
          ✕ Clear
        </button>
      )}
    </div>
  )
}

export default function NodeEditor({ node, onChange, onDelete, onDuplicate, allNodes = [], readOnly = false }) {
  const addToast = useToast()
  const [form,          setForm]          = useState({})
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [pasteValue,    setPasteValue]    = useState('')
  const [pasting,       setPasting]       = useState(false)

  useEffect(() => {
    setForm(node?.data || {})
    setPasteValue('')
  }, [node?.id])

  if (!node) {
    return (
      <div className="node-editor node-editor--empty">
        <p>Select a node or edge to edit it</p>
      </div>
    )
  }

  const fields = FIELD_MAP[node.type] || FIELD_MAP.note
  const currentLayer = form.layer ?? 0

  const handleChange = (key, value) => {
    const updated = { ...form, [key]: value }
    // Changing layer resets parentNodeId if it no longer makes sense
    if (key === 'layer' && value === 0) updated.parentNodeId = null
    setForm(updated)
    onChange(node.id, updated)
  }

  // ── Portal helpers ────────────────────────────────────────────────────────
  const handleMapLink = (id, title) => {
    const updated = { ...form, targetMapId: id, targetMapTitle: title }
    setForm(updated)
    onChange(node.id, updated)
  }

  const handleMapClear = () => {
    const updated = { ...form, targetMapId: '', targetMapTitle: '' }
    setForm(updated)
    onChange(node.id, updated)
  }

  const handlePasteLink = async () => {
    const raw = pasteValue.trim()
    if (!raw) return
    // Accept full URLs like /map/<uuid> or bare UUIDs
    const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    const match = raw.match(UUID_RE)
    const id = match ? match[0] : raw
    setPasting(true)
    try {
      const map = await api.getPublicMap(id)
      handleMapLink(map.id, map.title || '')
      setPasteValue('')
      addToast(`Linked to "${map.title}"`, 'success')
    } catch {
      addToast('Map not found — make sure the URL is correct and the map is published.', 'error')
    } finally {
      setPasting(false)
    }
  }

  // Nodes eligible to be the parent: on the layer directly above the current node
  const parentCandidates = currentLayer > 0
    ? allNodes
        .filter((n) => n.id !== node.id && (n.data?.layer ?? 0) === currentLayer - 1)
        .sort((a, b) =>
          (a.data?.title || a.data?.name || '').localeCompare(b.data?.title || b.data?.name || '')
        )
    : []

  return (
    <div className="node-editor">
      <div className="node-editor__header">
        <span className="node-editor__type">{node.type}</span>
        {!readOnly && (
          <div className="node-editor__actions">
            <button className="node-editor__duplicate" onClick={() => onDuplicate(node.id)}>
              Copy
            </button>
            <button className="node-editor__delete" onClick={() => onDelete(node.id)}>
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="node-editor__fields">
        {/* ── Type-specific fields ── */}
        {fields.map((f) => (
          <div key={f.key} className="node-editor__field">
            <label className="node-editor__label">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea
                className="node-editor__input node-editor__textarea"
                value={form[f.key] || ''}
                onChange={(e) => handleChange(f.key, e.target.value)}
                rows={4}
                placeholder={`Enter ${f.label.toLowerCase()}…`}
                readOnly={readOnly}
              />
            ) : (
              <input
                className="node-editor__input"
                type="text"
                value={form[f.key] || ''}
                onChange={(e) => handleChange(f.key, e.target.value)}
                placeholder={`Enter ${f.label.toLowerCase()}…`}
                readOnly={readOnly}
              />
            )}
          </div>
        ))}

        {/* ── Colour ── */}
        {!readOnly && <div className="node-editor__field">
          <label className="node-editor__label">Colour</label>
          <div className="node-editor__colors">
            <button
              className={`node-editor__swatch node-editor__swatch--reset ${!form.color ? 'node-editor__swatch--active' : ''}`}
              onClick={() => handleChange('color', '')}
              title="Default colour"
            />
            {SWATCHES.map((c) => (
              <button
                key={c}
                className={`node-editor__swatch ${form.color === c ? 'node-editor__swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => handleChange('color', c)}
                title={c}
              />
            ))}
            <input
              type="color"
              className="node-editor__color-picker"
              value={form.color || '#3a5a8a'}
              onChange={(e) => handleChange('color', e.target.value)}
              title="Custom colour"
            />
          </div>
        </div>}

        {/* ── Shape (hidden for region nodes) ── */}
        {!readOnly && node.type !== 'region' && (
          <div className="node-editor__field">
            <label className="node-editor__label">Shape</label>
            <div className="node-editor__shapes">
              {SHAPES.map((s) => (
                <button
                  key={s.value}
                  className={`node-editor__shape-btn${form.shape === s.value ? ' node-editor__shape-btn--active' : ''}`}
                  onClick={() => handleChange('shape', s.value)}
                  title={s.label}
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Portal link (portal nodes only) ── */}
        {node.type === 'portal' && (
          <div className="node-editor__field">
            <label className="node-editor__label">Linked map</label>
            {form.targetMapId ? (
              <div className="node-editor__portal-linked">
                <span className="node-editor__portal-dest">
                  → {form.targetMapTitle || form.targetMapId}
                </span>
                {!readOnly && (
                  <button
                    className="node-editor__portal-clear"
                    onClick={handleMapClear}
                    title="Remove link"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <p className="node-editor__hint">No map linked yet.</p>
            )}
            {!readOnly && (
              <>
                <button
                  className="node-editor__portal-btn"
                  onClick={() => setShowLinkModal(true)}
                >
                  ↗ {form.targetMapId ? 'Change linked map…' : 'Link a map…'}
                </button>
                <div className="node-editor__portal-paste">
                  <input
                    className="node-editor__input"
                    placeholder="…or paste /map/… URL"
                    value={pasteValue}
                    onChange={(e) => setPasteValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePasteLink() }}
                  />
                  <button
                    className="node-editor__portal-go"
                    onClick={handlePasteLink}
                    disabled={pasting || !pasteValue.trim()}
                    title="Fetch map info from URL"
                  >
                    {pasting ? '…' : 'Link'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Image URL (hidden for region nodes) ── */}
        {node.type !== 'region' && (
          <div className="node-editor__field">
            <label className="node-editor__label">Image URL</label>
            <input
              className="node-editor__input"
              type="text"
              value={form.imageUrl || ''}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              placeholder="https://…"
              readOnly={readOnly}
            />
            {form.imageUrl && (
              <ImagePreview
                url={form.imageUrl}
                onClear={readOnly ? null : () => handleChange('imageUrl', '')}
              />
            )}
          </div>
        )}

        {/* ── Layer ── */}
        <div className="node-editor__field">
          <label className="node-editor__label">Layer</label>
          <select
            className="node-editor__input node-editor__select"
            value={currentLayer}
            onChange={(e) => handleChange('layer', Number(e.target.value))}
            disabled={readOnly}
          >
            {LAYER_NAMES.map((name, i) => (
              <option key={i} value={i}>{i} — {name}</option>
            ))}
          </select>
        </div>

        {/* ── Parent node (only for layers 1–4) ── */}
        {currentLayer > 0 && (
          <div className="node-editor__field">
            <label className="node-editor__label">Parent node (Layer {currentLayer - 1})</label>
            <select
              className="node-editor__input node-editor__select"
              value={form.parentNodeId || ''}
              onChange={(e) => handleChange('parentNodeId', e.target.value || null)}
              disabled={readOnly}
            >
              <option value="">(none)</option>
              {parentCandidates.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.data?.title || n.data?.name || '(untitled)'} [{n.type}]
                </option>
              ))}
            </select>
            {currentLayer > 0 && parentCandidates.length === 0 && (
              <p className="node-editor__hint">
                No Layer {currentLayer - 1} nodes exist yet.
              </p>
            )}
          </div>
        )}
      </div>

      {showLinkModal && (
        <MapLinkModal
          onSelect={handleMapLink}
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </div>
  )
}
