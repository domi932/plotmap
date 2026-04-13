# PlotMap — Project Handoff & AI Prompt
_A complete summary of the project as built so far, intended to onboard an AI assistant for further development. Updated after Short term A–E, the backend introduction (FastAPI + Supabase, cloud save/load, My Maps modal), Supabase Auth (email/password + Google OAuth, JWT validation, per-user map isolation), project restructure to `plotmap_project/`, `mapId` localStorage persistence, the publish flow, client-side routing with a public map viewer, the Landing page + My Maps full pages, the annotation system (Suggest mode), the V3 planning pass (bug fixes, omnidirectional handles, future community features), omnidirectional handles (Session 10), the V4 planning pass, Session 11 (remove Decision node, colour-as-background, shape selector), Session 12 (region node type), the V5 planning pass (production deployment, viewer annotations, polish, portal nodes, image attachments), Session 15 (production deployment: Vercel/Render config files, CORS + env-var audit, Procfile), Session 16 (viewer annotations: auth-aware AnnotationPanel in public MapViewer, node selection, sign-in prompt, mode toggle), Session 17 (production-readiness polish: character icon removal, skeleton loading states, Toast system, responsive mobile layout, meta tags + favicon, UX polish), and Session 18 (portal node type: cross-map linking)._

---

## 1. Project Vision

**PlotMap** is a collaborative web application for creating and sharing visual story/plot structure maps. Think of it as draw.io meets GitHub Issues, but specifically designed for narratives — stories, movies, books, historical events, etc.

The long-term product has two core modes:
- **Editor mode**: A node-graph editor where a user builds a plot map visually.
- **Viewer/Review mode**: A read-only view of a published map where other users can pin annotations, flag logical flaws, and suggest corrections.

---

## 2. Current State (Phase 18 — Portal node / cross-map linking)

A fully working **React + FastAPI application** has been built. The frontend runs via `npm run dev` (Vite dev server at localhost:5173). The backend runs via `python -m uvicorn main:app --reload` (FastAPI at localhost:8000) and persists maps to Supabase (PostgreSQL). Users must log in before using the app — every map is owned by its creator.

### What works right now:
- A **React Flow canvas** (using `@xyflow/react` v12) that fills the centre of the screen
- **Drag-and-drop** from the left sidebar onto the canvas to create new nodes
- **Keyboard shortcuts** — press **E**, **C**, or **N** (when no input/textarea/select/contenteditable is focused and mode is Edit) to instantly add an Event, Character, or Note node at the visible canvas centre
- **Five custom node types**:
  - `event` — a plot point or story beat (fields: title, description, time/chapter). Default shape: rectangle.
  - `character` — a person or entity (fields: name, description, role). Default shape: circle.
  - `note` — a free annotation (fields: title, content). Default shape: rectangle.
  - `region` — a decorative background grouping area (field: label/title). No handles, no connections. Resizable via `NodeResizer`. Semi-transparent fill, configurable colour, `zIndex: -1000` so other nodes render on top. Only renders at its own layer (`relLayer === 0`). Excluded from dagre auto-layout.
  - `portal` — a cross-map link gateway (fields: label, targetMapId, targetMapTitle). Teal colour (`--node-portal: #3a8a8a`), dashed border with glow. Full omnidirectional handles. In View mode (editor) and public viewer, clicking navigates to `/map/{targetMapId}`. In Edit mode, clicking selects normally. The NodeEditor shows a "Linked map" section with a "Link a map…" button (opens `MapLinkModal`), a paste-URL input, and a "Clear link" button.
- **Node colour as background**: `data.color` is applied as `backgroundColor` on the node. The border is auto-derived (30% darker shade via JS). Text colour auto-flips based on background luminance (light text on dark bg, dark text on light bg). When `data.color` is absent, CSS variable defaults (`--node-event`, `--node-character`, `--node-note`) supply the background.
- **Node shape selector**: `data.shape` controls the node shape. Supported values: `'rectangle'` (default), `'circle'`, `'diamond'`, `'hexagon'`, `'pill'`. A 5-button shape picker row appears in the NodeEditor below the colour swatches. All render modes (full, mini, ghost) respect the shape. Character nodes default to `'circle'`; Event and Note default to `'rectangle'`. Old saved nodes without `data.shape` render as `'rectangle'`.
- **Connecting nodes**: drag from any handle on any side of any node to any handle on any side of any other node. Connections are fully omnidirectional — each side has both a source and target handle co-located so any topology is possible.
- **Selecting nodes**: click a node to select it; the right panel opens for editing. Left-clicking empty canvas does **not** deselect or change the active layer.
- **Editing node data**: the right `NodeEditor` panel shows type-specific fields and updates the node live as you type
- **Deleting nodes**: via the Delete button in NodeEditor, or **Delete** key when a node is selected (also removes connected edges)
- **Duplicate node**: "Copy" button in NodeEditor creates an offset copy of the selected node
- **Node colour override**: colour swatch row in NodeEditor (8 presets + native colour picker + reset). Stored in `data.color`; applied as `backgroundColor` with auto-darkened `borderColor` and luminance-based text colour. MiniMap reflects custom colour too (reads `data.color` directly).
- **Selecting edges**: click an edge to open the `EdgeEditor` in the right panel
- **Edge labels**: free-text label field in EdgeEditor; rendered natively by React Flow, styled for the dark theme
- **Edge type / style**: Solid (default), Dashed (`strokeDasharray`), or Animated (React Flow animation); toggled via pill buttons in EdgeEditor. Stored as `data.edgeType` + corresponding `animated` / `style` props on the edge object.
- **Deleting edges**: via the Delete button in EdgeEditor, or Delete key when an edge is selected on canvas
- **Undo / Redo**: history stack in `App.jsx` captures snapshots before structural mutations (node add/delete/duplicate, edge connect/delete). Ctrl+Z undoes, Ctrl+Y / Ctrl+Shift+Z redoes. Buttons in the sidebar reflect enabled/disabled state.
- **Auto-layout**: "Auto-arrange nodes" button in the sidebar runs a dagre layout scoped to the currently visible layer window. Supports **direction** (L→R or T→B) and configurable **node gap** / **rank gap** set via controls in the sidebar. The action is undoable.
- **Canvas background colour**: stored in `localStorage` under `plotmap_bg_color`; right-click the canvas to change it. Persists across page reloads.
- **Map title**: editable text field in the sidebar; shown as a watermark on the canvas
- **Save to cloud**: the sidebar "Save" button calls `POST /maps` on first save (assigns a server UUID stored as `mapId` state) and `PUT /maps/{id}` on subsequent saves. A `…Saving` spinner is shown during the request. The button label changes to "↑ Save" once a `mapId` exists.
- **My Maps**: the sidebar "My Maps" button navigates to `/maps` (the full My Maps page). The old `MyMapsModal.jsx` component still exists in `components/` but is no longer used.
- **User authentication**: Supabase Auth with email/password and Google OAuth. A full-screen `AuthModal` is shown when no session is active. After login, `App.jsx` renders the editor. The user's email and a "Sign out" button are shown at the bottom of the sidebar.
- **JWT on all API calls**: `api.js` reads the current Supabase session before every request and injects `Authorization: Bearer <jwt>` automatically. The FastAPI backend validates the token on every `/maps` endpoint and returns 401 if missing or invalid.
- **Per-user map isolation**: every map carries an `owner_id` (the Supabase user ID). `GET /maps` only returns maps belonging to the caller; `GET`/`PUT /maps/{id}` return 403 if the caller does not own the map.
- **`mapId` persistence across reloads**: on first save the server-assigned UUID is written to `localStorage` under `plotmap_mapid_${user.id}`. On page reload (after auth resolves), that key is read back and `mapId` is restored automatically — subsequent Saves update the existing record instead of creating a new one. Immediately after restoring `mapId`, `GET /maps/{id}` is called to hydrate `mapTitle` and `isPublished` from the server; if the map no longer exists the stale key is cleared. The key is also cleared when importing from file or signing out. Keyed per-user so different accounts on the same browser don't interfere.
- **Publish / unpublish**: a **Publish** toggle button in the sidebar (visible only when a map has been saved to the server) calls `PATCH /maps/{id}/publish`. When published, an additional **Copy share link** button appears and copies `{window.location.origin}/map/{mapId}` to the clipboard. Published state is stored in `is_published` on the server and reflected in `isPublished` state in `App.jsx`. `GET /maps/public/{id}` returns a full `MapDetail` with no authentication required, but only if `is_published = true` — returns 404 otherwise (to avoid leaking private map IDs).
- **Client-side routing** (`react-router-dom` v7): `main.jsx` wraps the app in `<BrowserRouter>` with five routes: `/` → LandingPage, `/editor` → App (blank), `/editor/:mapId` → App (pre-loaded), `/maps` → MyMapsPage, `/map/:mapId` → MapViewer (public).
- **Public map viewer** (`src/pages/MapViewer.jsx`): fetches the map via `GET /maps/public/{mapId}` (no auth). Canvas is read-only (`nodesDraggable={false}`, `nodesConnectable={false}`) but nodes ARE selectable (`elementsSelectable={true}`). Clicking a node opens a right-side `AnnotationPanel`; clicking the canvas background closes it. Auth-aware: resolves Supabase session on mount and listens for `onAuthStateChange`. Mode logic: unauthenticated → view-only panel + "Sign in to suggest" prompt; logged-in non-owner → suggest mode by default with a header toggle to switch between View/Suggest; logged-in owner → view-only (backend enforces 403 on own-map annotation). The header shows a "View only" badge for owners/unauthenticated viewers and an active "Suggest/View" toggle button for non-owners. AuthModal opens as an overlay when the sign-in prompt is clicked; it closes automatically after login. `MapDetail` now includes `owner_id` so the viewer can determine ownership without a separate authenticated request. Double-clicking a node still opens `NodeDetailOverlay` in read-only mode. Shows a "Map not found" screen for missing or unpublished maps.
- **Landing page** (`src/pages/LandingPage.jsx`): public home page. Shows a hero section with tagline and "Start a new map" CTA (prompts login if unauthenticated, navigates to `/editor` if logged in). A horizontal strip of the user's 4 most-recent maps appears when logged in. A full grid of published maps is fetched from `GET /maps/published` (no auth). Header shows Sign in button (unauthenticated) or My Maps link + email + Sign out (authenticated). After login the auth state change redirects to `/editor`.
- **My Maps page** (`src/pages/MyMapsPage.jsx`): authenticated full-page tile grid. Fetches `GET /maps` for the logged-in user. Each tile shows title, last-updated date, and three buttons: Open (→ `/editor/:mapId`), Publish/Unpublish (calls `PATCH /maps/{id}/publish`), Delete (confirm + `DELETE /maps/{id}`). A "New map" button navigates to `/editor`. Redirects to `/` if unauthenticated.
- **`GET /maps/published`** (backend): public endpoint — no auth, returns the 20 most recently updated published maps (id, title, owner\_email, is\_published, timestamps).
- **`DELETE /maps/{id}`** (backend): authenticated + ownership check; returns 204.
- **`owner_email`** stored on every map at create time (from the JWT). Shown in published map tiles on the landing page.
- **Export to file**: the previous "Save to file" behaviour, now a small secondary link below the main save button. Downloads the full graph as a `.json` file.
- **Import from file**: reads a previously exported `.json` file back into the canvas; resets undo history, clears selection, and resets `mapId` to null (imported maps have no server record until explicitly saved).
- **MiniMap**, **zoom/pan controls**, and **dot-grid background** are all active
- A **demo map** ("Hero's Journey") is pre-loaded on first launch so the canvas is not empty

