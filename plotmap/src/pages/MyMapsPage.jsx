import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import './MyMapsPage.css'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MyMapsPage() {
  const navigate = useNavigate()
  const addToast = useToast()

  // null = loading, false = not logged in, object = logged in
  const [user, setUser] = useState(null)
  const [maps, setMaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState({}) // mapId → true while an operation is in-flight

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? false
      setUser(u)
      if (!u) navigate('/')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? false
      setUser(u)
      if (!u) navigate('/')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  // Load maps once auth resolves
  useEffect(() => {
    if (!user) return
    api.listMaps()
      .then(setMaps)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const setBusyFor = (id, val) => setBusy((prev) => ({ ...prev, [id]: val }))

  const handlePublishToggle = async (map) => {
    setBusyFor(map.id, true)
    const next = !map.is_published
    try {
      const updated = await api.publishMap(map.id, next)
      setMaps((prev) => prev.map((m) => (m.id === map.id ? { ...m, is_published: updated.is_published } : m)))
      addToast(next ? 'Map published' : 'Map unpublished')
    } catch (err) {
      addToast(`Could not update map: ${err.message}`, 'error')
    } finally {
      setBusyFor(map.id, false)
    }
  }

  const handleDelete = async (map) => {
    if (!window.confirm(`Delete "${map.title}"? This cannot be undone.`)) return
    setBusyFor(map.id, true)
    try {
      await api.deleteMap(map.id)
      setMaps((prev) => prev.filter((m) => m.id !== map.id))
      addToast('Map deleted')
    } catch (err) {
      addToast(`Could not delete map: ${err.message}`, 'error')
    } finally {
      setBusyFor(map.id, false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // Loading spinner while session check is in-flight
  if (user === null) return null

  return (
    <div className="mymaps">
      {/* ── Header ── */}
      <header className="mymaps__header">
        <Link to="/" className="mymaps__logo">PlotMap</Link>
        <h1 className="mymaps__heading">My Maps</h1>
        <div className="mymaps__actions">
          <button className="mymaps__btn mymaps__btn--accent" onClick={() => navigate('/editor')}>
            New map
          </button>
          <span className="mymaps__user-email">{user?.email}</span>
          <button className="mymaps__btn mymaps__btn--ghost" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mymaps__main">
        {loading ? (
          <div className="mymaps__grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="mymaps__skeleton-card" />
            ))}
          </div>
        ) : maps.length === 0 ? (
          <div className="mymaps__empty-state">
            <p className="mymaps__empty">No maps yet — create your first one!</p>
            <button className="mymaps__btn mymaps__btn--accent" onClick={() => navigate('/editor')}>
              Create your first map
            </button>
          </div>
        ) : (
          <div className="mymaps__grid">
            {maps.map((m) => (
              <div key={m.id} className="mymaps__card">
                <div className="mymaps__card-title">{m.title}</div>
                <div className="mymaps__card-date">Updated {formatDate(m.updated_at)}</div>
                {m.is_published && (
                  <div className="mymaps__card-published">Published</div>
                )}
                <div className="mymaps__card-btns">
                  <button
                    className="mymaps__btn mymaps__btn--primary"
                    onClick={() => navigate(`/editor/${m.id}`)}
                    disabled={busy[m.id]}
                    title="Open in editor"
                  >
                    Open
                  </button>
                  <button
                    className="mymaps__btn mymaps__btn--ghost"
                    onClick={() => handlePublishToggle(m)}
                    disabled={busy[m.id]}
                    title={m.is_published ? 'Unpublish this map' : 'Publish this map publicly'}
                  >
                    {m.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    className="mymaps__btn mymaps__btn--danger"
                    onClick={() => handleDelete(m)}
                    disabled={busy[m.id]}
                    title="Delete this map permanently"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
