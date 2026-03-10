import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usersApi } from '@/api/users'
import { badgesApi } from '@/api/badges'
import type { User as UserType, Badge } from '@/types'
import AccountLayout from '@/components/layout/AccountLayout'

export default function User() {
  const [searchParams] = useSearchParams()
  const username = searchParams.get('u') || ''
  const [user, setUser] = useState<UserType | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!username) { setError('Kein Benutzer angegeben.'); return }
    usersApi.getPublicProfile(username)
      .then(d => setUser(d.user))
      .catch(() => setError('Benutzer nicht gefunden.'))
  }, [username])

  useEffect(() => {
    if (user) {
      badgesApi.getMyBadges().then(d => setBadges(d.badges || [])).catch(() => {})
    }
  }, [user])

  return (
    <AccountLayout>
      <section className="section user-section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-lg))' }}>
        <div className="container">
          {error && <p style={{ color: 'var(--clr-text-muted)' }}>{error}</p>}
          {user && (
            <div className="user-profile">
              {user.banner_url && (
                <div className="user-banner">
                  <img src={user.banner_url} alt="Banner" className="user-banner-img" />
                </div>
              )}
              <div className="user-header">
                <div className="user-avatar-wrap">
                  {user.avatar_url
                    ? <img className="user-avatar" src={user.avatar_url} alt={user.username} />
                    : <span className="user-avatar-initial">{(user.username || '?').charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div className="user-info">
                  <h2 className="user-display-name">{user.nickname || user.username}</h2>
                  {user.nickname && <span className="user-username">@{user.username}</span>}
                </div>
              </div>

              {badges.filter(b => b.level > 0).length > 0 && (
                <div className="user-badges">
                  <h3 className="user-badges-title">Badges</h3>
                  <div className="user-badges-grid">
                    {badges.filter(b => b.level > 0).map(b => (
                      <div key={b.id} className="user-badge-item" title={b.name}>
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
