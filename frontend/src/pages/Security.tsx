import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/api/auth'
import AccountLayout from '@/components/layout/AccountLayout'

export default function Security() {
  const { user, refetch } = useAuth()

  // Username
  const [username, setUsername] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameSuccess, setUsernameSuccess] = useState(false)
  const [usernameError, setUsernameError] = useState('')

  // Email
  const [email, setEmail] = useState('')
  const [emailStep, setEmailStep] = useState<'form' | 'verify'>('form')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailVerifyDisplay, setEmailVerifyDisplay] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyCodeError, setVerifyCodeError] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(true)
  const [twoFASuccess, setTwoFASuccess] = useState(false)

  // Account danger
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setEmail(user.email || '')
    }
    authApi.getTrustDevices().then(d => {
      setTwoFAEnabled(d.two_fa_enabled !== false)
    }).catch(() => {})
  }, [user])

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault()
    const re = /^[a-zA-Z0-9._-]{3,30}$/
    if (!re.test(username)) {
      setUsernameError('Benutzername: nur Buchstaben, Zahlen, . _ - (3–30 Zeichen)')
      return
    }
    setUsernameError('')
    setUsernameLoading(true)
    try {
      await authApi.updateUsername(username)
      setUsernameSuccess(true)
      await refetch()
      setTimeout(() => setUsernameSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setUsernameError(msg || 'Benutzername konnte nicht gespeichert werden.')
    } finally {
      setUsernameLoading(false)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !email.includes('@')) { alert('Bitte eine gültige E-Mail eingeben.'); return }
    setEmailLoading(true)
    setEmailError('')
    try {
      const data = await authApi.changeEmail(email)
      if (data.pending) {
        setEmailVerifyDisplay(email)
        setEmailStep('verify')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setEmailError(msg || 'E-Mail konnte nicht geändert werden.')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleEmailVerify() {
    if (!/^[0-9]{6}$/.test(verifyCode)) {
      setVerifyCodeError('Bitte den 6-stelligen Code eingeben.')
      return
    }
    setVerifyCodeError('')
    setVerifyError('')
    setVerifyLoading(true)
    try {
      const data = await authApi.verifyEmailChange(verifyCode)
      if (data.email) setEmail(data.email)
      setEmailStep('form')
      setVerifyCode('')
      setEmailSuccess(true)
      await refetch()
      setTimeout(() => setEmailSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setVerifyError(msg || 'Ungültiger Code.')
    } finally {
      setVerifyLoading(false)
    }
  }

  async function handle2FAToggle(enabled: boolean) {
    setTwoFAEnabled(enabled)
    try {
      await authApi.setTrustDevices(enabled)
      setTwoFASuccess(true)
      setTimeout(() => setTwoFASuccess(false), 2000)
    } catch {
      setTwoFAEnabled(!enabled)
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!deletePassword) { setDeleteError('Passwort erforderlich'); return }
    if (!confirm('Bist du sicher? Diese Aktion ist nicht rückgängig zu machen!')) return
    setDeleteLoading(true)
    try {
      await authApi.deleteAccount(deletePassword)
      window.location.href = '/'
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setDeleteError(msg || 'Löschen fehlgeschlagen.')
      setDeleteLoading(false)
    }
  }

  return (
    <AccountLayout>
      <section className="section security-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">Sicherheit</span></h1>

          {/* Username */}
          <div className="security-block">
            <h2 className="security-block-title">Benutzername</h2>
            <form id="security-username-form" onSubmit={handleUsernameSubmit}>
              <div className="form-field">
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  id="security-username"
                />
              </div>
              {usernameError && <p className="sec-error" style={{ display: 'block' }}>{usernameError}</p>}
              <button type="submit" className="sec-btn-save" disabled={usernameLoading}>
                {usernameLoading ? '...' : 'Speichern'}
              </button>
              {usernameSuccess && <p className="sec-success" style={{ display: 'block' }}>Gespeichert!</p>}
            </form>
          </div>

          {/* Email */}
          <div className="security-block">
            <h2 className="security-block-title">E-Mail</h2>
            {emailStep === 'form' ? (
              <form id="security-email-form" onSubmit={handleEmailSubmit}>
                <div className="form-field">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    id="security-email"
                  />
                </div>
                {emailError && <p className="sec-error" style={{ display: 'block' }}>{emailError}</p>}
                <button type="submit" className="sec-btn-save" disabled={emailLoading}>
                  {emailLoading ? '...' : 'Ändern'}
                </button>
                {emailSuccess && <p className="sec-success" style={{ display: 'block' }}>E-Mail geändert!</p>}
              </form>
            ) : (
              <div id="email-verify-step">
                <p style={{ marginBottom: '1rem', color: 'var(--clr-text-muted)' }}>
                  Ein Code wurde an <strong>{emailVerifyDisplay}</strong> gesendet.
                </p>
                <div className={`form-field${verifyCodeError ? ' error' : ''}`}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEmailVerify()}
                    id="email-verify-code"
                  />
                  {verifyCodeError && <span className="form-error">{verifyCodeError}</span>}
                </div>
                {verifyError && <p className="sec-error" style={{ display: 'block' }}>{verifyError}</p>}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="sec-btn-save" onClick={handleEmailVerify} disabled={verifyLoading} id="email-verify-btn">
                    {verifyLoading ? '...' : 'Bestätigen'}
                  </button>
                  <button className="sec-btn-cancel" onClick={() => { setEmailStep('form'); setVerifyCode(''); setVerifyCodeError('') }} id="email-verify-cancel">
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2FA */}
          <div className="security-block">
            <h2 className="security-block-title">Zwei-Faktor-Authentifizierung</h2>
            <label className="sec-toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                id="two-fa-check"
                checked={twoFAEnabled}
                onChange={e => handle2FAToggle(e.target.checked)}
                style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
              />
              <span>2FA bei Login aktivieren</span>
            </label>
            {twoFASuccess && <p className="sec-success" style={{ display: 'block', marginTop: '0.5rem' }}>Gespeichert!</p>}
          </div>

          {/* Danger zone */}
          <div className="security-block security-block--danger">
            <h2 className="security-block-title">Konto löschen</h2>
            <p style={{ color: 'var(--clr-text-muted)', marginBottom: '1rem' }}>
              Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden.
            </p>
            <form onSubmit={handleDeleteAccount}>
              <div className="form-field">
                <label>Passwort bestätigen</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Dein aktuelles Passwort"
                />
              </div>
              {deleteError && <p className="sec-error" style={{ display: 'block' }}>{deleteError}</p>}
              <button type="submit" className="sec-btn-danger" disabled={deleteLoading}>
                {deleteLoading ? '...' : 'Konto löschen'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </AccountLayout>
  )
}
