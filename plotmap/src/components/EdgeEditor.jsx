import './EdgeEditor.css'

const EDGE_TYPES = [
  { key: 'solid',    label: 'Solid' },
  { key: 'dashed',   label: 'Dashed' },
  { key: 'animated', label: 'Animated' },
]

// Props applied to the React Flow edge object for each style type
const TYPE_PROPS = {
  solid:    { animated: false, style: {} },
  dashed:   { animated: false, style: { strokeDasharray: '6 3' } },
  animated: { animated: true,  style: {} },
}

export default function EdgeEditor({ edge, onChange, onDelete, readOnly = false }) {
  if (!edge) return null

  const edgeType = edge.data?.edgeType || 'solid'
  const label    = edge.label || ''

  const handleLabelChange = (e) => {
    onChange(edge.id, { label: e.target.value })
  }

  const handleTypeChange = (type) => {
    onChange(edge.id, {
      ...TYPE_PROPS[type],
      data: { ...edge.data, edgeType: type },
    })
  }

  return (
    <div className="edge-editor">
      <div className="edge-editor__header">
        <span className="edge-editor__badge">Connection</span>
        {!readOnly && (
          <button className="edge-editor__delete" onClick={() => onDelete(edge.id)}>
            Delete
          </button>
        )}
      </div>

      <div className="edge-editor__fields">
        <div className="edge-editor__field">
          <label className="edge-editor__label">Label</label>
          <input
            className="edge-editor__input"
            type="text"
            value={label}
            onChange={handleLabelChange}
            placeholder="e.g. causes, motivates…"
            readOnly={readOnly}
          />
        </div>

        <div className="edge-editor__field">
          <label className="edge-editor__label">Style</label>
          <div className="edge-editor__type-row">
            {EDGE_TYPES.map((t) => (
              <button
                key={t.key}
                className={`edge-editor__type-btn ${edgeType === t.key ? 'edge-editor__type-btn--active' : ''}${readOnly ? ' edge-editor__type-btn--readonly' : ''}`}
                onClick={() => !readOnly && handleTypeChange(t.key)}
                disabled={readOnly}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
