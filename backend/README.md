# PlotMap Backend

FastAPI backend that stores story maps in [Supabase](https://supabase.com).
Authentication is handled by Supabase Auth — the frontend sends a JWT that the
backend validates on every request.

## Prerequisites

- Python 3.11+
- A Supabase project

## Supabase setup

1. Create a project at <https://supabase.com>.
2. Open the **SQL editor** and run:

```sql
create table maps (
  id          uuid        primary key,
  title       text        not null default 'Untitled',
  graph_data  jsonb       not null default '{}',
  owner_id    text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

3. Optionally enable Row Level Security (RLS) if you want database-level
   enforcement in addition to the API-layer ownership checks already present.

4. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

## Local dev

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env with your Supabase credentials
uvicorn main:app --reload
```

The API will be available at <http://localhost:8000>.
Interactive docs: <http://localhost:8000/docs>

## Endpoints

| Method | Path          | Description                      |
|--------|---------------|----------------------------------|
| GET    | /health       | Liveness check                   |
| POST   | /maps         | Create a new map                 |
| GET    | /maps         | List maps owned by the caller    |
| GET    | /maps/{id}    | Fetch a single map with graph    |
| PUT    | /maps/{id}    | Update a map's title / graph     |

All `/maps` endpoints require `Authorization: Bearer <supabase-jwt>`.