#### Context menus
- **Canvas right-click** opens a menu at the cursor with: Add Event, Add Character, Add Note, Add Region (all at click position, on the active layer), and Change background colour. Suppressed in View/Suggest mode.
- **Node right-click** opens a menu with: Edit details (not shown for regions), Duplicate, Connect to… (not shown for regions), Delete. Suppressed in View/Suggest mode.
- **Connect to… modal** (`ConnectToModal.jsx`): a centred searchable overlay listing all visible non-region nodes (sorted alphabetically). Type badge shown beside each title. Items where an edge already exists in either direction are disabled. Selecting a node creates an edge and pushes to undo history. Escape or backdrop click closes it.

#### Node detail overlay (TipTap)
- **Double-clicking a node** (or choosing "Edit details" from the context menu) opens `NodeDetailOverlay.jsx` — a modal card (~65vw × 65vh) over the canvas.
- The editor uses **TipTap** (`@tiptap/react` + `@tiptap/starter-kit` v3) and supports bold, italic, strikethrough, H1/H2/H3, bullet list, ordered list, blockquote, code block, horizontal rule, undo/redo within the editor.
- Content is stored as `data.detailContent` — a `JSON.stringify`'d TipTap document. Restored with `JSON.parse` on open.
- When `data.detailContent` has any non-whitespace text, the node shows a `···` indicator between the title and description on the canvas.
- Close with Escape or clicking the backdrop.
- In **View/Suggest mode**, the overlay opens in read-only state: TipTap `editable` is set to `false` and the toolbar is hidden.
- `NodeDetailOverlay` is wrapped in an `OverlayErrorBoundary` (class component inside `NodeDetailOverlay.jsx`). If TipTap crashes on mount (e.g., corrupt `detailContent`), the boundary catches the error and shows a "Could not load editor" fallback card instead of blanking the page.
- The `readOnly` prop is correctly passed as `mode !== MODES.EDIT` from App.jsx (previously was an undefined variable causing a blank-page crash).

#### Right panel
- In **Edit mode** with no node or edge selected, `rightPanel` is `null` — the right panel column is not rendered, letting the canvas take full width via flex.
- When a node is selected: `NodeEditor` is shown in the right column (240 px fixed width, `node-editor` CSS class).
- When an edge is selected: `EdgeEditor` is shown.
- In **View/Suggest mode**: `AnnotationPanel` is always shown regardless of selection (its own "Select a node" empty state handles the no-selection case).

#### Unsaved changes tracking
- `isDirtyRef` (a `useRef` in `App.jsx`) tracks whether there are unsaved changes. It is **not** React state — updates do not trigger re-renders.
- Set to `true` in: `pushHistory()` (covers add/delete/duplicate node, connect/delete edge, auto-layout), `onNodeDataChange()` (covers field edits), and `handleNodesChange()` when a node drag completes (`change.type === 'position' && change.dragging === false`) or when a node is resized (`change.type === 'dimensions'`, triggered by `NodeResizer`).
- Cleared to `false` in: `applyLoadedGraph()` (load from server or file) and `onSave()` after a successful save.

#### New Map button
- **"✦ New Map"** button in the Sidebar bottom section (above "My Maps").
- Calls `onNewMap()` in `App.jsx`. If `isDirtyRef.current` is false, immediately calls `doNewMap()`. If dirty, opens a three-button dialog (`newMapDialogOpen` state):
  - **Save** → awaits `onSave()` then calls `doNewMap()`
  - **Don't Save** → calls `doNewMap()` directly
  - **Cancel** → closes dialog, does nothing
- `doNewMap()` resets the editor to a blank state: `nodes=[]`, `edges=[]`, `mapTitle='Untitled'`, clears `mapId` via `persistMapId(null)` (which also removes the localStorage key), resets history, clears `isDirty`, closes dialog, and navigates to `/editor`.
- Dialog CSS is defined in `App.css` (`.dialog-backdrop`, `.dialog`, `.dialog__title`, `.dialog__message`, `.dialog__actions`, `.dialog__btn`, `.dialog__btn--accent`, `.dialog__btn--ghost`).

#### 5-layer dimension system
- Every node carries `data.layer` (integer 0–4, default 0) and `data.parentNodeId` (string | null).
- **`activeLayer`** is derived from the selected node: selecting a node sets `activeLayer = node.data.layer`. Deselecting does **not** reset the layer — the view stays where it is. Only manually selecting the LayerIndicator dropdown or selecting a node on a different layer changes it.
- **`LayerIndicator`** HUD (top-left of canvas): shows current layer name and a dropdown to switch layers manually. An `↑` button steps up one layer when `activeLayer > 0`.
- **Visibility window**: ReactFlow only receives nodes in layers `[activeLayer, activeLayer+2]`, plus any layer `activeLayer-1` nodes that are **connected** (via edge or `parentNodeId`) to a visible node.
- **Three render modes** (resolved in each node component via `relLayer = data.layer − activeLayer`):
  - `relLayer === 0` — full node (normal size, all fields)
  - `relLayer === 1` — mini pill (compact, ~36px tall, title only)
  - `relLayer === 2` — micro dot (16px circle, colour-coded, no text)
  - `relLayer === -1` — ghost (parent-context node: dashed border, 38% opacity, `↑ Type · LN` badge). Clicking a ghost node selects it and navigates to its layer.
