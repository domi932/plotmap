# PlotMap – Handoff Document V5

_Last updated: 2026-04-13_

---

## 1. Project overview

PlotMap is a visual story-structure editor. Writers build layered plot maps using nodes (Event, Character, Note, Region) connected by directed edges. Maps can be saved, published, and shared publicly. Authenticated viewers can annotate published maps with typed suggestions (Flaw / Suggestion / Question) and upvote existing annotations.

---

## 2. Component inventory

### Pages

| File | Description |
|------|-------------|
| `pages/LandingPage.jsx` | Home: hero, recent user maps, published-maps grid, auth modal |
| `pages/MapViewer.jsx` | Public read-only viewer with layered canvas, node selection, and full annotation panel (view/suggest/sign-in prompt). Auth-aware: unauthenticated users see annotations and a sign-in prompt; non-owners can submit and upvote; owners can read but not annotate. |
| `pages/MyMapsPage.jsx` | Authenticated list of the user's maps with publish toggle and delete |

### Components

| File | Description |
|------|-------------|
| `components/AnnotationPanel.jsx` | Displays annotations for a selected node; accepts `mode` ('view'/'suggest'), `user`, `mapId`, `nodeId`. In suggest mode shows submit form + upvote buttons. |
| `components/AuthModal.jsx` | Sign-in/sign-up modal. Accepts optional `onClose` prop — clicking the backdrop calls it. |
| `components/ConnectToModal.jsx` | Modal for choosing an edge target in the editor |
| `components/ContextMenu.jsx` | Right-click context menu on the editor canvas |
| `components/EdgeEditor.jsx` | Sidebar panel for editing edge label/type |
| `components/LayerIndicator.jsx` | Layer navigation indicator (0-based depth) |
| `components/ModeToggle.jsx` | Edit/Annotate mode toggle in the main editor |
| `components/MyMapsModal.jsx` | Modal listing the user's saved maps inside the editor |
| `components/NodeDetailOverlay.jsx` | Overlay showing full node details; supports `readOnly` prop |
| `components/NodeEditor.jsx` | Sidebar panel for editing node fields |
| `components/Sidebar.jsx` | Left sidebar with node-type palette and save/publish controls |

### Core files

| File | Description |
|------|-------------|
| `api.js` | All fetch calls to the FastAPI backend; reads `VITE_API_URL` from env |
| `supabase.js` | Supabase client; reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| `LayerContext.js` | React context providing `activeLayer` to node renderers |
| `App.jsx` | Full map editor: create/edit/save/publish, annotations in annotate mode |

---

## 3. Backend

FastAPI + Supabase (service-role key). Auth is Supabase JWT — frontend sends `Authorization: Bearer <token>` on every authenticated request.

### Key endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Liveness check |
| POST | `/maps` | Yes | Create map |
| GET | `/maps` | Yes | List caller's maps |
| GET | `/maps/{id}` | Yes | Fetch map with graph_data |
| PUT | `/maps/{id}` | Yes | Update title / graph_data |
| PATCH | `/maps/{id}/publish` | Yes | Toggle is_published |
| DELETE | `/maps/{id}` | Yes | Delete map |
| GET | `/maps/public/{id}` | No | Fetch published map (includes `owner_id`) |
| GET | `/maps/published` | No | List 20 most-recent published maps |
| GET | `/maps/{id}/annotations` | No | List annotations sorted by upvotes |
| POST | `/maps/{id}/annotations` | Yes | Create annotation (403 if owner) |
| POST | `/annotations/{id}/upvote` | Yes | Increment upvotes |

### Schemas

`MapDetail` includes `owner_id` so the public viewer can determine ownership client-side without an additional authenticated request.

---

## 4. Environment variables

### Frontend (`plotmap/.env.local` for dev, Vercel dashboard for prod)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend URL (e.g. `https://plotmap-api.onrender.com`) |

### Backend (`.env` for dev, Render dashboard for prod)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret |
| `FRONTEND_ORIGIN` | Comma-separated allowed CORS origins |

---

## 5. Deployment config (created 2026-04-12)

| File | Purpose |
|------|---------|
| `plotmap/vercel.json` | SPA rewrite — all paths serve `index.html` |
| `backend/render.yaml` | Render web service definition |
| `backend/Procfile` | Heroku-compatible start command |

### Backend (Render)
1. Push repo to GitHub; connect to Render.
2. Render auto-detects `render.yaml`.
3. Set the three env vars in the Render dashboard under **Environment**.
4. Health check: `GET /health` → `{"status":"ok"}`.

### Frontend (Vercel)
1. Import repo; set **Root Directory** to `plotmap`.
2. Add the three `VITE_*` vars in Vercel project settings.
3. Deploy — `vercel.json` handles SPA routing automatically.

---

## 6. Supabase schema

```sql
create table maps (
  id           uuid        primary key,
  title        text        not null default 'Untitled',
  graph_data   jsonb       not null default '{}',
  owner_id     text        not null,
  owner_email  text,
  is_published boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table annotations (
  id              uuid        primary key default gen_random_uuid(),
  map_id          uuid        references maps(id) on delete cascade,
  node_id         text,
  edge_id         text,
  author_id       text        not null,
  author_email    text,
  content         text        not null,
  annotation_type text        not null default 'comment',
  upvotes         int         not null default 0,
  created_at      timestamptz not null default now()
);
```

---

## 7. Completed features

1. Full map editor (App.jsx) with layers, node/edge types, save, publish.
2. Public MapViewer with annotation panel — auth-aware view/suggest/sign-in flow.
3. Landing page with published-maps grid and auth modal.
4. MyMapsPage with publish toggle and delete.
5. Backend REST API with JWT auth and annotation endpoints.
6. Deployment config for Vercel (frontend) and Render (backend).

---

## 8. MapViewer annotation behaviour (detail)

| Viewer state | Header badge | Panel mode | Can submit | Can upvote |
|---|---|---|---|---|
| Not logged in | "View only" | view | No — shows sign-in prompt | No |
| Logged in, non-owner | "View"/"Suggest" toggle | suggest (default) | Yes | Yes |
| Logged in, IS owner | "View only" | view | No (backend 403) | Yes |

- Clicking a node opens the annotation panel; clicking the canvas background closes it.
- The header toggle (non-owners only) switches the panel between view-only and suggest-form.
- The sign-in prompt opens `AuthModal` as a fixed overlay. Closing by clicking the backdrop or completing sign-in dismisses it.
- Double-clicking a node still opens the full `NodeDetailOverlay` in read-only mode.

---

## 9. Known limitations / future work

- Chunk size is ~1 MB uncompressed (Rollup warning). Consider code-splitting if bundle growth continues.
- No edge annotations in the viewer (API supports `edge_id` but UI only wires `node_id`).
- No real-time annotation updates — viewer must re-select a node to see new annotations from other users.
- Row Level Security (RLS) on Supabase tables is optional but recommended before public launch.
