import os
import uuid
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from auth import AuthUser, get_current_user
from schemas import (
    Annotation, AnnotationCreate,
    MapCreate, MapDetail, MapPublish, MapSummary, MapUpdate,
)
from supabase_client import supabase

load_dotenv()

app = FastAPI(title="PlotMap API", version="1.0.0")

origins = [
    o.strip()
    for o in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ── Maps ──────────────────────────────────────────────────────────────────────

@app.post("/maps", response_model=MapSummary, status_code=201)
def create_map(body: MapCreate, user: AuthUser = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "id": str(uuid.uuid4()),
        "title": body.title,
        "graph_data": body.graph_data,
        "owner_id": user.id,
        "owner_email": user.email,
        "is_published": False,
        "created_at": now,
        "updated_at": now,
    }
    res = supabase.table("maps").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create map")
    return res.data[0]


@app.get("/maps", response_model=list[MapSummary])
def list_maps(user: AuthUser = Depends(get_current_user)):
    res = (
        supabase.table("maps")
        .select("id,title,owner_email,is_published,created_at,updated_at")
        .eq("owner_id", user.id)
        .order("updated_at", desc=True)
        .execute()
    )
    return res.data


@app.get("/maps/{map_id}", response_model=MapDetail)
def get_map(map_id: str, user: AuthUser = Depends(get_current_user)):
    res = supabase.table("maps").select("*").eq("id", map_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Map not found")
    row = res.data[0]
    if row["owner_id"] != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return row


@app.put("/maps/{map_id}", response_model=MapDetail)
def update_map(
    map_id: str,
    body: MapUpdate,
    user: AuthUser = Depends(get_current_user),
):
    check = supabase.table("maps").select("owner_id").eq("id", map_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Map not found")
    if check.data[0]["owner_id"] != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    updates: dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.title is not None:
        updates["title"] = body.title
    if body.graph_data is not None:
        updates["graph_data"] = body.graph_data

    res = supabase.table("maps").update(updates).eq("id", map_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update map")
    return res.data[0]


@app.patch("/maps/{map_id}/publish", response_model=MapSummary)
def publish_map(
    map_id: str,
    body: MapPublish,
    user: AuthUser = Depends(get_current_user),
):
    check = supabase.table("maps").select("owner_id").eq("id", map_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Map not found")
    if check.data[0]["owner_id"] != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    res = (
        supabase.table("maps")
        .update({"is_published": body.is_published})
        .eq("id", map_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update map")
    return res.data[0]


@app.delete("/maps/{map_id}", status_code=204)
def delete_map(map_id: str, user: AuthUser = Depends(get_current_user)):
    check = supabase.table("maps").select("owner_id").eq("id", map_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Map not found")
    if check.data[0]["owner_id"] != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    supabase.table("maps").delete().eq("id", map_id).execute()


# ── Annotations ───────────────────────────────────────────────────────────────

@app.post("/maps/{map_id}/annotations", response_model=Annotation, status_code=201)
def create_annotation(
    map_id: str,
    body: AnnotationCreate,
    user: AuthUser = Depends(get_current_user),
):
    map_res = supabase.table("maps").select("owner_id").eq("id", map_id).execute()
    if not map_res.data:
        raise HTTPException(status_code=404, detail="Map not found")
    if map_res.data[0]["owner_id"] == user.id:
        raise HTTPException(status_code=403, detail="Map owners cannot annotate their own map")
    row = {
        "map_id": map_id,
        "node_id": body.node_id,
        "edge_id": body.edge_id,
        "author_id": user.id,
        "author_email": user.email,
        "content": body.content,
        "annotation_type": body.annotation_type,
    }
    res = supabase.table("annotations").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create annotation")
    return res.data[0]


@app.get("/maps/{map_id}/annotations", response_model=list[Annotation])
def list_annotations(map_id: str):
    """Return all annotations for a map, sorted by upvotes desc. No auth required."""
    res = (
        supabase.table("annotations")
        .select("*")
        .eq("map_id", map_id)
        .order("upvotes", desc=True)
        .execute()
    )
    return res.data


@app.post("/annotations/{ann_id}/upvote", response_model=Annotation)
def upvote_annotation(ann_id: str, user: AuthUser = Depends(get_current_user)):
    res = supabase.table("annotations").select("upvotes").eq("id", ann_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Annotation not found")
    new_upvotes = res.data[0]["upvotes"] + 1
    updated = (
        supabase.table("annotations")
        .update({"upvotes": new_upvotes})
        .eq("id", ann_id)
        .execute()
    )
    if not updated.data:
        raise HTTPException(status_code=500, detail="Failed to upvote")
    return updated.data[0]


# ── Public endpoints (no auth) ────────────────────────────────────────────────

@app.get("/maps/public/{map_id}", response_model=MapDetail)
def get_public_map(map_id: str):
    """Return a published map with no authentication required.
    Returns 404 for both missing and unpublished maps to avoid leaking IDs."""
    res = supabase.table("maps").select("*").eq("id", map_id).execute()
    if not res.data or not res.data[0].get("is_published"):
        raise HTTPException(status_code=404, detail="Map not found")
    return res.data[0]


@app.get("/maps/published", response_model=list[MapSummary])
def list_published_maps():
    """Return the 20 most recently updated published maps (no auth required)."""
    res = (
        supabase.table("maps")
        .select("id,title,owner_email,is_published,created_at,updated_at")
        .eq("is_published", True)
        .order("updated_at", desc=True)
        .limit(20)
        .execute()
    )
    return res.data
