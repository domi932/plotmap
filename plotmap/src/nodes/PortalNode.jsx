import { Handle, Position } from '@xyflow/react'
import './NodeBase.css'
import { getNodeStyle } from './nodeUtils.js'
import { useActiveLayer } from '../LayerContext.js'

const DEFAULT_SHAPE = 'rectangle'

export default function PortalNode({ data, selected }) {
  const activeLayer = useActiveLayer()
  const relLayer    = (data.layer ?? 0) - activeLayer
  const shape       = data.shape ?? DEFAULT_SHAPE
  const nodeStyle   = getNodeStyle(data.color)

  const isLinked    = !!data.targetMapId
  const hasLabel    = !!(data.label && data.label.trim())
  const displayTitle = hasLabel
    ? data.label
    : (data.targetMapTitle || 'Untitled Portal')
  // Show destination meta only when a custom label hides the map name
  const showDest    = isLinked && hasLabel && data.label !== data.targetMapTitle
  const hoverTitle  = isLinked
    ? `↗ Opens "${data.targetMapTitle || data.targetMapId}"`
    : '↗ Portal — not yet linked to a map'

  // ── Ghost: parent-layer context node ──────────────────────────────────────
  if (relLayer === -1) {
    return (
      <div
        className={`node node--ghost node--portal node--${shape} ${selected ? 'node--selected' : ''}`}
        style={nodeStyle}
        title={`Layer ${data.layer ?? 0} — click to navigate there`}
      >
        <Handle type="target" id="top-target"    position={Position.Top}    style={{ opacity: 0 }} />
        <Handle type="source" id="top-source"    position={Position.Top} />
        <Handle type="target" id="left-target"   position={Position.Left}   style={{ opacity: 0 }} />
        <Handle type="source" id="left-source"   position={Position.Left} />
        <div className="node__badge">↑ Portal · L{data.layer ?? 0}</div>
        <div className="node__title">{displayTitle}</div>
        <Handle type="target" id="right-target"  position={Position.Right}  style={{ opacity: 0 }} />
        <Handle type="source" id="right-source"  position={Position.Right} />
        <Handle type="target" id="bottom-target" position={Position.Bottom} style={{ opacity: 0 }} />
        <Handle type="source" id="bottom-source" position={Position.Bottom} />
      </div>
    )
  }

  // ── Micro: 16 px colour dot ───────────────────────────────────────────────
  if (relLayer === 2) {
    const dotStyle = data.color ? { background: data.color, borderColor: data.color } : undefined
    return (
      <div className="node--micro node--portal" style={dotStyle} title={displayTitle}>
        <Handle type="target" id="top-target"    position={Position.Top}    style={{ opacity: 0 }} />
        <Handle type="source" id="top-source"    position={Position.Top}    style={{ opacity: 0 }} />
        <Handle type="target" id="left-target"   position={Position.Left}   style={{ opacity: 0 }} />
        <Handle type="source" id="left-source"   position={Position.Left}   style={{ opacity: 0 }} />
        <Handle type="target" id="right-target"  position={Position.Right}  style={{ opacity: 0 }} />
        <Handle type="source" id="right-source"  position={Position.Right}  style={{ opacity: 0 }} />
        <Handle type="target" id="bottom-target" position={Position.Bottom} style={{ opacity: 0 }} />
        <Handle type="source" id="bottom-source" position={Position.Bottom} style={{ opacity: 0 }} />
      </div>
    )
  }

  // ── Mini: compact pill ────────────────────────────────────────────────────
  if (relLayer === 1) {
    return (
      <div
        className={`node node--mini node--portal node--${shape} ${selected ? 'node--selected' : ''}`}
        style={nodeStyle}
        title={hoverTitle}
      >
        <Handle type="target" id="top-target"    position={Position.Top}    style={{ opacity: 0 }} />
        <Handle type="source" id="top-source"    position={Position.Top} />
        <Handle type="target" id="left-target"   position={Position.Left}   style={{ opacity: 0 }} />
        <Handle type="source" id="left-source"   position={Position.Left} />
        <span className="node__mini-title">↗ {displayTitle}</span>
        <Handle type="target" id="right-target"  position={Position.Right}  style={{ opacity: 0 }} />
        <Handle type="source" id="right-source"  position={Position.Right} />
        <Handle type="target" id="bottom-target" position={Position.Bottom} style={{ opacity: 0 }} />
        <Handle type="source" id="bottom-source" position={Position.Bottom} />
      </div>
    )
  }

  // ── Full ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={`node node--portal node--${shape} ${selected ? 'node--selected' : ''}`}
      style={nodeStyle}
      title={hoverTitle}
    >
      <Handle type="target" id="top-target"    position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" id="top-source"    position={Position.Top} />
      <Handle type="target" id="left-target"   position={Position.Left}   style={{ opacity: 0 }} />
      <Handle type="source" id="left-source"   position={Position.Left} />

      <div className="node__badge">↗ Portal</div>
      <div className="node__title">{displayTitle}</div>
      {showDest && (
        <div className="node__meta">→ {data.targetMapTitle}</div>
      )}
      {!isLinked && (
        <div className="node__portal-unlinked">⚠ Not linked</div>
      )}

      <Handle type="target" id="right-target"  position={Position.Right}  style={{ opacity: 0 }} />
      <Handle type="source" id="right-source"  position={Position.Right} />
      <Handle type="target" id="bottom-target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" id="bottom-source" position={Position.Bottom} />
    </div>
  )
}
