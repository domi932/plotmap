# PlotMap – Production Deployment Handoff (V5)

_Last updated: 2026-04-12_

---

## Status

The project is ready for production deployment.  
Frontend targets **Vercel**; backend targets **Render**.

---

## Build verification

`npm run build` inside `plotmap/` compiles cleanly (324 modules, no errors).  
There is one informational Rollup chunk-size warning (~1 MB uncompressed JS);
this is not an error and does not block deployment.

---

## Deployment config files created

| File | Purpose |
|------|---------|
| `plotmap/vercel.json` | SPA rewrite rule — all paths serve `index.html` |
| `backend/render.yaml` | Render service definition (Python web service) |
| `backend/Procfile` | Fallback start command for Heroku-compatible platforms |

---

## Environment variables

### Frontend (`plotmap/.env.local` for dev, Vercel dashboard for prod)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Full URL of the deployed backend (e.g. `https://plotmap-api.onrender.com`) |

### Backend (Render dashboard or `.env` for dev)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret |
| `FRONTEND_ORIGIN` | Comma-separated allowed origins (e.g. `https://plotmap.vercel.app`) |

---

## CORS

`main.py` reads `FRONTEND_ORIGIN` from the environment (comma-separated).
It defaults to `http://localhost:5173` when the variable is absent (dev only).
Set `FRONTEND_ORIGIN` to your Vercel URL in the Render dashboard before going live.

---

## Supabase schema (from backend README)

```sql
create table maps (
  id          uuid        primary key,
  title       text        not null default 'Untitled',
  graph_data  jsonb       not null default '{}',
  owner_id    text        not null,
  owner_email text,
  is_published boolean    not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
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

## Deployment steps

### Backend (Render)

1. Push `backend/` to a GitHub repo (or the project root).
2. Create a new **Web Service** on Render, point it at the repo.
3. Render will auto-detect `render.yaml` and configure the service.
4. Set the three env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGIN`) in the Render dashboard under **Environment**.
5. Deploy — health check at `GET /health` should return `{"status":"ok"}`.

### Frontend (Vercel)

1. Push `plotmap/` (or the project root) to GitHub.
2. Import the repo into Vercel; set **Root Directory** to `plotmap`.
3. Add env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`) in Vercel project settings.
4. Deploy — Vercel picks up `vercel.json` automatically for SPA routing.

---

## Project structure

```
plotmap_project/
├── plotmap/               # Vite + React frontend
│   ├── src/
│   │   ├── api.js         # All fetch calls; uses VITE_API_URL
│   │   ├── supabase.js    # Supabase client; uses VITE_SUPABASE_* vars
│   │   ├── App.jsx
│   │   ├── LayerContext.js
│   │   ├── components/
│   │   ├── nodes/
│   │   └── pages/
│   └── vercel.json        # ← created this session
├── backend/               # FastAPI backend
│   ├── main.py            # App entrypoint; CORS reads FRONTEND_ORIGIN
│   ├── auth.py
│   ├── schemas.py
│   ├── supabase_client.py
│   ├── requirements.txt
│   ├── render.yaml        # ← created this session
│   └── Procfile           # ← created this session
└── plotmap_handoff_V5.md  # this file
```
