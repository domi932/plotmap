from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


# ── Annotation schemas ────────────────────────────────────────────────────────

class AnnotationCreate(BaseModel):
    node_id: str | None = None
    edge_id: str | None = None
    content: str
    annotation_type: str  # 'flaw' | 'suggestion' | 'question'


class Annotation(BaseModel):
    id: str
    map_id: str
    node_id: str | None = None
    edge_id: str | None = None
    author_id: str
    author_email: str
    content: str
    annotation_type: str
    upvotes: int
    created_at: datetime


# ── Map schemas ───────────────────────────────────────────────────────────────

class MapCreate(BaseModel):
    title: str = "Untitled"
    graph_data: dict[str, Any] = {}


class MapUpdate(BaseModel):
    title: str | None = None
    graph_data: dict[str, Any] | None = None


class MapPublish(BaseModel):
    is_published: bool


class MapSummary(BaseModel):
    id: str
    title: str
    owner_email: str = ""
    is_published: bool = False
    created_at: datetime
    updated_at: datetime


class MapDetail(MapSummary):
    graph_data: dict[str, Any]
