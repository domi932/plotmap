import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { api } from '../api.js'
import AuthModal from '../components/AuthModal.jsx'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()

  // null = loading, false = not logged in, object = logged in
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [recentMaps, setRecentMaps] = useState([])
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [publishedMaps, setPublishedMaps] = useState([])
  const [loadingPublished, setLoadingPublished] = useState(true)

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? false
      setUser(u)
      // After login, redirect to editor
      if (u) navigate('/editor')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  // Load recent user maps when logged in
  useEffect(() => {
    if (!user) return
    setLoadingRecent(true)
    api.listMaps()
      .then((maps) => setRecentMaps(maps.slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoadingRecent(false))
  }, [user])

  // Load published maps (public, no auth needed)
  useEffect(() => {
    api.getPublishedMaps()
      .then(setPublishedMaps)
      .catch(() => {})
      .finally(() => setLoadingPublished(false))
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleStartMap = () => {
    if (user) {
      navigate('/editor')
    } else {
      setShowAuth(true)
    }
  }

  return (
    <div className="landing">
      {/* ── Header ── */}
      <header className="landing__header">
        <span className="landing__logo">PlotMap</span>
        <nav className="landing__nav">
          {user === null ? null : user ? (
            <>
              <Link to="/maps" className="landing__nav-link">My Maps</Link>
              <span className="landing__user-email">{user.email}</span>
              <button className="landing__btn landing__btn--ghost" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <button className="landing__btn landing__btn--accent" onClick={() => setShowAuth(true)}>
              Sign in
            </button>
          )}
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="landing__hero">
        <h1 className="landing__headline">Map your story.</h1>
        <p className="landing__subline">
          A visual editor for plot structure, character arcs, and narrative layers.
        </p>
        <button className="landing__cta" onClick={handleStartMap}>
          Start a new map
        </button>
      </section>

      {/* ── Recent maps strip (logged-in only) ── */}
      {user && (
        <section className="landing__section">
          <h2 className="landing__section-title">Your recent maps</h2>
          {loadingRecent ? (
            <div className="landing__strip">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="landing__skeleton-tile" />
              ))}
            </div>
          ) : recentMaps.length > 0 ? (
            <div className="landing__strip">
              {recentMaps.map((m) => (
                <Link key={m.id} to={`/editor/${m.id}`} className="landing__strip-tile">
                  <span className="landing__strip-title">{m.title}</span>
                  {m.is_published && <span className="landing__strip-badge">Published</span>}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {/* ── Published maps grid ── */}
      <section className="landing__section">
        <h2 className="landing__section-title">Published maps</h2>
        {loadingPublished ? (
          <div className="landing__grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="landing__skeleton-card" />
            ))}
          </div>
        ) : publishedMaps.length === 0 ? (
          <p className="landing__empty">No published maps yet.</p>
        ) : (
          <div className="landing__grid">
            {publishedMaps.map((m) => (
              <div key={m.id} className="landing__card">
                <div className="landing__card-title">{m.title}</div>
                <div className="landing__card-author">
                  {m.owner_email
                    ? m.owner_email.length > 28
                      ? m.owner_email.slice(0, 25) + '…'
                      : m.owner_email
                    : 'Anonymous'}
                </div>
                <Link to={`/map/${m.id}`} className="landing__card-btn">View</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Auth overlay ── */}
      {showAuth && (
        <div className="landing__auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false) }}>
          <AuthModal onClose={() => setShowAuth(false)} />
        </div>
      )}
    </div>
  )
}
