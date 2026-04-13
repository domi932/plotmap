import { NodeResizer } from '@xyflow/react'
import './RegionNode.css'
import { useActiveLayer } from '../LayerContext.js'

function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(80, 80, 120, ${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function RegionNode({ data, selected }) {
  const activeLayer = useActiveLayer()
  const relLayer = (data.layer ?? 0) - activeLayer

  // Regions only render at their own layer (relLayer === 0)
  if (relLayer !== 0) return null

  const fillColor   = data.color ? hexToRgba(data.color, 0.15) : 'rgba(80, 80, 120, 0.10)'
  const borderColor = data.color ? hexToRgba(data.color, 0.45) : 'rgba(80, 80, 120, 0.30)'

  return (
    <div
      className={`region${selected ? ' region--selected' : ''}`}
      style={{ background: fillColor, borderColor }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        handleStyle={{ width: 10, height: 10, borderRadius: 2 }}
        lineStyle={{ borderColor: selected ? 'rgba(200, 169, 110, 0.6)' : 'transparent' }}
      />
      {data.title && (
        <span className="region__label">{data.title}</span>
      )}
    </div>
  )
}
