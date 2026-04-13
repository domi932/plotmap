import './Sidebar.css'

const NODE_TYPES = [
  { type: 'event',     label: 'Event',     icon: '⚡', description: 'A plot point or story beat' },
  { type: 'character', label: 'Character', icon: '🎭', description: 'A person or entity' },
  { type: 'note',      label: 'Note',      icon: '📝', description: 'A free annotation' },
  { type: 'region',    label: 'Region',    icon: '▭',  description: 'A background grouping area' },
]

export default function Sidebar({
  mapTitle, onTitleChange,
  onSave, isSaving, mapId,
  isPublished, onPublishToggle,
  onExport, onLoad, onOpenMyMaps, onNewMap,
  canUndo, canRedo, onUndo, onRedo,
  onAutoLayout,
  layoutDir, onLayoutDirChange,
  layoutNodeSep, onLayoutNodeSepChange,
  layoutRankSep, onLayoutRankSepChange,
  mode,
  user, onSignOut,
}) {
  const isEdit = mode === 'edit'
  const onDragStart = (e, nodeType) => {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <h1 className="sidebar__logo">PlotMap</h1>
        <p className="sidebar__tagline">Story Structure Editor</p>
      </div>

      <div className="sidebar__section">
        <label className="sidebar__label">Map title</label>
        <input
          className="sidebar__input"
          value={mapTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="My story…"
        />
      </div>

      {isEdit && (
        <div className="sidebar__section">
          <label className="sidebar__label">Drag to add</label>
          <div className="sidebar__nodes">
            {NODE_TYPES.map((n) => (
              <div
                key={n.type}
                className={`sidebar__node sidebar__node--${n.type}`}
                draggable
                onDragStart={(e) => onDragStart(e, n.type)}
              >
                <span className="sidebar__node-icon">{n.icon}</span>
                <div>
                  <div className="sidebar__node-label">{n.label}</div>
                  <div className="sidebar__node-desc">{n.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEdit && (
        <div className="sidebar__section">
          <label className="sidebar__label">Auto-layout</label>

          <div className="sidebar__layout-row">
            <span className="sidebar__layout-label">Direction</span>
            <div className="sidebar__pills">
              <button
                className={`sidebar__pill${layoutDir === 'LR' ? ' sidebar__pill--active' : ''}`}
                onClick={() => onLayoutDirChange('LR')}
              >
                L → R
              </button>
              <button
                className={`sidebar__pill${layoutDir === 'TB' ? ' sidebar__pill--active' : ''}`}
                onClick={() => onLayoutDirChange('TB')}
              >
                T → B
              </button>
            </div>
          </div>

          <div className="sidebar__layout-row">
            <span className="sidebar__layout-label">Node gap</span>
            <input
              type="number"
              className="sidebar__num"
              min="20" max="200" step="10"
              value={layoutNodeSep}
              onChange={(e) => onLayoutNodeSepChange(Number(e.target.value))}
            />
          </div>

          <div className="sidebar__layout-row">
            <span className="sidebar__layout-label">Rank gap</span>
            <input
              type="number"
              className="sidebar__num"
              min="40" max="300" step="10"
              value={layoutRankSep}
              onChange={(e) => onLayoutRankSepChange(Number(e.target.value))}
            />
          </div>

          <button className="sidebar__btn sidebar__btn--ghost" onClick={onAutoLayout}>
            ⬡ Auto-arrange nodes
          </button>
        </div>
      )}

      {isEdit && (
        <div className="sidebar__section">
          <label className="sidebar__label">History</label>
          <div className="sidebar__history">
            <button
              className="sidebar__btn sidebar__btn--ghost"
              onClick={onUndo}
              disabled={!canUndo}
            >
              ↩ Undo
            </button>
            <button
              className="sidebar__btn sidebar__btn--ghost"
              onClick={onRedo}
              disabled={!canRedo}
            >
              ↪ Redo
            </button>
          </div>
        </div>
      )}

      <div className="sidebar__section sidebar__section--bottom">
        <label className="sidebar__label">
          {mapId ? 'Saved to cloud' : 'Save'}
        </label>
        <button
          className="sidebar__btn sidebar__btn--accent"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? '…Saving' : mapId ? '↑ Save' : '↑ Save to cloud'}
        </button>
        <button className="sidebar__btn sidebar__btn--ghost" onClick={onNewMap}>
          ✦ New Map
        </button>
        <button className="sidebar__btn sidebar__btn--ghost" onClick={onOpenMyMaps}>
          ⊞ My Maps
        </button>

        {mapId && (
          <div className="sidebar__publish">
            <button
              className={`sidebar__btn${isPublished ? ' sidebar__btn--published' : ' sidebar__btn--ghost'}`}
              onClick={onPublishToggle}
            >
              {isPublished ? '◉ Published' : '◎ Publish'}
            </button>
            {isPublished && (
              <button
                className="sidebar__btn sidebar__btn--ghost sidebar__btn--copy"
                onClick={() => {
                  const url = `${window.location.origin}/map/${mapId}`
                  navigator.clipboard.writeText(url)
                    .then(() => alert(`Copied!\n${url}`))
                    .catch(() => alert(`Share link:\n${window.location.origin}/map/${mapId}`))
                }}
              >
                ⎘ Copy share link
              </button>
            )}
          </div>
        )}
        <div className="sidebar__file-links">
          <button className="sidebar__file-link" onClick={onExport}>
            Export to file
          </button>
          <label className="sidebar__file-link" style={{ cursor: 'pointer' }}>
            Import from file
            <input type="file" accept=".json" onChange={onLoad} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {user && (
        <div className="sidebar__section sidebar__section--account">
          <span className="sidebar__account-email">{user.email}</span>
          <button className="sidebar__btn sidebar__btn--ghost" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}

      <div className="sidebar__tip">
        <strong>Tips:</strong> Drag nodes or press E / C / N to add. Right-click the canvas or a node for more options. Connect by dragging handles. Press Delete to remove selected items. Ctrl+Z / Ctrl+Y to undo/redo.
      </div>
    </aside>
  )
}
