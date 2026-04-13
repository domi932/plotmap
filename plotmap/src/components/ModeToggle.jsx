import './ModeToggle.css'

export const MODES = {
  VIEW:    'view',
  SUGGEST: 'suggest',
  EDIT:    'edit',
}

const MODE_CONFIG = [
  { key: MODES.VIEW,    label: 'View',    icon: '👁',  title: 'Read-only — pan and zoom only' },
  { key: MODES.SUGGEST, label: 'Suggest', icon: '💬', title: 'Annotation mode — click a node to annotate' },
  { key: MODES.EDIT,    label: 'Edit',    icon: '✏️',  title: 'Full editor' },
]

export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="mode-toggle" role="toolbar" aria-label="Editor mode">
      {MODE_CONFIG.map((m) => (
        <button
          key={m.key}
          className={`mode-toggle__btn${mode === m.key ? ' mode-toggle__btn--active' : ''}`}
          onClick={() => onChange(m.key)}
          title={m.title}
          aria-pressed={mode === m.key}
        >
          <span className="mode-toggle__icon">{m.icon}</span>
          <span className="mode-toggle__label">{m.label}</span>
        </button>
      ))}
    </div>
  )
}
