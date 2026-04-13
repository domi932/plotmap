import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'

import Sidebar from './components/Sidebar.jsx'
import NodeEditor from './components/NodeEditor.jsx'
import EdgeEditor from './components/EdgeEditor.jsx'
import ContextMenu from './components/ContextMenu.jsx'
import ConnectToModal from './components/ConnectToModal.jsx'
import NodeDetailOverlay from './components/NodeDetailOverlay.jsx'
import LayerIndicator from './components/LayerIndicator.jsx'
import ModeToggle, { MODES } from './components/ModeToggle.jsx'
import AuthModal from './components/AuthModal.jsx'
import AnnotationPanel from './components/AnnotationPanel.jsx'
import { useToast } from './components/Toast.jsx'
import { api } from './api.js'
import { supabase } from './supabase.js'
import EventNode from './nodes/EventNode.jsx'
import CharacterNode from './nodes/CharacterNode.jsx'
import NoteNode from './nodes/NoteNode.jsx'
import RegionNode from './nodes/RegionNode.jsx'
import { LayerContext } from './LayerContext.js'
import './App.css'

const nodeTypes = {
  event: EventNode,
  character: CharacterNode,
  note: NoteNode,
  region: RegionNode,
}

const INITIAL_NODES = [
  { id: '1', type: 'character', position: { x: 80,  y: 200 }, data: { title: 'The Hero',    role: 'Protagonist', description: 'A reluctant hero thrust into an impossible quest.', layer: 0, shape: 'circle' } },
  { id: '2', type: 'event',     position: { x: 340, y: 80  }, data: { title: 'The Call',    time: 'Chapter 1',   description: 'An urgent message arrives and changes everything.', layer: 0 } },
  { id: '3', type: 'event',     position: { x: 340, y: 340 }, data: { title: 'Refusal',     time: 'Chapter 1',   description: 'The hero initially refuses the call to action.',    layer: 0 } },
  { id: '4', type: 'event',     position: { x: 600, y: 200 }, data: { title: 'Turning Point', time: 'Chapter 2',  description: 'Everything changes — the quest becomes inevitable.', layer: 0 } },
  { id: '5', type: 'note',      position: { x: 860, y: 200 }, data: { title: 'Act II begins',                     description: 'The journey starts here regardless of hesitation.',  layer: 0 } },
]

const INITIAL_EDGES = [
  { id: 'e1-2', source: '1', target: '2', sourceHandle: 'right-source', targetHandle: 'left-target' },
  { id: 'e1-3', source: '1', target: '3', sourceHandle: 'right-source', targetHandle: 'left-target' },
  { id: 'e2-4', source: '2', target: '4', sourceHandle: 'right-source', targetHandle: 'left-target' },
  { id: 'e3-4', source: '3', target: '4', sourceHandle: 'right-source', targetHandle: 'left-target' },
  { id: 'e4-5', source: '4', target: '5', sourceHandle: 'right-source', targetHandle: 'left-target' },
]

let nodeIdCounter = 100

const DEFAULT_SHAPES = { event: 'rectangle', character: 'circle', note: 'rectangle' }

// ── Dagre auto-layout ──────────────────────────────────────────────────────
const NODE_WIDTH  = 200
const NODE_HEIGHT = 80

function applyDagreLayout(nodes, edges, { direction = 'LR', nodeSep = 60, rankSep = 80 } = {}) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: nodeSep, ranksep: rankSep })

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges
    .filter((e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target))
    .forEach((e) => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map((n) => {
    const { x, y } = g.node(n.id)
    return { ...n, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } }
  })
}

// ── Layer visibility helpers ───────────────────────────────────────────────
function isNodeVisible(node, activeLayer) {
  const nl = node.data?.layer ?? 0
  return nl >= activeLayer && nl <= activeLayer + 2
}