- **NodeEditor** has a Layer dropdown (0–4) and a Parent node dropdown (lists Layer N-1 nodes; shown only when layer > 0). Changing the Layer field live-updates `activeLayer`.
- New nodes created by any method (drag, keyboard shortcut, right-click menu) are assigned `layer: activeLayerRef.current`.
- Auto-layout operates only on the visible layer window and merges positions back into the full nodes array.

#### Omnidirectional handles
- All three node types (`event`, `character`, `note`) have handles on **all four sides** in every render mode. Each side carries **two co-located handles** — one `target` and one `source` — so any node can both send and receive connections from any direction.
- **Handle ID scheme** (consistent across all three types):
  - `type="target" id="top-target"`    + `type="source" id="top-source"`    — `Position.Top`
  - `type="target" id="left-target"`   + `type="source" id="left-source"`   — `Position.Left`
  - `type="target" id="right-target"`  + `type="source" id="right-source"`  — `Position.Right`
  - `type="target" id="bottom-target"` + `type="source" id="bottom-source"` — `Position.Bottom`
- **Render order**: target is rendered first (DOM/CSS lower, `opacity: 0`), source is rendered second (DOM/CSS higher, visible). The source handle sits on top and receives pointer events for drag initiation. React Flow detects the target handle by bounds-check (not pointer events) when a drag is dropped nearby, so the transparent target still works correctly.
- **Micro dots**: all eight handles carry `style={{ opacity: 0 }}` so the dot stays clean while remaining connectable.
- **Backward compatibility** — `applyLoadedGraph` in `App.jsx` migrates older saves in two passes:
  1. **No handle IDs** (very old saves): `targetHandle` → `'left-target'`, `sourceHandle` → `'right-source'`
  2. **Old single-role IDs** (`'top'`, `'left'`, `'right'`, `'bottom'`): remapped to `'top-target'`/`'left-target'` (targets) and `'right-source'`/`'bottom-source'` (sources).
- **`INITIAL_EDGES`** in `App.jsx` carries explicit new-scheme handle IDs on all demo edges (`right-source` / `left-target`).
- **NodeBase.css** padding increased from `12px 16px` to `16px` (all sides) on `.node` and from `6px 14px` to `8px 14px` on `.node--mini` so handle dots have clearance from node content.

#### View / Suggest / Edit mode toggle
- **`ModeToggle`** HUD (top-right of canvas): a pill-group toggle with three states.
  - 🟢 **View** — Read-only canvas. Sidebar hides drag palette, auto-layout, and undo/redo sections. Right panel shows `AnnotationPanel` in read-only mode (no submit form, no upvote buttons). Context menus are suppressed. All mutation keyboard shortcuts (E/C/N, Ctrl+Z/Y, Delete) are blocked. Double-clicking a node opens the detail overlay in read-only mode.
  - 🟠 **Suggest** — Annotation mode. Canvas interaction is identical to View (no editing). Right panel shows `AnnotationPanel` with the full submit form (type selector + textarea + Submit) and clickable upvote buttons. The ModeToggle no longer shows a disabled/greyed style on the Suggest button.
  - 🔵 **Edit** — Full editor (default). Right panel shows `NodeEditor` / `EdgeEditor` as before.
- `mode` state lives in `App.jsx` alongside a `modeRef` kept in sync for use in callbacks. An `isEditing()` helper (`modeRef.current === 'edit'`) is called at the top of every mutation handler.
- Mode is **not** persisted to localStorage — the app always starts in Edit mode.

#### Annotation system
- **`AnnotationPanel.jsx`** replaces `NodeEditor`/`EdgeEditor` in the right panel whenever mode is View or Suggest. It receives `mapId`, `nodeId`, `mode`, and `user` as props.
- Selecting a node fetches `GET /maps/{id}/annotations` and filters client-side by `node_id`, sorted by upvotes desc. Each annotation shows: coloured type badge (Flaw / Suggestion / Question), truncated author name (local part of email), content text, and upvote count.
- In **Suggest** mode (non-owner, logged-in): **▲ N** upvote button calls `POST /annotations/{id}/upvote`; a form at the bottom has a type-selector pill row + textarea + Submit button which calls `POST /maps/{id}/annotations`.
- In **View** mode: upvote buttons and submit form are hidden.
- Empty state when no node is selected: "Select a node to see annotations."
- If the map has not yet been saved (`mapId` is null), a warning message replaces the form.
- **Backend annotation endpoints**: `POST /maps/{id}/annotations` (auth required; 403 if caller owns the map); `GET /maps/{id}/annotations` (public, no auth, sorted by upvotes desc); `POST /annotations/{id}/upvote` (auth required, increments upvotes by 1).
- **`annotations` table** in Supabase: `id` (uuid pk), `map_id` (FK → maps, on delete cascade), `node_id` (text nullable), `edge_id` (text nullable), `author_id`, `author_email`, `content`, `annotation_type` (check: flaw/suggestion/question), `upvotes` (default 0), `created_at`.

#### Session 17 additions
- **Character node icon removed** — The `🎭` emoji prefix was removed from the role field in both the ghost and full render modes of `CharacterNode.jsx`. The circle shape already distinguishes characters visually; the emoji was distracting at small sizes.
- **Toast system** (`components/Toast.jsx` + `Toast.css`) — A `ToastProvider` wraps all routes in `main.jsx`. `useToast()` returns an `addToast(message, type)` callback (`type` = `'success'` | `'error'`). Toasts appear bottom-right, auto-dismiss after 4 s, slide up with CSS animation. Used for: save success/failure (`App.jsx`), publish/unpublish success/failure (`App.jsx`), load failure (`App.jsx`), file import error (`App.jsx`), annotation submit success/failure (`AnnotationPanel.jsx`), publish/delete success/failure (`MyMapsPage.jsx`).
- **Loading skeletons** — `LandingPage.jsx`: shimmer skeleton tiles (recent strip) and skeleton cards (published grid) while loading. `MyMapsPage.jsx`: shimmer skeleton cards while loading. `MapViewer.jsx`: spinner (`viewer__spinner`) in place of a plain text "loading" state. `App.jsx`: `isHydrating` state shows a translucent spinner overlay on the canvas while `mapId` is being hydrated from the server on page load.
- **Meta tags + favicon** — `index.html` now includes `<meta name="description">`, OpenGraph tags (`og:type`, `og:title`, `og:description`, `og:image`), Twitter card tags, and an SVG favicon (`public/favicon.svg`). The favicon uses a dark `#0f0e11` rounded rect background with a gold `#c8a96e` "P" lettermark.
- **Mobile responsive layout**:
  - Sidebar: collapses to `transform: translateX(-100%)` on `< 768px`. A hamburger button (`☰`, class `hamburger`) floats top-left of the canvas on mobile, opening the sidebar as a fixed overlay. A backdrop div (`.sidebar-backdrop`) closes it on tap-outside. A close (`✕`) button appears in the top-right of the sidebar on mobile.
  - Right panel: a `.right-panel` wrapper div is added in `App.jsx`. On desktop it uses `display: contents` so children (NodeEditor/AnnotationPanel) participate directly in the flex layout. On mobile (`< 768px`) it becomes a `position: fixed` bottom sheet (50vh height) that slides up when a node is selected (`.right-panel--open` class).
  - Touch targets: sidebar buttons and node tiles get `min-height: 44px` on mobile.
  - LandingPage, MyMapsPage, MapViewer all have `@media (max-width: 767px)` sections with tighter padding, stacking grids, and hidden email addresses.
- **UX polish** — "Copy share link" button in the sidebar shows "✓ Copied!" for 2 s after copying (replaces old `alert()`). All sidebar buttons and drag tiles have `title` tooltip attributes. `alert()` calls throughout the app have been replaced with `addToast()`.

### What does NOT exist yet:
- No image attachments on nodes
- No real-time collaboration
- No editorial rights / multi-user roles per map
- No ownership transfer

---

## 3. Tech Stack

