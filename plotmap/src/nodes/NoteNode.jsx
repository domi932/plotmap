import { Handle, Position } from '@xyflow/react'
import './NodeBase.css'
import { hasDetailContent, getNodeStyle } from './nodeUtils.js'
import { useActiveLayer } from '../LayerContext.js'

const DEFAULT_SHAPE = 'rectangle'

export default function NoteNode({ data, selected }) {
  const activeLayer = useActiveLayer()
  const relLayer = (data.layer ?? 0) - activeLayer
  const shape = data.shape ?? DEFAULT_SHAPE
  const nodeStyle = getNodeStyle(data.color)

  // ── Ghost ─────────────────────────────────────────────────────────────────
  if (relLayer === -1) {
    return (
      <div
        className={`node node--ghost node--note node--${shape} ${selected ? 'node--selected' : ''}`}
        style={nodeStyle}
        title={`Layer ${data.layer ?? 0} — click to navigate there`}
      >
        <Handle type="target" id="top-target"    position={Position.Top}    style={{ opacity: 0 }} />
        <Handle type="source" id="top-source"    position={Position.Top} />
        <Handle type="target" id="left-target"   position={Position.Left}   style={{ opacity: 0 }} />
        <Handle type="source" id="left-source"   position={Position.Left} />
        <div className="node__badge">↑ Note · L{data.layer ?? 0}</div>
        <div className="node__title">{data.title || 'Note'}</div>
        {data.description && <div className="node__desc">{data.description}</div>}
        <Handle type="target" id="right-target"  position={Position.Right}  style={{ opacity: 0 }} />
        <Handle type="source" id="right-source"  position={Position.Right} />
        <Handle type="target" id="bottom-target" position={Position.Bottom} style={{ opacity: 0 }} />
        <Handle type="source" id="bottom-source" position={Position.Bottom} />
      </div>
    )
  }

  // ── Micro ─────────────────────────────────────────────────────────────────
  if (relLayer === 2) {
    const dotStyle = data.color ? { background: data.color, borderColor: data.color } : undefined
    return (
      <div className="node--micro node--note" style={dotStyle} title={data.title}>
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

  // ── Mini ──────────────────────────────────────────────────────────────────
  if (relLayer === 1) {
    return (
      <div
        className={`node node--mini node--note node--${shape} ${selected ? 'node--selected' : ''}`}
        style={nodeStyle}
        title={data.description}
      >
        <Handle type="target" id="top-target"    position={Position.Top}    style={{ opacity: 0 }} />
        <Handle type="source" id="top-source"    position={Position.Top} />
        <Handle type="target" id="left-target"   position={Position.Left}   style={{ opacity: 0 }} />
        <Handle type="source" id="left-source"   position={Position.Left} />
        <span className="node__mini-title">{data.title || 'Note'}</span>
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
      className={`node node--note node--${shape} ${selected ? 'node--selected' : ''}`}
      style={nodeStyle}
    >
      <Handle type="target" id="top-target"    position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" id="top-source"    position={Position.Top} />
      <Handle type="target" id="left-target"   position={Position.Left}   style={{ opacity: 0 }} />
      <Handle type="source" id="left-source"   position={Position.Left} />
      <div className="node__badge">Note</div>
      <div className="node__title">{data.title || 'Note'}</div>
      {hasDetailContent(data.detailContent) && <div className="node__detail-hint">···</div>}
      {data.description && <div className="node__desc">{data.description}</div>}
      <Handle type="target" id="right-target"  position={Position.Right}  style={{ opacity: 0 }} />
      <Handle type="source" id="right-source"  position={Position.Right} />
      <Handle type="target" id="bottom-target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" id="bottom-source" position={Position.Bottom} />
    </div>
  )
}
