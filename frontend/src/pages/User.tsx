import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usersApi } from '@/api/users'
import { progressionApi, type ProgressionProfile } from '@/api/progression'
import type { UserSearchResult } from '@/types'
import AccountLayout from '@/templates/layout/AccountLayout'

interface PublicProfile {
  username: string
  nickname: string
  avatar_url: string
  banner_url: string
  timezone?: string
  links?: Array<{ service: string; username: string; profile_url?: string; avatar_url?: string }>
  badges?: Array<{ name: string; image_url: string; level: number; max_level: number }>
}

interface TwitchModal {
  username: string
  avatarUrl: string
}

const SERVICE_ICONS: Record<string, string> = {
  discord: '/icons/DISCORD.svg',
  challengermode: '/images/CM.png',
  twitch: '/icons/TWITCH.svg',
  youtube: '/icons/YOUTUBE.svg',
}

export default function User() {
  const [searchParams] = useSearchParams()
  const username = searchParams.get('u') || ''
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [twitchModal, setTwitchModal] = useState<TwitchModal | null>(null)
  const [cmModalOpen, setCmModalOpen] = useState(false)
  const [cmModalProfileUrl, setCmModalProfileUrl] = useState('')
  const [progression, setProgression] = useState<ProgressionProfile | null>(null)
  const [localTime, setLocalTime] = useState('')

  useEffect(() => {
    if (!profile?.timezone) { setLocalTime(''); return }
    function tick() {
      setLocalTime(new Date().toLocaleTimeString('de-DE', { timeZone: profile!.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [profile?.timezone])

  useEffect(() => {
    if (!username) return
    progressionApi.getProfile(username).then(setProgression).catch(() => {})
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
        {profile && (() => {
          const visibleLinks = profile.links?.filter(l => l.username || l.profile_url) ?? []

          return (
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

              {/* Progression */}
              {progression && (progression.rank || progression.level > 0 || progression.currency_balance > 0) && (
                <div className="pubprofile__section">
                  <p className="pubprofile__section-title">Progression</p>
                  <div className="pubprofile__statbar">
                    {progression.rank && (
                      <>
                        <span className={`pubprofile__rank-badge pubprofile__rank-badge--${progression.rank}`}>
                          {progression.rank}
                        </span>
                        <span className="pubprofile__statbar-sep" />
                      </>
                    )}
                    <div className="pubprofile__statbar-item">
                      <span className="pubprofile__statbar-label">Level</span>
                      <span className="pubprofile__statbar-value">{progression.level}</span>
                    </div>
                    <span className="pubprofile__statbar-sep" />
                    <div className="pubprofile__statbar-item">
                      <span className="pubprofile__statbar-label">Gold</span>
                      <span className="pubprofile__statbar-value pubprofile__statbar-value--gold">
                        <span className="pubprofile__prog-coins-icon">◆</span>
                        {progression.currency_balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {progression.equipped_items.length > 0 && (
                    <div className="pubprofile__equipped-items" style={{ marginTop: 'var(--space-md)' }}>
                      {progression.equipped_items.map(item => (
                        <div
                          key={item.inventory_id}
                          className={`pubprofile__equipped-chip pubprofile__equipped-chip--${item.rarity}`}
                          title={item.name}
                        >
                          <span className="pubprofile__equipped-chip-name">{item.name}</span>
                          <span className={`pubprofile__equipped-rarity pubprofile__equipped-rarity--${item.rarity}`}>
                            {item.rarity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Verlinkungen */}
              {visibleLinks.length > 0 && (
                <div className="pubprofile__section">
                  <p className="pubprofile__section-title">Verlinkungen</p>
                  <div className="pubprofile__links">
                    {visibleLinks.map(l => {
                      const chip = (
                        <>
                          {SERVICE_ICONS[l.service] && (
                            <img src={SERVICE_ICONS[l.service]} alt={l.service} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                          )}
                          <span>{l.username || (l.service === 'challengermode' ? 'Challengermode' : l.service)}</span>
                        </>
                      )
                      if (l.service === 'twitch') {
                        return (
                          <button key={l.service} className="pubprofile__link-chip pubprofile__link-chip--link" onClick={() => setTwitchModal({ username: l.username, avatarUrl: l.avatar_url || '' })}>
                            {chip}
                          </button>
                        )
                      }
                      if (l.service === 'challengermode') {
                        return (
                          <button key={l.service} className="pubprofile__link-chip pubprofile__link-chip--link" onClick={() => { setCmModalProfileUrl(l.profile_url || ''); setCmModalOpen(true) }}>
                            {chip}
                          </button>
                        )
                      }
                      return l.profile_url
                        ? <a key={l.service} href={l.profile_url} target="_blank" rel="noopener noreferrer" className="pubprofile__link-chip pubprofile__link-chip--link">{chip}</a>
                        : <div key={l.service} className="pubprofile__link-chip">{chip}</div>
                    })}
                  </div>
                </div>
              )}

              {/* Badges */}
              {profile.badges && profile.badges.length > 0 && (
                <div className="pubprofile__section">
                  <p className="pubprofile__section-title">Badges</p>
                  <div className="pubprofile__badges-col">
                    {profile.badges.map((b, i) => (
                      <div key={i} className="pubprofile__badge-icon" data-name={b.name}>
                        <img src={b.image_url} alt="" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other */}
              {localTime && profile.timezone && (
                <div className="pubprofile__section">
                  <p className="pubprofile__section-title">Other</p>
                  <div className="pubprofile__other">
                    <span className="pubprofile__other-label">Lokalzeit</span>
                    <span className="pubprofile__other-value">{localTime}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </section>

      {cmModalOpen && (
        <div className="cm-overlay" onClick={() => setCmModalOpen(false)}>
          <div className="cm-overlay__box" onClick={e => e.stopPropagation()}>
            <div className="cm-overlay__actions">
              <button className="btn btn-outline" onClick={() => setCmModalOpen(false)}>Cancel</button>
              <a className="btn btn-primary" href={cmModalProfileUrl} target="_blank" rel="noopener noreferrer">
                Open Challengermode
              </a>
            </div>
          </div>
        </div>
      )}

      {twitchModal && (
        <div className="twitch-overlay" onClick={() => setTwitchModal(null)}>
          <div className="twitch-overlay__box" onClick={e => e.stopPropagation()}>
            <div className="twitch-overlay__header">
              {twitchModal.avatarUrl
                ? <img className="twitch-overlay__avatar" src={twitchModal.avatarUrl} alt={twitchModal.username} />
                : <div className="twitch-overlay__avatar twitch-overlay__avatar--placeholder" />
              }
              <span className="twitch-overlay__username">{twitchModal.username}</span>
            </div>
            <div className="twitch-overlay__actions">
              <button className="btn btn-outline" onClick={() => setTwitchModal(null)}>Cancel</button>
              <a className="btn btn-primary" href={`https://www.twitch.tv/${twitchModal.username}`} target="_blank" rel="noopener noreferrer">
                Open Twitch
              </a>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