### Frontend (built)
| Technology | Version | Role |
|---|---|---|
| React | 18.3.1 | UI framework |
| @xyflow/react (React Flow) | 12.3.6 | Node-graph canvas engine |
| @dagrejs/dagre | 3.0.0 | Auto-layout graph algorithm |
| @tiptap/react | 3.22.1 | Rich text editor (node detail overlay) |
| @tiptap/starter-kit | 3.22.1 | TipTap extension bundle |
| @supabase/supabase-js | ≥2.0 | Supabase client (auth session, OAuth) |
| react-router-dom | 7.x | Client-side routing (5 routes: landing, editor, my maps, public viewer) |
| Vite | 6.2.2 | Dev server & build tool |
| Plain CSS with CSS variables | — | Styling / design system |

**No** TypeScript, **no** state management library (Zustand/Redux) yet — state lives in `App.jsx` via React's `useState`/`useCallback`/`useRef`/`useMemo` hooks.

### Backend (built)
| Technology | Version | Role |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | ≥0.115 | REST API framework |
| uvicorn | ≥0.34 | ASGI server |
| supabase-py | ≥2.0 | Supabase client (DB + JWT validation) |
| python-dotenv | ≥1.0 | Environment variable loading |
| Supabase (PostgreSQL) | — | Hosted database; maps stored as JSONB |

### Planned additions (not built)
| Technology | Role |
|---|---|
| Alembic | Database migrations |
| Redis | Caching, sessions |
| NetworkX (Python) | Graph analysis / plot-hole detection |
| Vercel (frontend) + Fly.io or Render (backend) | Deployment |

---

## 4. File Structure

```
Data/2026/plotmap_project/
├── backend/                     — Python FastAPI backend
│   ├── main.py                  — FastAPI app + all endpoints + CORS setup
│   ├── supabase_client.py       — Singleton supabase-py client (uses SUPABASE_SERVICE_ROLE_KEY)
│   ├── auth.py                  — get_current_user() FastAPI dependency: validates JWT, returns AuthUser(id, email) dataclass
│   ├── schemas.py               — Pydantic schemas: AnnotationCreate, Annotation, MapCreate, MapUpdate, MapPublish, MapSummary, MapDetail (MapDetail includes owner_id)
│   ├── requirements.txt         — Python dependencies
│   ├── render.yaml              — Render.com service definition (Python web, uvicorn start, 3 env var slots)
│   ├── Procfile                 — Heroku-compatible start command: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
│   ├── .env.example             — Template: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_ORIGIN
│   └── README.md                — Setup instructions (venv, Supabase table SQL, uvicorn)
└── plotmap/                     — React frontend (run from here)
    ├── index.html               — HTML entry point, loads Google Fonts; includes meta description, OG tags, Twitter card, SVG favicon link
    ├── package.json             — Dependencies: react, @xyflow/react, @dagrejs/dagre, @tiptap/*, @supabase/supabase-js, vite
    ├── vite.config.js           — Vite config with React plugin
    ├── vercel.json              — SPA rewrite rule: all paths → index.html (required for client-side routing on Vercel)
    ├── .env.example             — Template: VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
    ├── public/
    │   └── favicon.svg          — SVG favicon: dark rounded rect background, gold "P" lettermark
    └── src/
        ├── main.jsx             — ReactDOM.createRoot; BrowserRouter wrapped in ToastProvider + 5-route tree
        ├── supabase.js          — Singleton @supabase/supabase-js client (uses VITE_ env vars)
        ├── api.js               — Thin fetch wrapper: injects Bearer JWT; createMap, updateMap, listMaps, getMap, publishMap, deleteMap, getPublicMap, getPublishedMaps, getAnnotations, createAnnotation, upvoteAnnotation
        ├── App.jsx              — Root component: all state, canvas, event handlers
        ├── App.css              — Layout: 3-column flex (sidebar | canvas | editor)
        ├── index.css            — Global CSS variables (colours, fonts) + React Flow overrides
        ├── LayerContext.js      — React context providing activeLayer to all node components
        ├── nodes/
        │   ├── EventNode.jsx    — Event node: ghost / mini / micro / full render modes
        │   ├── CharacterNode.jsx — Character node: same 4 modes (default shape: circle)
        │   ├── NoteNode.jsx     — Note node: same 4 modes
        │   ├── RegionNode.jsx   — Region node: background grouping rectangle with NodeResizer; only renders at relLayer===0
        │   ├── PortalNode.jsx   — Portal node: cross-map link; teal dashed glow border; navigates on click in View/viewer
        │   ├── RegionNode.css   — Region node styles (.region, .region--selected, .region__label)
        │   ├── NodeBase.css     — Shared node styles incl. .node--ghost, .node--mini, .node--micro, shape classes
        │   └── nodeUtils.js     — hasDetailContent(), getNodeStyle() (colour-as-background + text flip) helpers
        └── components/
            ├── Toast.jsx        — ToastProvider (wraps app in main.jsx) + useToast() hook; auto-dismiss 4s toasts
            ├── Toast.css        — Toast styles: fixed bottom-right, slide-up animation, --success (green) / --error (red)
            ├── Sidebar.jsx      — Left panel: branding, title, drag palette, layout, undo/redo, save/export; isOpen/onClose props for mobile drawer; copiedLink state for share button
            ├── Sidebar.css      — Sidebar styles incl. mobile overlay (position:fixed, transform), close button, .sidebar--open
            ├── NodeEditor.jsx   — Right panel: type fields, colour picker, shape picker, Layer dropdown, Parent node dropdown
            ├── NodeEditor.css   — NodeEditor styles
            ├── EdgeEditor.jsx   — Right panel (edge selected): label, style, delete
            ├── EdgeEditor.css   — EdgeEditor styles
            ├── ContextMenu.jsx  — Reusable positioned context menu (viewport-edge aware)
            ├── ContextMenu.css  — Context menu styles
            ├── ConnectToModal.jsx — Searchable node-picker modal for "Connect to…"; TYPE_COLORS includes portal
            ├── ConnectToModal.css — ConnectToModal styles
            ├── MapLinkModal.jsx  — Modal for linking a map to a portal; fetches GET /maps + GET /maps/published; dedupes by id
            ├── MapLinkModal.css  — MapLinkModal styles
            ├── NodeDetailOverlay.jsx — TipTap rich-text overlay (double-click to open)
            ├── NodeDetailOverlay.css — Overlay styles incl. full ProseMirror dark-theme overrides
            ├── LayerIndicator.jsx — Layer HUD (absolute top-left of canvas)
            ├── LayerIndicator.css — LayerIndicator styles
            ├── ModeToggle.jsx   — View/Suggest/Edit toggle HUD (absolute top-right of canvas); Suggest is now fully active
            ├── ModeToggle.css   — ModeToggle styles
            ├── AnnotationPanel.jsx — Right panel in View/Suggest mode: annotation list + submit form
            ├── AnnotationPanel.css — AnnotationPanel styles
            ├── MyMapsModal.jsx  — (unused) Centred modal replaced by the full MyMapsPage; kept for reference
            ├── MyMapsModal.css  — (unused) Styles for the above
            ├── AuthModal.jsx    — Full-screen login/register form (email+password + Google OAuth); accepts optional `onClose` prop (clicking backdrop calls it); used as overlay on LandingPage and MapViewer
            └── AuthModal.css    — AuthModal styles
        └── pages/
            ├── LandingPage.jsx  — Public home: hero, recent-user strip, published-maps grid, auth overlay
            ├── LandingPage.css  — Landing page styles
            ├── MyMapsPage.jsx   — Authenticated tile grid: Open / Publish / Delete per map, New map button
            ├── MyMapsPage.css   — My Maps page styles
            ├── MapViewer.jsx    — Public viewer: auth-aware annotation panel, node selection, sign-in prompt, mode toggle; nodes selectable but not draggable/connectable
            └── MapViewer.css    — Viewer layout: header + flex-row body (canvas + 260px annotation panel column) + state screens
```

---

## 5. Key Code Patterns to Know