export default function App() {
  const navigate = useNavigate()
  const { mapId: routeMapId } = useParams()
  const addToast = useToast()

  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [mapTitle, setMapTitle]         = useState("Hero's Journey")
  const reactFlowWrapper                = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  // ── Auth ──────────────────────────────────────────────────────────────────
  // null  → session not yet determined (initialising)
  // false → no authenticated user (show AuthModal)
  // object → authenticated Supabase user
  const [user, setUser] = useState(null)
  const userRef = useRef(null)  // synchronous copy for use in callbacks

  useEffect(() => {
    // Get the initial session synchronously, then subscribe to changes.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? false
      setUser(u)
      userRef.current = u
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? false
      setUser(u)
      userRef.current = u
    })
    return () => subscription.unsubscribe()
  }, [])

  const onSignOut = useCallback(async () => {
    const u = userRef.current
    if (u?.id) localStorage.removeItem(`plotmap_mapid_${u.id}`)
    setMapId(null)
    setIsPublished(false)
    await supabase.auth.signOut()
  }, [])

  // ── Server-backed map identity ────────────────────────────────────────────
  // null  → map has never been saved to the server (new or imported from file)
  // uuid  → server-assigned ID; Save will call PUT /maps/{id}
  const [mapId,        setMapId]        = useState(null)
  const [isPublished,  setIsPublished]  = useState(false)
  const [isSaving,     setIsSaving]     = useState(false)
  const [isHydrating,  setIsHydrating]  = useState(false)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)

  // Persist mapId to localStorage so it survives page reloads.
  // Key is scoped per user to avoid cross-account bleed.
  const persistMapId = useCallback((id) => {
    setMapId(id)
    const u = userRef.current
    if (!u?.id) return
    const key = `plotmap_mapid_${u.id}`
    if (id) {
      localStorage.setItem(key, id)
    } else {
      localStorage.removeItem(key)
    }
  }, [])

  // On first auth resolution, either load the route map or restore from localStorage.
  const userId = user?.id ?? null
  useEffect(() => {
    if (!userId) return
    if (routeMapId) {
      // /editor/:mapId — load that specific map from the server
      onLoadFromServer(routeMapId)
    } else {
      const stored = localStorage.getItem(`plotmap_mapid_${userId}`)
      if (stored) {
        setMapId(stored)
        setIsHydrating(true)
        // Hydrate title and publish state from the server so they're accurate
        // on page load without requiring a manual save first.
        api.getMap(stored)
          .then((map) => {
            setMapTitle(map.title)
            setIsPublished(map.is_published ?? false)
          })
          .catch(() => {
            // Map was deleted from the server — clear the stale localStorage key.
            persistMapId(null)
          })
          .finally(() => setIsHydrating(false))
      }
    }
  // onLoadFromServer is stable (useCallback with no deps that change), safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, routeMapId])

  // ── Edit mode ─────────────────────────────────────────────────────────────
  // 'view' | 'suggest' | 'edit'  — only 'edit' allows mutations.
  const [mode, setMode] = useState(MODES.EDIT)
  const modeRef = useRef(MODES.EDIT)
  const setCurrentMode = useCallback((m) => {
    setMode(m)
    modeRef.current = m
  }, [])
  const isEditing = () => modeRef.current === MODES.EDIT

  // ── Canvas background colour (persisted) ───────────────────────────────────
  const [bgColor, setBgColor] = useState(
    () => localStorage.getItem('plotmap_bg_color') || '#0f0e11'
  )
  const bgColorInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('plotmap_bg_color', bgColor)
  }, [bgColor])

  // ── Layout options ─────────────────────────────────────────────────────────
  const [layoutDir,     setLayoutDir]     = useState('LR')
  const [layoutNodeSep, setLayoutNodeSep] = useState(60)
  const [layoutRankSep, setLayoutRankSep] = useState(80)

  // ── Active layer ───────────────────────────────────────────────────────────
  // Derived from selectedNode: when a node is selected, its layer becomes active.
  // When nothing is selected, layer resets to 0.
  // The LayerIndicator dropdown can manually override while nothing is selected.
  const [activeLayer, setActiveLayerState] = useState(0)
  const activeLayerRef = useRef(0)

  const setActiveLayer = useCallback((l) => {
    setActiveLayerState(l)
    activeLayerRef.current = l
  }, [])

  // activeLayer follows the selected node's layer.
  // Deselecting (pane click, undo) keeps the current layer — no jump back to 0.
  const _selId    = selectedNode?.id ?? null
  const _selLayer = selectedNode?.data?.layer ?? 0
  useEffect(() => {
    if (_selId !== null) setActiveLayer(_selLayer)
  }, [_selId, _selLayer, setActiveLayer])

  // ── Visible nodes/edges ────────────────────────────────────────────────────
  // Primary window:  layers [activeLayer … activeLayer+2]
  // Ghost window:    layer  activeLayer-1 nodes that share an edge with a
  //                  primary node (provides parent-layer context).
  const [visibleNodes, visibleEdges] = useMemo(() => {
    const al = activeLayer

    // Primary set
    const primarySet = new Set(
      nodes.filter((n) => isNodeVisible(n, al)).map((n) => n.id)
    )

    // Ghost set: connected parent-layer nodes
    const ghostSet = new Set()
    if (al > 0) {
      // parentNodeId references
      nodes
        .filter((n) => primarySet.has(n.id) && n.data?.parentNodeId)
        .forEach((n) => ghostSet.add(n.data.parentNodeId))

      // edge-connected nodes one layer above
      edges.forEach((e) => {
        if (primarySet.has(e.source) && !primarySet.has(e.target)) ghostSet.add(e.target)
        if (primarySet.has(e.target) && !primarySet.has(e.source)) ghostSet.add(e.source)
      })

      // Keep only layer al-1 nodes in the ghost set
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

  // ── History (undo / redo) ──────────────────────────────────────────────────
  const historyRef      = useRef([{ nodes: INITIAL_NODES, edges: INITIAL_EDGES }])
  const historyIndexRef = useRef(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  // isDirty tracks unsaved changes — set true on any mutation, false after save or load.
  const isDirtyRef = useRef(false)

  const pushHistory = useCallback(() => {
    isDirtyRef.current = true
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push({ nodes: nodesRef.current, edges: edgesRef.current })
    historyIndexRef.current = historyRef.current.length - 1
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const { nodes: n, edges: e } = historyRef.current[historyIndexRef.current]
    setNodes(n)
    setEdges(e)
    setSelectedNode(null)
    setSelectedEdge(null)
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(true)
  }, [setNodes, setEdges])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    const { nodes: n, edges: e } = historyRef.current[historyIndexRef.current]
    setNodes(n)
    setEdges(e)
    setSelectedNode(null)
    setSelectedEdge(null)
    setCanUndo(true)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [setNodes, setEdges])

  // ── Select all visible nodes (Ctrl+A) ─────────────────────────────────────
  const selectAll = useCallback(() => {
    const al = activeLayerRef.current
    setNodes((prev) => {
      const visIds = new Set(
        prev
          .filter((n) => { const nl = n.data?.layer ?? 0; return nl >= al && nl <= al + 2 })
          .map((n) => n.id)
      )
      return prev.map((n) => ({ ...n, selected: visIds.has(n.id) }))
    })
  }, [setNodes])

  useEffect(() => {
    const onKey = (e) => {
      if (!isEditing()) return
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const tag = document.activeElement?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return
        if (document.activeElement?.isContentEditable) return
        e.preventDefault()
        selectAll()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, selectAll])

  // ── Connections ───────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params) => {
      if (!isEditing()) return
      pushHistory()
      setEdges((eds) =>
        addEdge({ ...params, label: '', data: { edgeType: 'solid' } }, eds)
      )
    },
    [setEdges, pushHistory]
  )

  // ── Connect from modal ────────────────────────────────────────────────────
  const onConnectFromModal = useCallback((sourceId, targetId) => {
    if (!isEditing()) return
    pushHistory()
    setEdges((eds) =>
      addEdge({ source: sourceId, target: targetId, sourceHandle: 'right-source', targetHandle: 'left-target', label: '', data: { edgeType: 'solid' } }, eds)
    )
  }, [pushHistory, setEdges])

  // ── Detail overlay ────────────────────────────────────────────────────────
  const [detailOverlayNode, setDetailOverlayNode] = useState(null)

  const onDetailContentChange = useCallback((id, content) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, detailContent: content } } : n))
    )
    setSelectedNode((prev) =>
      prev?.id === id ? { ...prev, data: { ...prev.data, detailContent: content } } : prev
    )
  }, [setNodes])

  const openDetailOverlay = useCallback((node) => {
    const fresh = nodesRef.current.find((n) => n.id === node.id) ?? node
    setDetailOverlayNode(fresh)
  }, [])

  const onNodeDoubleClick = useCallback((_e, node) => {
    // Allow opening detail overlay in all modes (view mode shows it read-only)
    openDetailOverlay(node)
  }, [openDetailOverlay])

  // ── Context menu state ─────────────────────────────────────────────────────
  const [paneMenu,        setPaneMenu]        = useState(null)
  const [nodeMenu,        setNodeMenu]        = useState(null)
  const [connectToSource, setConnectToSource] = useState(null)

  const closeMenus = useCallback(() => {
    setPaneMenu(null)
    setNodeMenu(null)
  }, [])

  // ── Selection ─────────────────────────────────────────────────────────────
  const onNodeClick = useCallback((_e, node) => {
    setSelectedNode(node)
    setSelectedEdge(null)
    closeMenus()
  }, [closeMenus])

  const onEdgeClick = useCallback((_e, edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
    closeMenus()
  }, [closeMenus])

  // Pane left-click only closes open context menus.
  // Deliberately does NOT deselect or reset the active layer.
  const onPaneClick = useCallback(() => {
    closeMenus()
  }, [closeMenus])

  // ── Context menu handlers ─────────────────────────────────────────────────
  const onPaneContextMenu = useCallback((e) => {
    e.preventDefault()
    if (!isEditing()) return
    if (!reactFlowInstance) return
    const flowPos = reactFlowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    setPaneMenu({ x: e.clientX, y: e.clientY, flowPos })
    setNodeMenu(null)
  }, [reactFlowInstance])

  const onNodeContextMenu = useCallback((e, node) => {
    e.preventDefault()
    if (!isEditing()) return
    setSelectedNode(node)
    setSelectedEdge(null)
    setNodeMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
    setPaneMenu(null)
  }, [])

  // ── Add node at a flow position on the current active layer ───────────────
  const addNodeAtPosition = useCallback((type, position) => {
    if (!isEditing()) return
    pushHistory()
    const isRegion = type === 'region'
    const newNode = {
      id: String(++nodeIdCounter),
      type,
      position,
      ...(isRegion ? { style: { width: 400, height: 300 }, zIndex: -1000 } : {}),
      data: isRegion
        ? { title: '', color: '', layer: activeLayerRef.current }
        : { title: '', description: '', layer: activeLayerRef.current, shape: DEFAULT_SHAPES[type] ?? 'rectangle' },
    }
    setNodes((nds) => nds.concat(newNode))
    setSelectedNode(newNode)
    setSelectedEdge(null)
  }, [pushHistory, setNodes])

  // ── Intercept built-in Delete key for history ─────────────────────────────
  const handleNodesChange = useCallback((changes) => {
    const hasRemove = changes.some((c) => c.type === 'remove')
    // Mark dirty when a node drag completes (dragging === false = final position)
    const hasFinalPosition = changes.some((c) => c.type === 'position' && c.dragging === false)
    const hasDimension     = changes.some((c) => c.type === 'dimensions')
    if (hasRemove && !isEditing()) return   // block React Flow's own delete in non-edit mode
    if (hasRemove) pushHistory()
    if ((hasFinalPosition || hasDimension) && isEditing()) isDirtyRef.current = true
    onNodesChange(changes)
  }, [onNodesChange, pushHistory])

  const handleEdgesChange = useCallback((changes) => {
    const hasRemove = changes.some((c) => c.type === 'remove')
    if (hasRemove && !isEditing()) return   // block React Flow's own delete in non-edit mode
    if (hasRemove) {
      pushHistory()
      setSelectedEdge(null)
    }
    onEdgesChange(changes)
  }, [onEdgesChange, pushHistory])

  // ── Drop node from sidebar ────────────────────────────────────────────────
  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      if (!isEditing()) return
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type || !reactFlowInstance) return

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      pushHistory()
      const isRegion = type === 'region'
      const newNode = {
        id: String(++nodeIdCounter),
        type,
        position,
        ...(isRegion ? { style: { width: 400, height: 300 }, zIndex: -1000 } : {}),
        data: isRegion
          ? { title: '', color: '', layer: activeLayerRef.current }
          : { title: '', description: '', layer: activeLayerRef.current, shape: DEFAULT_SHAPES[type] ?? 'rectangle' },
      }
      setNodes((nds) => nds.concat(newNode))
      setSelectedNode(newNode)
    },
    [reactFlowInstance, setNodes, pushHistory]
  )

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // ── Node mutations ────────────────────────────────────────────────────────
  const onNodeDataChange = useCallback((id, newData) => {
    if (!isEditing()) return
    isDirtyRef.current = true
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: newData } : n)))
    setSelectedNode((prev) => (prev?.id === id ? { ...prev, data: newData } : prev))
  }, [setNodes])

  const onNodeDelete = useCallback((id) => {
    if (!isEditing()) return
    pushHistory()
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    setSelectedNode(null)
  }, [setNodes, setEdges, pushHistory])

  const onNodeDuplicate = useCallback((id) => {
    if (!isEditing()) return
    const node = nodesRef.current.find((n) => n.id === id)
    if (!node) return
    pushHistory()
    const newNode = {
      ...node,
      id: String(++nodeIdCounter),
      position: { x: node.position.x + 30, y: node.position.y + 30 },
      data: { ...node.data },
    }
    setNodes((nds) => nds.concat(newNode))
    setSelectedNode(newNode)
  }, [setNodes, pushHistory])

  // ── Edge mutations ────────────────────────────────────────────────────────
  const onEdgeChange = useCallback((id, updates) => {
    if (!isEditing()) return
    setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, ...updates } : e)))
    setSelectedEdge((prev) => (prev?.id === id ? { ...prev, ...updates } : prev))
  }, [setEdges])

  const onEdgeDelete = useCallback((id) => {
    if (!isEditing()) return
    pushHistory()
    setEdges((eds) => eds.filter((e) => e.id !== id))
    setSelectedEdge(null)
  }, [setEdges, pushHistory])

  // ── Auto-layout (only lays out visible nodes in the current layer window) ──
  const onAutoLayout = useCallback(() => {
    if (!isEditing()) return
    pushHistory()
    setNodes((nds) => {
      const al = activeLayerRef.current
      const visSet = new Set(nds.filter((n) => isNodeVisible(n, al) && n.type !== 'region').map((n) => n.id))
      const visNds = nds.filter((n) => visSet.has(n.id))
      const visEds = edgesRef.current.filter((e) => visSet.has(e.source) && visSet.has(e.target))
      const laid   = applyDagreLayout(visNds, visEds, {
        direction: layoutDir,
        nodeSep:   layoutNodeSep,
        rankSep:   layoutRankSep,
      })
      const posMap = new Map(laid.map((n) => [n.id, n.position]))
      return nds.map((n) => posMap.has(n.id) ? { ...n, position: posMap.get(n.id) } : n)
    })
    setTimeout(() => reactFlowInstance?.fitView({ padding: 0.15 }), 50)
  }, [pushHistory, setNodes, reactFlowInstance, layoutDir, layoutNodeSep, layoutRankSep])

  // ── Keyboard shortcuts for node types ─────────────────────────────────────
  useEffect(() => {
    const TYPE_KEYS = { e: 'event', c: 'character', n: 'note' }
    const onKey = (ev) => {
      if (!isEditing()) return
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      // TipTap uses a contenteditable div — block shortcuts inside it too
      if (document.activeElement?.isContentEditable) return
      const type = TYPE_KEYS[ev.key.toLowerCase()]
      if (!type || !reactFlowInstance) return

      const { x, y, zoom } = reactFlowInstance.getViewport()
      const el = reactFlowWrapper.current
      const cx = el ? el.clientWidth  / 2 : 400
      const cy = el ? el.clientHeight / 2 : 300
      const position = { x: (cx - x) / zoom, y: (cy - y) / zoom }

      pushHistory()
      const newNode = {
        id: String(++nodeIdCounter),
        type,
        position,
        data: { title: '', description: '', layer: activeLayerRef.current, shape: DEFAULT_SHAPES[type] ?? 'rectangle' },
      }
      setNodes((nds) => nds.concat(newNode))
      setSelectedNode(newNode)
      setSelectedEdge(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reactFlowInstance, pushHistory, setNodes])

  // ── Save / Load ───────────────────────────────────────────────────────────

  // Internal helper: apply a loaded graph (nodes + edges + title) into state.
  // Also handles the handle-ID migration for graphs saved before Short term E.
  const applyLoadedGraph = useCallback((loadedNodes, loadedEdges, title) => {
    // Maps for migrating single-role handle IDs saved before omnidirectional handles
    const OLD_TARGET_IDS = { top: 'top-target', left: 'left-target' }
    const OLD_SOURCE_IDS = { right: 'right-source', bottom: 'bottom-source' }
    const migratedEdges = loadedEdges.map((edge) => {
      const e = { ...edge }
      // Pass 1: edges with no handle IDs at all (very old saves)
      if (!e.targetHandle) e.targetHandle = 'left-target'
      if (!e.sourceHandle) e.sourceHandle = 'right-source'
      // Pass 2: old single-role IDs ('left', 'right', 'top', 'bottom') → new dual-role IDs
      if (OLD_TARGET_IDS[e.targetHandle]) e.targetHandle = OLD_TARGET_IDS[e.targetHandle]
      if (OLD_SOURCE_IDS[e.sourceHandle]) e.sourceHandle = OLD_SOURCE_IDS[e.sourceHandle]
      return e
    })
    setNodes(loadedNodes)
    setEdges(migratedEdges)
    if (title) setMapTitle(title)
    setSelectedNode(null)
    setSelectedEdge(null)
    historyRef.current      = [{ nodes: loadedNodes, edges: migratedEdges }]
    historyIndexRef.current = 0
    setCanUndo(false)
    setCanRedo(false)
    isDirtyRef.current = false
  }, [setNodes, setEdges])

  // Primary save: POST /maps (first save) or PUT /maps/{id} (subsequent saves).
  const onSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const graphData = { nodes: nodesRef.current, edges: edgesRef.current }
      if (mapId) {
        await api.updateMap(mapId, mapTitle, graphData)
      } else {
        const created = await api.createMap(mapTitle, graphData)
        persistMapId(created.id)
        setIsPublished(created.is_published ?? false)
      }
      isDirtyRef.current = false
      addToast('Map saved', 'success')
    } catch (err) {
      addToast(`Failed to save: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }, [mapId, mapTitle, persistMapId, addToast])

  // Export to file: the original save-to-JSON behaviour, kept as a secondary option.
  const onExport = useCallback(() => {
    const data = { title: mapTitle, nodes: nodesRef.current, edges: edgesRef.current }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${mapTitle.replace(/\s+/g, '_') || 'plotmap'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [mapTitle])

  // Import from file: loads a local JSON file; clears mapId (not server-backed).
  const onLoad = useCallback((event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result)
        applyLoadedGraph(parsed.nodes || [], parsed.edges || [], parsed.title)
        persistMapId(null)   // imported from file → no server record
        setIsPublished(false)
      } catch {
        addToast('Could not read file — make sure it is a valid PlotMap JSON file.', 'error')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }, [applyLoadedGraph, persistMapId])

  // Load from server: fetches a map by ID and applies it.
  const onLoadFromServer = useCallback(async (id) => {
    setIsHydrating(true)
    try {
      const map = await api.getMap(id)
      const { nodes: n = [], edges: e = [] } = map.graph_data ?? {}
      applyLoadedGraph(n, e, map.title)
      persistMapId(map.id)
      setIsPublished(map.is_published ?? false)
    } catch (err) {
      addToast(`Could not load map: ${err.message}`, 'error')
    } finally {
      setIsHydrating(false)
    }
  }, [applyLoadedGraph, persistMapId, addToast])

  // ── New Map ───────────────────────────────────────────────────────────────
  const [newMapDialogOpen, setNewMapDialogOpen] = useState(false)

  const doNewMap = useCallback(() => {
    setNodes([])
    setEdges([])
    setMapTitle('Untitled')
    persistMapId(null)
    setIsPublished(false)
    historyRef.current      = [{ nodes: [], edges: [] }]
    historyIndexRef.current = 0
    setCanUndo(false)
    setCanRedo(false)
    setSelectedNode(null)
    setSelectedEdge(null)
    isDirtyRef.current = false
    setNewMapDialogOpen(false)
    navigate('/editor')
  }, [setNodes, setEdges, persistMapId, navigate])

  const onNewMap = useCallback(() => {
    if (isDirtyRef.current) {
      setNewMapDialogOpen(true)
    } else {
      doNewMap()
    }
  }, [doNewMap])

  // ── Pane context menu items ───────────────────────────────────────────────
  const paneMenuItems = paneMenu ? [
    { icon: '⚡', label: 'Add Event',     action: () => addNodeAtPosition('event',     paneMenu.flowPos) },
    { icon: '🎭', label: 'Add Character', action: () => addNodeAtPosition('character', paneMenu.flowPos) },
    { icon: '📝', label: 'Add Note',      action: () => addNodeAtPosition('note',      paneMenu.flowPos) },
    { icon: '▭',  label: 'Add Region',    action: () => addNodeAtPosition('region',    paneMenu.flowPos) },
    { type: 'divider' },
    {
      icon: '🎨',
      label: 'Background colour',
      action: () => { setTimeout(() => bgColorInputRef.current?.click(), 0) },
    },
  ] : []

  // ── Node context menu items ───────────────────────────────────────────────
  const nodeMenuItems = nodeMenu ? (() => {
    const sourceNode = nodesRef.current.find((n) => n.id === nodeMenu.nodeId)
    const isRegion = sourceNode?.type === 'region'
    return [
      ...(!isRegion ? [{
        icon: '📄',
        label: 'Edit details',
        action: () => { if (sourceNode) openDetailOverlay(sourceNode) },
      }] : []),
      {
        icon: '⧉',
        label: 'Duplicate',
        action: () => onNodeDuplicate(nodeMenu.nodeId),
      },
      ...(!isRegion ? [{
        icon: '→',
        label: 'Connect to…',
        action: () => { if (sourceNode) setConnectToSource(sourceNode) },
      }] : []),
      { type: 'divider' },
      {
        icon: '✕',
        label: 'Delete',
        danger: true,
        action: () => onNodeDelete(nodeMenu.nodeId),
      },
    ]
  })() : []

  // ── Publish ───────────────────────────────────────────────────────────────
  const onPublishToggle = useCallback(async () => {
    if (!mapId) return
    const next = !isPublished
    try {
      await api.publishMap(mapId, next)
      setIsPublished(next)
      addToast(next ? 'Map published' : 'Map unpublished', 'success')
    } catch (err) {
      addToast(`Could not update publish state: ${err.message}`, 'error')
    }
  }, [mapId, isPublished, addToast])

  // ── Right panel ───────────────────────────────────────────────────────────
  // View / Suggest → AnnotationPanel (read-only in View, interactive in Suggest)
  // Edit           → NodeEditor / EdgeEditor as before
  const isAnnotationMode = mode === MODES.VIEW || mode === MODES.SUGGEST
  const rightPanel = isAnnotationMode
    ? <AnnotationPanel
        mapId={mapId}
        nodeId={selectedNode?.id ?? null}
        mode={mode}
        user={user}
      />
    : selectedNode
    ? <NodeEditor
        node={selectedNode}
        onChange={onNodeDataChange}
        onDelete={onNodeDelete}
        onDuplicate={onNodeDuplicate}
        allNodes={nodes}
        readOnly={false}
      />
    : selectedEdge
    ? <EdgeEditor edge={selectedEdge} onChange={onEdgeChange} onDelete={onEdgeDelete} readOnly={false} />
    : null

  // Show nothing while the initial session check is in-flight.
  if (user === null) return null
  // Show login screen when unauthenticated.
  if (user === false) return <AuthModal />

  return (
    <div className="app">
      <Sidebar
        mapTitle={mapTitle}
        onTitleChange={setMapTitle}
        onSave={onSave}
        isSaving={isSaving}
        mapId={mapId}
        isPublished={isPublished}
        onPublishToggle={onPublishToggle}
        onExport={onExport}
        onLoad={onLoad}
        onOpenMyMaps={() => navigate('/maps')}
        onNewMap={onNewMap}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onAutoLayout={onAutoLayout}
        layoutDir={layoutDir}
        onLayoutDirChange={setLayoutDir}
        layoutNodeSep={layoutNodeSep}
        onLayoutNodeSepChange={setLayoutNodeSep}
        layoutRankSep={layoutRankSep}
        onLayoutRankSepChange={setLayoutRankSep}
        mode={mode}
        user={user}
        onSignOut={onSignOut}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className="canvas-wrapper"
        ref={reactFlowWrapper}
        style={{ '--canvas-bg': bgColor }}
      >
        <button
          className="hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          ☰
        </button>

        {isHydrating && (
          <div className="canvas-hydrating">
            <div className="canvas-hydrating__spinner" />
          </div>
        )}

        {/* Layer context wraps ReactFlow so all node components can read activeLayer */}
        <LayerContext.Provider value={activeLayer}>
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onPaneContextMenu={onPaneContextMenu}
            onNodeContextMenu={onNodeContextMenu}
            onNodeDoubleClick={onNodeDoubleClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setReactFlowInstance}
            deleteKeyCode="Delete"
            nodesDraggable={mode === MODES.EDIT}
            nodesConnectable={mode === MODES.EDIT}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#2e2b38" />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                if (n.data?.color) return n.data.color
                const map = { event: '#3a5a8a', character: '#6a3a6a', note: '#8a6a3a', region: '#404060' }
                return map[n.type] || '#444'
              }}
              maskColor="rgba(15,14,17,0.7)"
            />
          </ReactFlow>
        </LayerContext.Provider>

        <div className="canvas-title">{mapTitle}</div>

        <LayerIndicator activeLayer={activeLayer} onChange={setActiveLayer} />
        <ModeToggle mode={mode} onChange={setCurrentMode} />
      </div>

      <div className={`right-panel${rightPanel ? ' right-panel--open' : ''}`}>
        {rightPanel}
      </div>

      {/* Context menus */}
      {paneMenu && (
        <ContextMenu
          x={paneMenu.x}
          y={paneMenu.y}
          items={paneMenuItems}
          onClose={() => setPaneMenu(null)}
        />
      )}
      {nodeMenu && (
        <ContextMenu
          x={nodeMenu.x}
          y={nodeMenu.y}
          items={nodeMenuItems}
          onClose={() => setNodeMenu(null)}
        />
      )}

      {/* Node detail overlay */}
      {detailOverlayNode && (
        <NodeDetailOverlay
          key={detailOverlayNode.id}
          node={detailOverlayNode}
          onClose={() => setDetailOverlayNode(null)}
          onChange={(content) => onDetailContentChange(detailOverlayNode.id, content)}
          readOnly={mode !== MODES.EDIT}
        />
      )}

      {/* Unsaved changes dialog */}
      {newMapDialogOpen && (
        <div
          className="dialog-backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setNewMapDialogOpen(false) }}
        >
          <div className="dialog">
            <h3 className="dialog__title">Unsaved changes</h3>
            <p className="dialog__message">
              You have unsaved changes. What would you like to do?
            </p>
            <div className="dialog__actions">
              <button
                className="dialog__btn dialog__btn--accent"
                onClick={async () => { await onSave(); doNewMap() }}
              >
                Save
              </button>
              <button
                className="dialog__btn dialog__btn--ghost"
                onClick={doNewMap}
              >
                Don't Save
              </button>
              <button
                className="dialog__btn dialog__btn--ghost"
                onClick={() => setNewMapDialogOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect-to modal */}
      {connectToSource && (
        <ConnectToModal
          sourceNode={connectToSource}
          nodes={nodes}
          edges={edges}
          onConnect={onConnectFromModal}
          onClose={() => setConnectToSource(null)}
        />
      )}

      {/* Hidden colour picker for canvas background */}
      <input
        type="color"
        ref={bgColorInputRef}
        value={bgColor}
        onChange={(e) => setBgColor(e.target.value)}
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', left: -999, top: -999 }}
      />
    </div>
  )
}
