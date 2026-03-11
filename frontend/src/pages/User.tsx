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
      <section className="section user-section">
        {error && <div className="container"><p style={{ color: 'var(--clr-text-muted)' }}>{error}</p></div>}
        {profile && (
          <div className="pubprofile">
            <div className="pubprofile__banner-wrap">
              {profile.banner_url && (
                <img src={profile.banner_url} alt="Banner" className="pubprofile__banner" />
              )}
            </div>

            <div className="pubprofile__header">
              <div className="pubprofile__avatar-wrap">
                {profile.avatar_url
                  ? <img className="pubprofile__avatar" src={profile.avatar_url} alt={profile.username} />
                  : <span className="pubprofile__avatar-initial">{(profile.nickname || profile.username || '?').charAt(0).toUpperCase()}</span>
                }
              </div>
              <h2 className="pubprofile__name">{profile.nickname || profile.username}</h2>
              <span className="pubprofile__handle">@{profile.username}</span>
            </div>

            {((profile.links && profile.links.filter(l => l.username).length > 0) ||
              (profile.badges && profile.badges.filter(b => b.level > 0).length > 0)) && (
              <div className="pubprofile__section">
                <div className="pubprofile__links-row">
                  {profile.links && profile.links.filter(l => l.username).length > 0 && (
                    <div className="pubprofile__links">
                      {profile.links.filter(l => l.username).map(l => (
                        <div key={l.service} className="pubprofile__link-chip">
                          {SERVICE_ICONS[l.service] && (
                            <img src={SERVICE_ICONS[l.service]} alt={l.service} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                          )}
                          <span>{l.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {profile.badges && profile.badges.filter(b => b.level > 0).length > 0 && (
                    <div className="pubprofile__badges-col">
                      {profile.badges.filter(b => b.level > 0).map((b, i) => (
                        <div key={i} className="pubprofile__badge-icon" data-name={b.name}>
                          <img src={b.image_url} alt="" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </AccountLayout>
  )
}
