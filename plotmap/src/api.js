// Base URL is set via the VITE_API_URL environment variable.
// Create plotmap/.env.local with VITE_API_URL=http://localhost:8000 for local dev.
import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers },
    ...options,
  })
  if (!res.ok) {
    // Try to surface the FastAPI error detail if available
    let detail = res.statusText
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch { /* ignore */ }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  /** Create a new map. Returns MapSummary { id, title, created_at, updated_at }. */
  createMap: (title, graphData) =>
    request('/maps', {
      method: 'POST',
      body: JSON.stringify({ title, graph_data: graphData }),
    }),

  /** Replace a map's title and graph_data. Returns MapDetail. */
  updateMap: (id, title, graphData) =>
    request(`/maps/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, graph_data: graphData }),
    }),

  /** List all maps (no graph_data). Returns MapSummary[]. */
  listMaps: () => request('/maps'),

  /** Load a single map including graph_data. Returns MapDetail. */
  getMap: (id) => request(`/maps/${id}`),

  /** Load a published map with no auth. Returns MapDetail or throws on 404/private. */
  getPublicMap: (id) => request(`/maps/public/${id}`),

  /** Set is_published on a map. Returns MapSummary. */
  publishMap: (id, isPublished) =>
    request(`/maps/${id}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ is_published: isPublished }),
    }),

  /** Delete a map. Returns null (204). */
  deleteMap: (id) => request(`/maps/${id}`, { method: 'DELETE' }),

  /** List the 20 most-recently-updated published maps (no auth). Returns MapSummary[]. */
  getPublishedMaps: () => request('/maps/published'),

  /** List all annotations for a map, sorted by upvotes desc (no auth). */
  getAnnotations: (mapId) => request(`/maps/${mapId}/annotations`),

  /** Post a new annotation on a node or edge (auth required; owner of map gets 403). */
  createAnnotation: (mapId, nodeId, edgeId, content, annotationType) =>
    request(`/maps/${mapId}/annotations`, {
      method: 'POST',
      body: JSON.stringify({
        node_id: nodeId,
        edge_id: edgeId,
        content,
        annotation_type: annotationType,
      }),
    }),

  /** Add one upvote to an annotation (auth required). */
  upvoteAnnotation: (annId) =>
    request(`/annotations/${annId}/upvote`, { method: 'POST' }),
}
