import { useState } from 'react'
import { adminUsersApi } from '@/api/users'
import AccountLayout from '@/components/layout/AccountLayout'

const MASTER_KEY = 'apx-admin-verified'

interface UserDetail {
  username: string
  nickname: string
  email: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export default function AdminUsers() {
  const [verified, setVerified] = useState(() => sessionStorage.getItem(MASTER_KEY) === 'true')
  const [masterPw, setMasterPw] = useState('')
  const [masterError, setMasterError] = useState('')
  const [masterLoading, setMasterLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<UserDetail | null>(null)
  const [searchError, setSearchError] = useState('')

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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchError('')
    setSearchResult(null)
    try {
      const data = await adminUsersApi.getUserDetail(searchQuery.trim())
      setSearchResult(data.user || data)
    } catch {
      setSearchError('Benutzer nicht gefunden.')
    } finally {
      setSearching(false)
    }
  }

  async function handleAction(action: 'activate' | 'deactivate' | 'delete') {
    if (!searchResult) return
    if (action === 'delete' && !confirm(`Benutzer "${searchResult.username}" wirklich löschen?`)) return
    try {
      if (action === 'activate') await adminUsersApi.activateUser(searchResult.username)
      else if (action === 'deactivate') await adminUsersApi.deactivateUser(searchResult.username)
      else await adminUsersApi.deleteUser(searchResult.username)

      if (action === 'delete') {
        setSearchResult(null)
        setSearchQuery('')
      } else {
        setSearchResult(u => u ? { ...u, is_active: action === 'activate' } : u)
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

  return (
    <AccountLayout>
      <section className="section admin-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">Admin</span> – Nutzer</h1>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', maxWidth: 500 }}>
            <div className="form-field" style={{ flex: 1, margin: 0 }}>
              <input
                type="text"
                placeholder="Benutzername suchen…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? '...' : 'Suchen'}
            </button>
          </form>

          {searchError && <p style={{ color: '#e05c5c' }}>{searchError}</p>}

          {searchResult && (
            <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 500 }}>
              <h3 style={{ marginBottom: '1rem' }}>{searchResult.nickname || searchResult.username}</h3>
              {[
                ['Benutzername', searchResult.username],
                ['Nickname', searchResult.nickname],
                ['E-Mail', searchResult.email],
                ['Status', searchResult.is_active ? 'Aktiv' : 'Deaktiviert'],
                ['Admin', searchResult.is_admin ? 'Ja' : 'Nein'],
                ['Erstellt', searchResult.created_at ? new Date(searchResult.created_at).toLocaleDateString() : '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--clr-text-muted)', minWidth: 120 }}>{label}:</span>
                  <span>{value}</span>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                {searchResult.is_active
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
            </div>
          )}
        </div>
      </section>
    </AccountLayout>
  )
}