### Node data schema
Regular nodes (event / character / note):
```json
{
  "id": "101",
  "type": "event",
  "position": { "x": 340, "y": 80 },
  "data": {
    "title": "The Call",
    "description": "An urgent message arrives.",
    "time": "Chapter 1",
    "color": "#c0524a",
    "shape": "diamond",
    "layer": 1,
    "parentNodeId": "5",
    "detailContent": "{\"type\":\"doc\",\"content\":[...]}"
  }
}
```
- `color` — optional custom background colour override. Applied as `backgroundColor`; border is auto-darkened 30% via `getNodeStyle()` in `nodeUtils.js`; text colour flips dark/light based on luminance.
- `shape` — optional node shape. One of `'rectangle'` | `'circle'` | `'diamond'` | `'hexagon'` | `'pill'`. Defaults to `'rectangle'` (existing saves without `shape` render as rectangle). Character nodes default to `'circle'` when newly created.
- `layer` — integer 0–4, defaults to 0 if absent (old saves without `layer` still load correctly)
- `parentNodeId` — string ID of the owning node on `layer - 1`, or null
- `detailContent` — `JSON.stringify`'d TipTap document; absent or null means no rich content

Portal nodes:
```json
{
  "id": "p1",
  "type": "portal",
  "position": { "x": 500, "y": 200 },
  "data": {
    "label": "Continue in The Two Towers",
    "targetMapId": "abc-123-def-456",
    "targetMapTitle": "The Two Towers",
    "color": null,
    "shape": "rectangle",
    "layer": 0,
    "parentNodeId": null
  }
}
```
- `label` — optional custom display text. When blank, `targetMapTitle` is shown as the node title.
- `targetMapId` — UUID of the destination map. When set, clicking the node in View mode or the public viewer navigates to `/map/{targetMapId}`.
- `targetMapTitle` — cached title of the destination map (stored at link time so the node renders correctly offline / without an extra fetch).
- When `targetMapId` is empty, the node renders with a "⚠ Not linked" indicator.
- Portals participate in dagre auto-layout, omnidirectional handles, shape selector, colour override, and the Connect-to modal.
- Portals do **not** have `title`, `description`, or `time` fields.

Region nodes differ in structure:
```json
{
  "id": "200",
  "type": "region",
  "position": { "x": 60, "y": 60 },
  "style": { "width": 400, "height": 300 },
  "zIndex": -1000,
  "data": {
    "title": "Act I",
    "color": "#3a5a8a",
    "layer": 0
  }
}
```
- `style.width` / `style.height` — set on the node object directly (not inside `data`); managed by React Flow's `NodeResizer` via `'dimensions'` change events.
- `zIndex: -1000` — set at the node root level so all other nodes render on top.
- No `shape`, `description`, `parentNodeId`, or `detailContent` fields.
- `color` applies via `hexToRgba(color, 0.15)` for fill and `hexToRgba(color, 0.45)` for border (defined locally in `RegionNode.jsx`).
- Regions only render when `relLayer === 0` — they are invisible in mini/micro/ghost contexts.

### Edge data schema
```json
{
  "id": "e1-2",
  "source": "1",
  "target": "2",
  "label": "causes",
  "animated": false,
  "style": { "strokeDasharray": "6 3" },
  "data": { "edgeType": "dashed" }
}
```
`edgeType` is one of `"solid"` | `"dashed"` | `"animated"`. Edges can connect nodes on any layer combination with no restriction.

### Backend API
The backend lives in `backend/` and runs separately from the frontend. Start it with `uvicorn main:app --reload` from the `backend/` directory.

**Endpoints:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | None | Liveness check |
| `POST` | `/maps` | Bearer | Create map → returns `MapSummary` (201) |
| `GET` | `/maps` | Bearer | List caller's maps (no `graph_data`) → `MapSummary[]` |
| `GET` | `/maps/{id}` | Bearer | Load map with full `graph_data` → `MapDetail` |
| `PUT` | `/maps/{id}` | Bearer | Replace title + graph_data → `MapDetail` |
| `PATCH` | `/maps/{id}/publish` | Bearer | Set `is_published` → `MapSummary`; 403 if not owner |
| `DELETE` | `/maps/{id}` | Bearer | Delete map; 204; 403 if not owner |
| `GET` | `/maps/public/{id}` | None | Load published map → `MapDetail`; 404 if private/missing |
| `GET` | `/maps/published` | None | Top 20 published maps by updated\_at → `MapSummary[]` |
| `POST` | `/maps/{id}/annotations` | Bearer | Create annotation; 403 if caller owns the map → `Annotation` (201) |
| `GET` | `/maps/{id}/annotations` | None | All annotations for a map, sorted by upvotes desc → `Annotation[]` |
| `POST` | `/annotations/{id}/upvote` | Bearer | Increment upvotes by 1 → `Annotation` |

**`graph_data` format** stored in the JSONB column — just nodes and edges (title is a separate column):
```json
{ "nodes": [...], "edges": [...] }
```

All `/maps` endpoints require `Authorization: Bearer <supabase-jwt>`. The backend validates the JWT by calling `supabase.auth.get_user(token)` and returns 401 if missing/invalid, 403 if the caller doesn't own the requested map.

**Frontend API client** is `src/api.js` — a thin `fetch` wrapper. Before every call it reads `supabase.auth.getSession()` and injects the `Authorization` header automatically. The backend URL is configured via `VITE_API_URL` in `plotmap/.env.local` (defaults to `http://localhost:8000`).

### Save/Load format
**Server save** (`POST`/`PUT /maps`): `graph_data` = `{ nodes, edges }` only. `title` is sent as a separate field. The server assigns a UUID returned as `id` in the response.

**File export** (secondary "Export to file" button): the original format is preserved for interoperability:
```json
{
  "title": "Hero's Journey",
  "nodes": [ ...array of all node objects across all layers... ],
  "edges": [ ...array of edge objects... ]
}
```
On import, `mapId` is reset to null — the imported map has no server record until explicitly saved.

### Auto-layout (dagre)
`applyDagreLayout(nodes, edges, { direction, nodeSep, rankSep })` is a pure function. `onAutoLayout` in `App.jsx` first filters to only the nodes/edges currently visible (the active layer window) **and excludes region nodes** (which are much larger than regular nodes and would distort the layout), runs dagre on that subset, then merges the updated positions back into the full nodes array so hidden nodes keep their positions. The action is undoable.

### Layer system
- `activeLayer` — `useState(0)` in `App.jsx`, with an `activeLayerRef` kept in sync for use in callbacks.
- A `useEffect` watching `selectedNode?.id` and `selectedNode?.data?.layer` calls `setActiveLayer(node.layer)` whenever a node is selected. It does **not** reset to 0 on deselect — the view stays put.
- `visibleNodes` / `visibleEdges` are computed in a `useMemo`. The primary window is layers `[activeLayer, activeLayer+2]`. A ghost set is added: layer `activeLayer-1` nodes that share an edge with a primary node or are referenced as `parentNodeId`.
- `LayerContext` (React context) wraps `<ReactFlow>` so every node component can call `useActiveLayer()` to get the current `activeLayer` without prop drilling. Node components compute `relLayer = (data.layer ?? 0) - activeLayer` and branch into ghost / micro / mini / full rendering.
- The `LayerIndicator` component (absolute-positioned HUD, top-left of canvas) shows the current layer name and a `<select>` for manual override. An `↑` button appears when `activeLayer > 0`.

### Node render modes
| `relLayer` | Render | Size | Content |
|---|---|---|---|
| -1 | Ghost (parent context) | Full size | All fields, dashed border, 38% opacity; tooltip says "click to navigate" |
| 0 | Full | 160–240px | Badge, title, `···` hint, description, meta |
| 1 | Mini pill | ~36px tall | Title only |
| 2 | Micro dot | 16px | Colour only, no text |

Ghost nodes are still clickable — selecting one navigates up to that layer.

### Context menu system
`ContextMenu.jsx` is a generic positioned component. It takes `{ x, y, items, onClose }`. Items are `{ icon, label, action, danger?, disabled?, type: 'divider' }`. It adjusts its position to stay within the viewport. Two separate menu states live in `App.jsx`: `paneMenu` (right-click canvas) and `nodeMenu` (right-click node).

### Detail overlay
`NodeDetailOverlay.jsx` receives `{ node, onClose, onChange }`. It mounts a TipTap editor initialised from `node.data.detailContent` (parsed from JSON). A `onChangeRef` ref ensures the TipTap `onUpdate` closure always calls the latest `onChange` prop. Changes are persisted to `data.detailContent` live as the user types (same pattern as NodeEditor fields — not undoable). The overlay is closed by Escape or clicking the backdrop.

