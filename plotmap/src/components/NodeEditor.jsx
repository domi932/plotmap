import { useEffect, useState } from 'react'
import './NodeEditor.css'

const FIELD_MAP = {
  event:     [{ key: 'title', label: 'Title', type: 'text' }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'time', label: 'Time / Chapter', type: 'text' }],
  character: [{ key: 'title', label: 'Name',  type: 'text' }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'role', label: 'Role (e.g. Protagonist)', type: 'text' }],
  note:      [{ key: 'title', label: 'Title', type: 'text' }, { key: 'description', label: 'Content', type: 'textarea' }],
  region:    [{ key: 'title', label: 'Label', type: 'text' }],
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

export default function NodeEditor({ node, onChange, onDelete, onDuplicate, allNodes = [], readOnly = false }) {
  const [form, setForm] = useState({})

  useEffect(() => {
    setForm(node?.data || {})
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
    </div>
  )
}
