import { useState, useRef } from 'react'
import { adminUsersApi, usersApi } from '@/api/users'
import AccountLayout from '@/components/layout/AccountLayout'

const MASTER_KEY = 'apx-admin-verified'

interface AdminUserDetail {
  username: string
  nickname: string
  email: string
  is_active: boolean
  is_admin: boolean
  is_2fa_enabled?: boolean
  two_fa_enabled?: boolean
  avatar_url?: string
  banner_url?: string
  created_at: string
}

export default function AdminUsers() {
  const [verified, setVerified] = useState(() => sessionStorage.getItem(MASTER_KEY) === 'true')
  const [masterPw, setMasterPw] = useState('')
  const [masterError, setMasterError] = useState('')
  const [masterLoading, setMasterLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ username: string; nickname: string; avatar_url: string }>>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null)
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [show2FAOverlay, setShow2FAOverlay] = useState(false)

  const [userBadges, setUserBadges] = useState<Array<{ badge_id: number; name: string; image_url: string; level: number; max_level: number }>>([])
  const [allBadges, setAllBadges] = useState<Array<{ id: number; name: string; max_level: number }>>([])
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [addBadgeId, setAddBadgeId] = useState(0)
  const [addBadgeLevel, setAddBadgeLevel] = useState(0)

  async function handleMasterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMasterError('')
    setMasterLoading(true)
    try {
      await adminUsersApi.verifyMaster(masterPw)
      sessionStorage.setItem(MASTER_KEY, 'true')
      setVerified(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setMasterError(msg || 'Falsches Masterpassword.')
    } finally {
      setMasterLoading(false)
    }
  }

  function handleSearchInput(q: string) {
    setSearchQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!q.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(() => runSearch(q), 250)
  }

  async function runSearch(q: string) {
    try {
      const data = await usersApi.search(q)
      setSearchResults(data.users || [])
    } catch {}
  }

  async function selectUser(username: string) {
    try {
      const data = await adminUsersApi.getUserDetail(username)
      const u = data.user || data
      setSelectedUser(u)
      setTwoFaEnabled(u.two_fa_enabled !== false)
      setSearchResults([])
      setSearchQuery('')
      loadUserBadges(username)
    } catch {
      alert('Nutzer konnte nicht geladen werden.')
    }
  }

  async function loadUserBadges(username: string) {
    try {
      const data = await adminUsersApi.getUserBadges(username)
      setUserBadges(data.badges || [])
      const { adminBadgesApi } = await import('@/api/badges')
      const bd = await adminBadgesApi.getBadges()
      setAllBadges((bd.badges || []).filter((b: { available: boolean }) => b.available))
    } catch {}
  }

  async function handleToggle2FA() {
    if (!selectedUser) return
    try {
      const result = await adminUsersApi.toggle2fa(selectedUser.username)
      setTwoFaEnabled(result.two_fa_enabled)
      setShow2FAOverlay(false)
    } catch {
      alert('Fehler beim Umschalten')
    }
  }

  async function handleAction(action: 'activate' | 'deactivate' | 'delete') {
    if (!selectedUser) return
    if (action === 'delete' && !confirm(`Benutzer "${selectedUser.username}" wirklich löschen?`)) return
    try {
      if (action === 'activate') await adminUsersApi.activateUser(selectedUser.username)
      else if (action === 'deactivate') await adminUsersApi.deactivateUser(selectedUser.username)
      else await adminUsersApi.deleteUser(selectedUser.username)

      if (action === 'delete') {
        setSelectedUser(null)
      } else {
        setSelectedUser(u => u ? { ...u, is_active: action === 'activate' } : u)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      alert(msg || 'Aktion fehlgeschlagen.')
    }
  }

  if (!verified) {
    return (
      <AccountLayout>
        <section className="section admin-section">
          <div className="container">
            <h1 className="section-title"><span className="accent">Admin</span> – Nutzer</h1>
            <div id="admin-gate-view" style={{ maxWidth: 400 }}>
              <p style={{ color: 'var(--clr-text-muted)', marginBottom: '1rem' }}>Bitte Masterpassword eingeben um fortzufahren.</p>
              <form onSubmit={handleMasterSubmit}>
                <div className="form-field">
                  <label>Masterpassword</label>
                  <input type="password" value={masterPw} onChange={e => setMasterPw(e.target.value)} id="admin-masterpw" required />
                </div>
                {masterError && <p style={{ color: '#e05c5c', marginBottom: '0.5rem' }}>{masterError}</p>}
                <button type="submit" className="btn btn-primary" disabled={masterLoading}>
                  {masterLoading ? '...' : 'Bestätigen'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </AccountLayout>
    )
  }

  if (selectedUser) {
    const displayName = selectedUser.nickname || selectedUser.username
    const initial = displayName.charAt(0).toUpperCase()

    return (
      <AccountLayout>
        <section className="section admin-section">
          <div className="container">
            <h1 className="section-title"><span className="accent">Admin</span> – Nutzer</h1>

            <button
              className="btn btn-outline"
              style={{ marginBottom: '1.5rem' }}
              onClick={() => setSelectedUser(null)}
            >
              ← Zurück
            </button>

            <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', maxWidth: 560, overflow: 'hidden' }}>
              {/* Banner */}
              {selectedUser.banner_url && (
                <div style={{ height: 120, background: `url(${selectedUser.banner_url}) center/cover no-repeat` }} />
              )}
              {!selectedUser.banner_url && (
                <div style={{ height: 80, background: 'var(--clr-bg-alt)' }} />
              )}

              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                {/* Avatar */}
                <div style={{ marginTop: selectedUser.banner_url ? '-40px' : '-32px', marginBottom: '0.75rem' }}>
                  {selectedUser.avatar_url
                    ? <img src={selectedUser.avatar_url} alt={displayName} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--clr-bg-card)' }} />
                    : (
                      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--clr-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, color: '#fff', border: '3px solid var(--clr-bg-card)' }}>
                        {initial}
                      </div>
                    )
                  }
                </div>

                {/* Name & handle */}
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{displayName}</h3>
                  {selectedUser.nickname && (
                    <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>@{selectedUser.username}</span>
                  )}
                </div>

                {/* Info rows */}
                {[
                  ['E-Mail', selectedUser.email],
                  ['Status', selectedUser.is_active ? 'Aktiv' : 'Deaktiviert'],
                  ['Admin', selectedUser.is_admin ? 'Ja' : 'Nein'],
                  ['2FA', twoFaEnabled ? 'Aktiviert' : 'Deaktiviert'],
                  ['Erstellt', selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('de-DE') : '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--clr-text-muted)', minWidth: 100, fontSize: 'var(--fs-sm)' }}>{label}:</span>
                    <span style={{ fontSize: 'var(--fs-sm)' }}>{value}</span>
                  </div>
                ))}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    style={{ borderColor: twoFaEnabled ? '#4caf7d' : '#e05c5c', color: twoFaEnabled ? '#4caf7d' : '#e05c5c' }}
                    onClick={() => setShow2FAOverlay(true)}
                  >
                    2FA {twoFaEnabled ? 'deaktivieren' : 'aktivieren'}
                  </button>

                  {selectedUser.is_active
                    ? <button className="btn btn-outline" onClick={() => handleAction('deactivate')}>Deaktivieren</button>
                    : <button className="btn btn-primary" onClick={() => handleAction('activate')}>Aktivieren</button>
                  }

                  <button
                    style={{ background: 'none', border: '1px solid #e05c5c', color: '#e05c5c', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', cursor: 'pointer' }}
                    onClick={() => handleAction('delete')}
                  >
                    Löschen
                  </button>
                </div>

                {/* Badges section */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0 }}>Badges</h4>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.25rem 0.75rem', fontSize: 'var(--fs-sm)' }}
                      onClick={() => setShowBadgeModal(true)}
                    >
                      + Hinzufügen
                    </button>
                  </div>
                  {userBadges.length === 0 && (
                    <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>Keine Badges.</p>
                  )}
                  {userBadges.map(b => (
                    <div key={b.badge_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <img src={b.image_url} alt={b.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                      <span style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>{b.name}</span>
                      <button
                        disabled={b.level <= 0}
                        style={{ background: 'none', border: '1px solid var(--clr-border)', borderRadius: 4, width: 24, height: 24, cursor: 'pointer' }}
                        onClick={async () => {
                          if (!selectedUser) return
                          await adminUsersApi.updateUserBadge(selectedUser.username, b.badge_id, b.level - 1)
                          loadUserBadges(selectedUser.username)
                        }}
                      >−</button>
                      <span style={{ minWidth: 40, textAlign: 'center', fontSize: 'var(--fs-sm)' }}>Lvl {b.level}</span>
                      <button
                        disabled={b.level >= b.max_level}
                        style={{ background: 'none', border: '1px solid var(--clr-border)', borderRadius: 4, width: 24, height: 24, cursor: 'pointer' }}
                        onClick={async () => {
                          if (!selectedUser) return
                          await adminUsersApi.updateUserBadge(selectedUser.username, b.badge_id, b.level + 1)
                          loadUserBadges(selectedUser.username)
                        }}
                      >+</button>
                      <button
                        style={{ background: 'none', border: '1px solid #e05c5c', color: '#e05c5c', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', fontSize: '0.65rem' }}
                        onClick={async () => {
                          if (!selectedUser || !confirm('Badge entfernen?')) return
                          await adminUsersApi.removeUserBadge(selectedUser.username, b.badge_id)
                          loadUserBadges(selectedUser.username)
                        }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2FA overlay */}
        {show2FAOverlay && (
          <div className="logout-overlay active" onClick={e => { if (e.target === e.currentTarget) setShow2FAOverlay(false) }}>
            <div className="logout-overlay__box">
              <p className="logout-overlay__text">
                2FA für &quot;{selectedUser.username}&quot; {twoFaEnabled ? 'deaktivieren' : 'aktivieren'}?
              </p>
              <div className="logout-overlay__actions">
                <button className="btn btn-outline" onClick={() => setShow2FAOverlay(false)}>Abbrechen</button>
                <button className="btn btn-primary" onClick={handleToggle2FA}>Bestätigen</button>
              </div>
            </div>
          </div>
        )}

        {/* Badge add modal */}
        {showBadgeModal && (
          <div className="logout-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowBadgeModal(false) }}>
            <div className="logout-overlay__box" style={{ maxWidth: 400 }}>
              <h3 style={{ marginBottom: '1rem' }}>Badge hinzufügen</h3>
              <div className="form-field" style={{ marginBottom: '0.75rem' }}>
                <label>Badge</label>
                <select value={addBadgeId} onChange={e => setAddBadgeId(Number(e.target.value))}>
                  <option value={0}>Badge wählen...</option>
                  {allBadges.map(b => (
                    <option key={b.id} value={b.id}>{b.name} (max Lvl {b.max_level})</option>
                  ))}
                </select>
              </div>
              <div className="form-field" style={{ marginBottom: '1rem' }}>
                <label>Level</label>
                <input
                  type="number"
                  min={0}
                  value={addBadgeLevel}
                  onChange={e => setAddBadgeLevel(Number(e.target.value))}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!addBadgeId || !selectedUser) return
                    await adminUsersApi.updateUserBadge(selectedUser.username, addBadgeId, addBadgeLevel)
                    setShowBadgeModal(false)
                    setAddBadgeId(0)
                    setAddBadgeLevel(0)
                    loadUserBadges(selectedUser.username)
                  }}
                >
                  Zuweisen
                </button>
                <button className="btn btn-outline" onClick={() => setShowBadgeModal(false)}>Abbrechen</button>
              </div>
            </div>
          </div>
        )}
      </AccountLayout>
    )
  }

  return (
    <AccountLayout>
      <section className="section admin-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">Admin</span> – Nutzer</h1>

          <div className="form-field" style={{ maxWidth: 500, marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Benutzername suchen…"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              autoFocus
            />
          </div>

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 500 }}>
              {searchResults.map(u => (
                <button
                  key={u.username}
                  onClick={() => selectUser(u.username)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'var(--clr-bg-card)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt={u.username} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--clr-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(u.nickname || u.username).charAt(0).toUpperCase()}
                      </div>
                    )
                  }
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{u.nickname || u.username}</div>
                    {u.nickname && <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.75rem' }}>@{u.username}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim() && searchResults.length === 0 && (
            <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>Keine Ergebnisse.</p>
          )}
        </div>
      </section>
    </AccountLayout>
  )
}