### Mode system
`mode` state in `App.jsx` is one of `'view'` | `'suggest'` | `'edit'` (exported as `MODES` constants from `ModeToggle.jsx`). A parallel `modeRef` is kept in sync via a `setCurrentMode` wrapper so all `useCallback` handlers can read the current mode without stale closures.

An `isEditing()` helper (`() => modeRef.current === 'edit'`) is called at the **top of every mutation handler** in `App.jsx`:
- `onConnect`, `onConnectFromModal`
- `addNodeAtPosition`, `onDrop`
- `handleNodesChange`, `handleEdgesChange` (blocks React Flow's own delete key path)
- `onNodeDataChange`, `onNodeDelete`, `onNodeDuplicate`
- `onEdgeChange`, `onEdgeDelete`
- `onAutoLayout`
- `onPaneContextMenu`, `onNodeContextMenu`
- Keyboard shortcut `useEffect` (E/C/N, Ctrl+Z/Y)

The mode is also passed as props to all UI that changes appearance in non-edit states:
- `Sidebar` — receives `mode`; hides "Drag to add", "Auto-layout", and "History" sections when `mode !== 'edit'`
- `NodeEditor` — receives `readOnly`; hides Copy/Delete/colour picker, disables Layer/Parent selects and text inputs
- `EdgeEditor` — receives `readOnly`; hides Delete, disables style buttons and label input
- `NodeDetailOverlay` — receives `readOnly`; sets TipTap `editable: false`, hides toolbar

Mode is **not** persisted to `localStorage` — the app always starts in Edit mode.

### Keyboard shortcuts
Two `useEffect` handlers in `App.jsx`. E/C/N: fires when mode is `'edit'`, no input/contenteditable focused, no modifier keys held. Ctrl+Z/Y/A: fires when mode is `'edit'`, Ctrl/Meta held; Ctrl+A additionally checks for focused inputs before acting.

| Key | Action |
|---|---|
| E | Add Event node at canvas centre (on `activeLayer`) |
| C | Add Character node at canvas centre (on `activeLayer`) |
| N | Add Note node at canvas centre (on `activeLayer`) |
| P | Add Portal node at canvas centre (on `activeLayer`) |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Ctrl+A | Select all nodes in the current layer window (visible nodes only) |
| Delete | Delete selected node or edge |

All shortcuts are suppressed in View/Suggest mode via the `isEditing()` check at the top of the handler. The `contenteditable` check is `document.activeElement?.isContentEditable` and catches TipTap (which uses a `<div contenteditable="true">`) as well as any other rich text editor.

### Undo/Redo implementation
- `historyRef` (useRef): array of `{ nodes, edges }` snapshots
- `historyIndexRef` (useRef): current position in the array
- `nodesRef` / `edgesRef` (useRef): kept in sync with state via `useEffect`; read synchronously in `pushHistory()` to avoid stale closures
- `pushHistory()` is called before every structural mutation (add/delete/duplicate node, connect/delete edge, auto-layout)
- React Flow's own `onNodesChange` / `onEdgesChange` are wrapped to also push history when a `remove` change type is detected
- Loading a file resets the history stack to a single entry
- Rich text edits (`detailContent`) and field edits (title, description, etc.) are **not** undoable

### Right panel logic
`App.jsx` computes `rightPanel` and renders it as a flex child of `.app`:
```jsx
const rightPanel = isAnnotationMode
  ? <AnnotationPanel mapId={mapId} nodeId={selectedNode?.id ?? null} mode={mode} user={user} />
  : selectedNode
  ? <NodeEditor node={selectedNode} onChange={...} onDelete={...} onDuplicate={...} allNodes={nodes} />
  : selectedEdge
  ? <EdgeEditor edge={selectedEdge} onChange={...} onDelete={...} />
  : null   // ← no selection in Edit mode → right column absent, canvas fills width
```
`allNodes` is passed so `NodeEditor` can populate the Parent node dropdown. When `rightPanel` is `null`, the `canvas-wrapper` div (which has `flex: 1`) expands to fill the full remaining width.

### State management
All state lives in `App.jsx`:
- `nodes`, `setNodes` — React Flow node array (all layers)
- `edges`, `setEdges` — React Flow edge array
- `selectedNode` — currently selected node object (or null)
- `selectedEdge` — currently selected edge object (or null)
- `mapTitle` — string title of the current map
- `user` — Supabase user object (logged-in), `false` (unauthenticated), or `null` (session check in-flight). When `null` the app renders nothing; when `false` it renders `<AuthModal>`.
- `userRef` — `useRef` copy of `user`, kept in sync in the auth `useEffect`; used in `persistMapId` to derive the localStorage key without stale closures.
- `mapId` — UUID string of the server-saved map, or null if unsaved / imported from file. Persisted to `localStorage` via `persistMapId()`.
- `isPublished` — boolean; mirrors the server's `is_published` for the currently loaded map.
- `isSaving` — boolean; true while a save API call is in flight (shows "…Saving" on button)
- `mode` / `modeRef` — current editor mode (`'view'` | `'suggest'` | `'edit'`); ref copy used in callbacks via `isEditing()` helper
- `activeLayer` / `activeLayerRef` — current layer view (0–4); ref copy used in callbacks
- `bgColor` — canvas background hex colour, persisted to localStorage
- `layoutDir`, `layoutNodeSep`, `layoutRankSep` — dagre options
- `reactFlowInstance` — used for `screenToFlowPosition()` and `getViewport()`
- `canUndo`, `canRedo` — booleans driving sidebar button state
- `paneMenu`, `nodeMenu` — context menu position/state (null when closed)
- `connectToSource` — source node for the ConnectToModal (null when closed)
- `detailOverlayNode` — node being edited in the TipTap overlay (null when closed)
- `isDirtyRef` — `useRef(false)`; tracks unsaved changes without causing re-renders. True after any mutation, false after save or load.
- `newMapDialogOpen` — boolean; true when the "Unsaved changes" 3-button dialog is visible

### Adding a new node type
The standard node pattern (event/character/note) requires these steps:

1. Create `src/nodes/MyNode.jsx` — import `Handle, Position` from `@xyflow/react`, `useActiveLayer` from `../LayerContext.js`, and `hasDetailContent, getNodeStyle` from `./nodeUtils.js`. Compute `relLayer = (data.layer ?? 0) - activeLayer`, `shape = data.shape ?? 'rectangle'`, and `nodeStyle = getNodeStyle(data.color)`. Render ghost / micro / mini / full branches applying `node--mytype node--${shape}` classes and `style={nodeStyle}`.
   - Use the standard dual-handle pattern in full/mini/ghost renders (target first, opacity:0; source second, visible):
     ```jsx
     <Handle type="target" id="top-target"    position={Position.Top}    style={{ opacity: 0 }} />
     <Handle type="source" id="top-source"    position={Position.Top} />
     <Handle type="target" id="left-target"   position={Position.Left}   style={{ opacity: 0 }} />
     <Handle type="source" id="left-source"   position={Position.Left} />
     {/* ...node content... */}
     <Handle type="target" id="right-target"  position={Position.Right}  style={{ opacity: 0 }} />
     <Handle type="source" id="right-source"  position={Position.Right} />
     <Handle type="target" id="bottom-target" position={Position.Bottom} style={{ opacity: 0 }} />
     <Handle type="source" id="bottom-source" position={Position.Bottom} />
     ```
   - In micro render, add `style={{ opacity: 0 }}` to all eight handles. Use `data.color ? { background: data.color, borderColor: data.color } : undefined` for micro dot style (micro dots don't use `getNodeStyle`).
2. Add CSS background and border-colour variables in `index.css`: `--node-mytype: #...` and `--node-mytype-border: #...` (the border value should be ~30% darker).
3. Add `.node--mytype { background: var(--node-mytype); border-color: var(--node-mytype-border); }` and `.node--micro.node--mytype { background: var(--node-mytype); border-color: var(--node-mytype); opacity: 0.75; }` in `NodeBase.css`.
4. Register it in `App.jsx`'s `nodeTypes` object: `mytype: MyNode`.
5. Add it to `DEFAULT_SHAPES` in `App.jsx` with its default shape.
6. Add it to `FIELD_MAP` in `NodeEditor.jsx` with its editable fields.
7. Add it to `NODE_TYPES` array in `Sidebar.jsx` with label, icon, description.
8. Add it to the `TYPE_KEYS` map in the keyboard-shortcut `useEffect` in `App.jsx`.
9. Add it to `TYPE_COLORS` in `ConnectToModal.jsx` for the type badge colour.

**Region node deviations** — the `region` type intentionally breaks several of the above rules:
- No handles at all — regions use `NodeResizer` from `@xyflow/react` instead.
- No ghost / mini / micro render modes — `RegionNode.jsx` returns `null` when `relLayer !== 0`.
- Not in `DEFAULT_SHAPES` or keyboard shortcuts (`TYPE_KEYS`).
- Not in `TYPE_COLORS` in `ConnectToModal.jsx` — regions are filtered out of the Connect to… target list entirely.
- Node creation in `addNodeAtPosition` and `onDrop` applies special logic for `type === 'region'`: sets `style: { width: 400, height: 300 }`, `zIndex: -1000`, and uses a minimal `data` object (no `shape` or `description`).
- `onAutoLayout` excludes regions from the dagre input set.
- Node context menu skips "Edit details" and "Connect to…" for region nodes.
- Shape picker is hidden in NodeEditor when `node.type === 'region'`.

---

## 6. Design System

The app uses a **dark editorial aesthetic** with CSS custom properties defined in `index.css`:

```css
--bg:          #0f0e11   /* page background */
--surface:     #1a1820   /* panels */
--border:      #2e2b38   /* dividers */
--accent:      #c8a96e   /* gold — primary action colour */
--accent-dim:  #7a6440   /* muted gold */
--text:        #e8e4dc   /* primary text */
--text-muted:  #7a7585   /* secondary text */
--danger:      #c0524a   /* delete actions */

/* Node background colours — border values are 30% darkened */
--node-event:            #3a5a8a   /* blue background */
--node-event-border:     #293f61
--node-character:        #6a3a6a   /* purple background */
--node-character-border: #4a294a
--node-note:             #8a6a3a   /* amber background */
--node-note-border:      #614a29
--node-portal:           #3a8a8a   /* teal background */
--node-portal-border:    #295f5f
```

`getNodeStyle(color)` in `nodeUtils.js` is used by all node components to compute the inline style object for custom colour overrides. It derives `borderColor` (30% darker), `--text`, `--text-muted`, and `--accent-dim` CSS variables overrides for luminance-based text flipping. When `color` is falsy (no override), the function returns `undefined` and the CSS-variable defaults apply.

Fonts: **Playfair Display** (serif, for titles/node headings) + **DM Sans** (sans-serif, for UI).

---

## 7. Suggested Next Steps (in priority order)

### Near term — Media & data quality
1. **Image attachments on nodes** — Allow users to attach images to nodes. Phase 1: paste a URL, store as `data.imageUrl`, render a thumbnail on the node face and full-size in the detail overlay. Phase 2: upload images to Supabase Storage, return a public URL. Useful for fan art, character portraits, location photos, event illustrations.
2. **Alembic migrations** — Add proper versioned migrations for future schema changes.

### Later — Community & collaboration features
3. **Editorial rights with approval queue** — Map authors grant "editor" rights to other users. Edits are staged as pending changes (similar to pull requests). Author approves or rejects. Requires: `map_collaborators` table, `pending_edits` table, and review UI.
4. **Author/ownership transfer** — Transfer full map ownership to another user. Requires: transfer endpoint, receiving-user confirmation, audit trail.
5. **Suggestion sticky notes in viewer** — Visual badge on nodes showing annotation count; click to see suggestions inline.
6. **NetworkX analysis** — Backend Python job analysing graph structure: orphaned nodes, circular dependencies, unreachable nodes, characters with no connections after introduction.
7. **Real-time collaboration** — Yjs + React Flow WebSocket integration for multi-user live editing.

---

## 8. URL Structure & Page Summary

All five routes are now live:

| Route | Component | Auth required | Purpose |
|---|---|---|---|
| `/` | `LandingPage.jsx` | No | Public home: hero, recent-user strip, published-maps grid |
| `/editor` | `App.jsx` | Yes (AuthModal shown) | Blank editor |
| `/editor/:mapId` | `App.jsx` | Yes | Editor pre-loaded with a specific map |
| `/maps` | `MyMapsPage.jsx` | Yes (redirects to `/`) | Full tile grid of the user's maps |
| `/map/:mapId` | `MapViewer.jsx` | No (auth optional) | Public viewer with auth-aware annotation panel |

### LandingPage detail
- Hero: tagline + "Start a new map" CTA. If unauthenticated, clicking CTA opens the `AuthModal` as an overlay; after login the `onAuthStateChange` handler redirects to `/editor`.
- Recent-user strip: shown only when logged in. Fetches `GET /maps`, shows the 4 most recent tiles linking to `/editor/:mapId`.
- Published grid: always visible. Fetches `GET /maps/published` (no auth). Each card shows title, truncated `owner_email`, and a "View" link to `/map/:id`.
- Header: Logo | (logged in) My Maps link + email + Sign out / (logged out) Sign in button.

### MyMapsPage detail
- Fetches `GET /maps` on mount (after auth resolves). Redirects to `/` immediately if unauthenticated.
- Each card: title, "Updated {date}", published badge (if applicable), three buttons: **Open** → `/editor/:mapId`, **Publish/Unpublish** → `PATCH /maps/{id}/publish`, **Delete** → confirm + `DELETE /maps/{id}`.
- Buttons are disabled while their per-card operation is in-flight (`busy` state keyed by map ID).
- "New map" button → `/editor`.

### Future product scope
- **Portal node (cross-map linking)** — special node type linking to another PlotMap; enables book series and cinematic universe connections. Planned for Session 18.
- **Image attachments on nodes** — paste URL or upload to Supabase Storage; thumbnail on node, full-size in overlay. Planned for Session 19.
- **Editorial rights with approval queue** — map authors can grant editor access to other users; edits staged as pending changes.
- **Author/ownership transfer** — transfer full map ownership to another user.
- **Suggestion sticky notes** — visual badge on nodes in View mode showing annotation count; click to see suggestions.
- **Canvas thumbnails** — Auto-generated snapshot images for map tiles.
- **NetworkX analysis** — Backend analysis of plot graphs for structural issues.
- **Real-time collaboration** — Yjs + WebSocket integration.

---

## 9. Known Limitations / Things to Watch Out For

- **`uvicorn` not on PATH on Windows** — Python's Scripts folder (`AppData\Local\Python\...\Scripts`) is not added to PATH automatically. Always start the backend with `python -m uvicorn main:app --reload`, not the bare `uvicorn` command. Similarly use `python -m pip` instead of `pip`.
- **`supabase-py` v3 fails to build on Python 3.14** — `requirements.txt` is pinned to `supabase>=2.0.0,<3.0.0` to avoid a build-time `pyiceberg` dependency that breaks on Python 3.14. Do not widen this pin until supabase-py v3 resolves the issue.
- **Supabase table must be created manually** — there is no `create_all` on startup. Run the `CREATE TABLE maps (...)` SQL in the Supabase SQL editor before starting the backend for the first time. If the table already exists without `is_published`, run the `ALTER TABLE` shown in Section 10. See `backend/README.md` for the full statement.
- **Direct navigation to any route requires a fallback rule in production** — Vite's dev server handles SPA routing automatically. For production deployments, the web server/CDN must be configured to serve `index.html` for all paths (e.g., `_redirects` on Netlify, `vercel.json` rewrites on Vercel). This affects all five routes — `/`, `/editor`, `/editor/:mapId`, `/maps`, `/map/:mapId`.
- **`isPublished` and `mapTitle` are hydrated on restore** — when `mapId` is restored from localStorage on page load, `App.jsx` immediately calls `GET /maps/{id}` to populate `isPublished` and `mapTitle` from the server. If the map has since been deleted from the server, the stale localStorage key is cleared automatically.
- **Mode is not persisted** — `mode` state is not saved to `localStorage`. The app always starts in Edit mode. Once the backend and user roles exist, mode should be derived from the user's relationship to the map (owner → Edit, other → View/Suggest), not stored locally.
- **Suggest mode is now functional** — selecting Suggest switches the right panel to `AnnotationPanel`. Clicking a node shows its annotations and a submit form. The backend enforces that the map owner cannot annotate their own map (403). Non-owners access the annotation flow by loading the map in the editor — full non-owner map loading (public GET /maps/{id}) is not yet implemented, so in practice the owner uses View mode to read annotations left by others.
- `nodeIdCounter` in `App.jsx` is a plain `let` variable (not state). It resets to 100 on page reload. This is fine for local use but must be replaced with UUIDs when persistence is added.
- **View/Suggest mode locks node positions** — `nodesDraggable={mode === 'edit'}` and `nodesConnectable={mode === 'edit'}` are passed to `<ReactFlow>` in `App.jsx`. Nodes are still *selectable* in View/Suggest (so clicking a node opens `AnnotationPanel`), but cannot be moved or connected.
- **Left-clicking on empty canvas** does not deselect the selected node — this is intentional. The user explicitly asked for this behaviour so clicking around a subplot layer doesn't clear the selection and disrupt the view. If a "deselect on canvas click" behaviour is ever needed, re-add `setSelectedNode(null)` to `onPaneClick` in `App.jsx`, but also update the `activeLayer` `useEffect` to handle the reset-to-0 question explicitly.
- **`activeLayer` does not reset to 0 on deselect** — the `useEffect` that derives `activeLayer` from `selectedNode` only fires when `selectedNode` is non-null. Deselecting leaves the layer wherever it was. The layer only changes when (a) the user selects a node on a different layer, or (b) the user changes the LayerIndicator dropdown manually.
- **`data.layer` is optional** — old saves without `layer` on nodes load correctly because all layer calculations use `data.layer ?? 0`.
- **TipTap content** is stored as `JSON.stringify(editor.getJSON())` in `data.detailContent`. Restore with `JSON.parse()`. Never store as HTML — JSON is more stable. The `hasDetailContent()` helper in `nodeUtils.js` checks for actual non-whitespace text content (an empty TipTap paragraph returns false).
- **Keyboard shortcuts (E/C/N) are suppressed** when any `<input>`, `<textarea>`, `<select>`, or `contenteditable` element is focused. The `isContentEditable` check catches TipTap's div-based editor — without it, typing 'n' in TipTap creates a new Note node in the background.
- **Ghost nodes** are parent-layer nodes included in the visible set because they share an edge with a primary-window node (or are referenced as `parentNodeId`). The ghost computation runs on every `visibleNodes` recomputation. For very large maps this is O(nodes + edges) — acceptable for typical story maps but worth noting.
- **Ghost node selection navigates up**: clicking a ghost node selects it and sets `activeLayer` to `node.data.layer` (one level up). This is intentional — it's a navigation shortcut. The previously "active" subplot nodes become mini pills.
- **Node shape selector**: the shape picker in NodeEditor applies `data.shape` to the node. All shapes use CSS classes defined in `NodeBase.css`. Diamond and hexagon use `clip-path` — their borders get clipped, so the selection state uses `filter: drop-shadow` instead of `border-color`. Rectangle, circle, and pill use normal CSS borders and the gold selection ring works as usual.
- **ConnectToModal** receives `nodes` (all nodes across all layers), not just the visible window. A layer badge (`L0`, `L1`, …) is shown beside each node name so cross-layer targets are identifiable without navigating away.
- **`data.shape` backward compatibility**: nodes saved without `data.shape` render as `'rectangle'` (each node component defaults `data.shape ?? 'rectangle'`). Only newly created Character nodes have `data.shape: 'circle'` set by `addNodeAtPosition` / `onDrop` / keyboard shortcut handler via `DEFAULT_SHAPES`.
- **Handle backward compatibility**: `applyLoadedGraph` in `App.jsx` runs a two-pass migration. Pass 1 fills in completely absent handle IDs (`→ left-target` / `→ right-source`). Pass 2 remaps old single-role IDs (`'top'` → `'top-target'`, `'left'` → `'left-target'`, `'right'` → `'right-source'`, `'bottom'` → `'bottom-source'`). Old Decision-node edges with `sourceHandle: 'a'` or `'b'` will appear as dangling edges if those nodes are no longer present — acceptable since Decision nodes no longer exist.
- **Auto-layout is layer-scoped**: it only rearranges nodes in the active layer window and merges positions back into the full array. Nodes on other layers are not moved.
- Node colour overrides use `getNodeStyle(color)` which applies `background`, `borderColor`, and CSS variable overrides (`--text`, `--text-muted`, `--accent-dim`) inline on the node element. The gold selection border uses `border-color: var(--accent) !important` and still overrides computed border colours. For diamond/hexagon shapes, the selection glow uses `filter: drop-shadow` instead of border.
- The dagre layout uses fixed node dimensions (200×80) for its calculations. Nodes with very long text may appear slightly off-centre after auto-layout.
- The undo history snapshots full node/edge arrays. For very large maps this could use significant memory; a diff-based approach would be needed at scale.
- Node text edits (typing in NodeEditor fields or TipTap) are **not** undoable — only structural changes (add, delete, connect, duplicate, auto-layout) are tracked in history.
- Fonts are loaded from Google Fonts CDN — requires internet. For offline use, self-host the fonts.
- React Flow requires its own CSS import (`@xyflow/react/dist/style.css`) — do not remove this from `App.jsx`.

---

## 10. Production Deployment

Deployment config files were created in Session 15.

### Frontend → Vercel

1. Push repo to GitHub; import into Vercel. Set **Root Directory** to `plotmap`.
2. Add env vars in Vercel project settings:
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_API_URL` (your Render URL)
3. `plotmap/vercel.json` handles the SPA rewrite automatically — all paths serve `index.html`.

### Backend → Render

1. Create a new **Web Service** on Render, connect to your repo.
2. Render auto-detects `backend/render.yaml` (Python web service, uvicorn start command).
3. Set env vars in the Render dashboard under **Environment**:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `FRONTEND_ORIGIN` (your Vercel URL)
4. Health check: `GET /health` → `{"status": "ok"}`.

### CORS

`main.py` reads `FRONTEND_ORIGIN` from the environment as a comma-separated list. It defaults to `http://localhost:5173` in dev. Set it to your Vercel URL in production (e.g. `https://plotmap.vercel.app`).

---

## 11. How to Run the Project

Requirements: **Node.js 18+**, **npm**, **Python 3.11+**, and a **Supabase project**.

### One-time setup

**1. Create the Supabase table** — open the SQL editor in your Supabase project and run:
```sql
create table maps (
  id           uuid        primary key,
  title        text        not null default 'Untitled',
  graph_data   jsonb       not null default '{}',
  owner_id     text        not null,
  owner_email  text        not null default '',
  is_published boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

If you already created the table without `is_published`, run:
```sql
alter table maps add column is_published boolean not null default false;
```

If you already created the table without `owner_email`, run:
```sql
alter table maps add column owner_email text not null default '';
```

**2. Configure the backend** — copy `.env.example` to `.env` in `plotmap_project/backend/`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_ORIGIN=http://localhost:5173
```

**3. Configure the frontend** — copy `.env.example` to `.env.local` in `plotmap_project/plotmap/`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

**4. Install backend dependencies** (first time only):
```bash
cd C:\Data\2026\plotmap_project\backend
python -m pip install -r requirements.txt
```

**5. Install frontend dependencies** (first time only):
```bash
cd C:\Data\2026\plotmap_project\plotmap
npm install
```

### Starting the app

**Backend** (terminal 1):
```bash
cd C:\Data\2026\plotmap_project\backend
python -m uvicorn main:app --reload
# → http://localhost:8000
```
Note: use `python -m uvicorn`, not `uvicorn` directly — the Scripts folder is not on PATH by default on Windows.

**Frontend** (terminal 2):
```bash
cd C:\Data\2026\plotmap_project\plotmap
npm run dev
# → http://localhost:5173
```

To build for production: `npm run build` (outputs to `plotmap/dist/`).

---

_End of handoff document. The project is at Phase 16: all frontend milestones are complete, omnidirectional handles are live, the public viewer has layer navigation and a full auth-aware annotation panel (view/suggest/sign-in flow), the annotation system works in both the editor and the public viewer, node visuals have been overhauled (colour as background, 5-shape selector, Decision removed, Character defaults to circle), region background elements and the TipTap overlay, right panel collapse, New Map button, and Ctrl+A are all working. Production deployment config is in place (Vercel + Render). Both apps live under `C:\Data\2026\plotmap_project\`. The next sessions are: (1) polish pass + character icon fix, (2) portal nodes for cross-map linking, (3) image attachments on nodes. Later milestones include editorial rights, ownership transfer, suggestion sticky notes, and real-time collaboration._
