import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import EventNode          from '../nodes/EventNode.jsx'
import CharacterNode      from '../nodes/CharacterNode.jsx'
import NoteNode           from '../nodes/NoteNode.jsx'
import RegionNode         from '../nodes/RegionNode.jsx'
import { LayerContext }   from '../LayerContext.js'
import LayerIndicator     from '../components/LayerIndicator.jsx'
import NodeDetailOverlay  from '../components/NodeDetailOverlay.jsx'
import { api } from '../api.js'
import './MapViewer.css'

const nodeTypes = {
  event:     EventNode,
  character: CharacterNode,
  note:      NoteNode,
  region:    RegionNode,
}

// Identical visibility logic to App.jsx — show primary window + ghost layer.
function useVisibleGraph(nodes, edges, activeLayer) {
  return useMemo(() => {
    const al = activeLayer

    const primarySet = new Set(
      nodes.filter((n) => {
        const nl = n.data?.layer ?? 0
        return nl >= al && nl <= al + 2
      }).map((n) => n.id)
    )

    const ghostSet = new Set()
    if (al > 0) {
      nodes
        .filter((n) => primarySet.has(n.id) && n.data?.parentNodeId)
        .forEach((n) => ghostSet.add(n.data.parentNodeId))
      edges.forEach((e) => {
        if (primarySet.has(e.source) && !primarySet.has(e.target)) ghostSet.add(e.target)
        if (primarySet.has(e.target) && !primarySet.has(e.source)) ghostSet.add(e.source)
      })
      const nodeMap = new Map(nodes.map((n) => [n.id, n]))
      for (const id of [...ghostSet]) {
        const n = nodeMap.get(id)
        if (!n || (n.data?.layer ?? 0) !== al - 1) ghostSet.delete(id)
      }
    }

    const allVisIds = new Set([...primarySet, ...ghostSet])
    return [
      nodes.filter((n) => allVisIds.has(n.id)),
      edges.filter((e) => allVisIds.has(e.source) && allVisIds.has(e.target)),
    ]
  }, [nodes, edges, activeLayer])
}

// ── State machine: 'loading' | 'ok' | 'notfound' ─────────────────────────────

export default function MapViewer() {
  const { mapId } = useParams()
  const [status,      setStatus]      = useState('loading')
  const [title,       setTitle]       = useState('')
  const [nodes,       setNodes]       = useState([])
  const [edges,       setEdges]       = useState([])
  const [bgColor,     setBgColor]     = useState('#0f0e11')
  const [activeLayer, setActiveLayer] = useState(0)
  const [detailNode,  setDetailNode]  = useState(null)

  useEffect(() => {
    setStatus('loading')
    api.getPublicMap(mapId)
      .then((map) => {
        const { nodes: n = [], edges: e = [] } = map.graph_data ?? {}
        setNodes(n)
        setEdges(e)
        setTitle(map.title ?? '')
        setBgColor('#0f0e11')
        setStatus('ok')
      })
      .catch(() => setStatus('notfound'))
  }, [mapId])

  const [visibleNodes, visibleEdges] = useVisibleGraph(nodes, edges, activeLayer)

  // Ghost node click → navigate to that layer
  const onNodeClick = useCallback((_e, node) => {
    const relLayer = (node.data?.layer ?? 0) - activeLayer
    if (relLayer === -1) setActiveLayer(node.data.layer)
  }, [activeLayer])

  // Double-click → open detail overlay in read-only mode
  const onNodeDoubleClick = useCallback((_e, node) => {
    setDetailNode(node)
  }, [])

  const closeDetail = useCallback(() => setDetailNode(null), [])

  if (status === 'loading') {
    return (
      <div className="viewer viewer--state">
        <p className="viewer__state-text">Loading…</p>
      </div>
    )
  }

  if (status !== 'ok') {
    return (
      <div className="viewer viewer--state">
        <h2 className="viewer__state-heading">Map not found</h2>
        <p className="viewer__state-text">
          This map doesn't exist or hasn't been published.
        </p>
        <a className="viewer__home-link" href="/">Go to PlotMap →</a>
      </div>
    )
  }

  return (
    <div className="viewer">
      <header className="viewer__header">
        <a className="viewer__logo" href="/">PlotMap</a>
        <h1 className="viewer__title">{title}</h1>
        <span className="viewer__badge">View only</span>
      </header>

      <div className="viewer__canvas" style={{ '--canvas-bg': bgColor }}>
        <LayerContext.Provider value={activeLayer}>
          <LayerIndicator activeLayer={activeLayer} onChange={setActiveLayer} />
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            fitView
            fitViewOptions={{ padding: 0.15 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#2e2b38" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(n) => {
                if (n.data?.color) return n.data.color
                const map = {
                  event:     '#3a5a8a',
                  character: '#6a3a6a',
                  note:      '#8a6a3a',
                  region:    '#404060',
                }
                return map[n.type] || '#444'
              }}
              maskColor="rgba(15,14,17,0.7)"
            />
          </ReactFlow>
        </LayerContext.Provider>

        {detailNode && (
          <NodeDetailOverlay
            node={detailNode}
            onClose={closeDetail}
            onChange={() => {}}
            readOnly
          />
        )}
      </div>
    </div>
  )
}
