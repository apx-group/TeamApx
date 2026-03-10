import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usersApi } from '@/api/users'
import type { UserSearchResult } from '@/types'
import AccountLayout from '@/components/layout/AccountLayout'

interface PublicProfile {
  username: string
  nickname: string
  avatar_url: string
  banner_url: string
  links?: Array<{ service: string; username: string }>
  badges?: Array<{ name: string; image_url: string; level: number; max_level: number }>
}

const SERVICE_ICONS: Record<string, string> = {
  discord: '/icons/DISCORD.svg',
  challengermode: '/images/CM.png',
  twitch: '/icons/TWITCH.svg',
}

export default function User() {
  const [searchParams] = useSearchParams()
  const username = searchParams.get('u') || ''
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!username) return
    fetch(`/api/user?u=${encodeURIComponent(username)}`)
      .then(r => { if (r.status === 404) throw new Error('not found'); return r.json() })
      .then(d => setProfile(d))
      .catch(() => setError('Benutzer nicht gefunden.'))
  }, [username])

  async function runSearch(q: string) {
    try {
      const data = await usersApi.search(q)
      setSearchResults((data.users || []).slice(0, 6))
    } catch {}
  }

  if (!username) {
    return (
      <AccountLayout>
        <section className="section user-section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-lg))' }}>
          <div className="container">
            <div id="user-search-view">
              <input
                className="nav-search-input"
                type="search"
                placeholder="Nutzer suchen…"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  if (searchTimer.current) clearTimeout(searchTimer.current)
                  if (!e.target.value.trim()) { setSearchResults([]); return }
                  searchTimer.current = setTimeout(() => runSearch(e.target.value), 250)
                }}
                style={{ width: '100%', maxWidth: 400, display: 'block', marginBottom: '1.5rem' }}
              />
              <div id="user-search-results">
                {searchResults.map(u => {
                  const name = u.nickname || u.username
                  return (
                    <Link key={u.username} className="user-result-card" to={`/user?u=${encodeURIComponent(u.username)}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
                      {u.avatar_url
                        ? <img className="user-result-card__avatar" src={u.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        : <span className="user-result-card__initial" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--clr-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{(name[0] || '?').toUpperCase()}</span>}
                      <div className="user-result-card__info">
                        <span className="user-result-card__name" style={{ fontWeight: 600, display: 'block' }}>{name}</span>
                        {u.nickname && <span className="user-result-card__username" style={{ fontSize: 'var(--fs-sm)', color: 'var(--clr-text-muted)' }}>@{u.username}</span>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </AccountLayout>
    )
  }

  return (
    <AccountLayout>
      <section className="section user-section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-lg))' }}>
        <div className="container">
          {error && <p style={{ color: 'var(--clr-text-muted)' }}>{error}</p>}
          {profile && (
            <div className="user-profile">
              {profile.banner_url && (
                <div className="user-banner">
                  <img src={profile.banner_url} alt="Banner" className="user-banner-img" />
                </div>
              )}
              <div className="user-header">
                <div className="user-avatar-wrap">
                  {profile.avatar_url
                    ? <img className="user-avatar" src={profile.avatar_url} alt={profile.username} />
                    : <span className="user-avatar-initial">{(profile.username || '?').charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div className="user-info">
                  <h2 className="user-display-name">{profile.nickname || profile.username}</h2>
                  {profile.nickname && <span className="user-username">@{profile.username}</span>}
                </div>
              </div>

              {profile.links && profile.links.filter(l => l.username).length > 0 && (
                <div className="pub-links-section" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {profile.links.filter(l => l.username).map(l => (
                      <div key={l.service} className="pubprofile__link-chip"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-sm)' }}>
                        {SERVICE_ICONS[l.service]
                          ? <img src={SERVICE_ICONS[l.service]} alt={l.service} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                          : null}
                        <span>{l.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile.badges && profile.badges.filter(b => b.level > 0).length > 0 && (
                <div className="user-badges" style={{ marginTop: '1.5rem' }}>
                  <h3 className="user-badges-title" style={{ marginBottom: '0.75rem' }}>Badges</h3>
                  <div className="user-badges-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {profile.badges.filter(b => b.level > 0).map((b, i) => (
                      <div key={i} title={b.name} style={{ textAlign: 'center' }}>
                        <img src={b.image_url} alt={b.name} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </AccountLayout>
  )
}
