import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { authApi } from '@/api/auth'
import AccountLayout from '@/templates/layout/AccountLayout'
import CustomCheckbox from '@/components/CustomCheckbox'
import '@/styles/security.css'

interface DeviceItem {
  token: string
  device_name: string
  is_current: boolean
  location?: string
  created_at?: string
}

export default function Security() {
  const { user, refetch } = useAuth()
  const { t } = useI18n()

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

  // Trusted Devices
  const [devices, setDevices] = useState<DeviceItem[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)

  // Overlays
  const [showDeactivateOverlay, setShowDeactivateOverlay] = useState(false)
  const [showDevicesOverlay, setShowDevicesOverlay] = useState(false)

  // Account danger
  const [deleteUsername, setDeleteUsername] = useState('')
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
      setUsernameError(t('security.username.error.format'))
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
      setUsernameError(msg || t('security.username.error.save'))
    } finally {
      setUsernameLoading(false)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !email.includes('@')) { alert(t('security.email.invalid')); return }
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
      setEmailError(msg || t('security.email.error.save'))
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleEmailVerify() {
    if (!/^[0-9]{6}$/.test(verifyCode)) {
      setVerifyCodeError(t('security.email.verify.code.error'))
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
      setVerifyError(msg || t('security.email.verify.invalid'))
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

  async function loadDevices() {
    setDevicesLoading(true)
    try {
      const d = await authApi.getDevices()
      setDevices((d.devices as unknown as DeviceItem[]) || [])
    } catch {}
    finally { setDevicesLoading(false) }
  }

  async function handleDeactivate() {
    setShowDeactivateOverlay(false)
    try {
      await authApi.deactivateAccount()
      window.location.href = '/'
    } catch {
      alert(t('security.deactivate.error'))
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    setDeleteError('')
    if (!deleteUsername) { setDeleteError(t('security.delete.error.usernameRequired')); return }
    if (deleteUsername !== user?.username) { setDeleteError(t('security.delete.error.usernameMismatch')); return }
    if (!deletePassword) { setDeleteError(t('security.delete.error.passwordRequired')); return }
    setDeleteLoading(true)
    try {
      await authApi.deleteAccount(deleteUsername, deletePassword)
      window.location.href = '/'
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setDeleteError(msg || t('security.delete.error.failed'))
      setDeleteLoading(false)
    }
  }

  return (
    <AccountLayout>
      <div className="sec-wrap">

        <h1 className="sec-page-title"><span className="accent">{t('security.title')}</span></h1>

        {/* Username */}
        <div className="sec-card">
          <h2 className="sec-card-title">{t('security.username.title')}</h2>
          <form onSubmit={handleUsernameSubmit}>
            <div className="form-field">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                id="security-username"
              />
            </div>
            {usernameError && <p className="sec-error">{usernameError}</p>}
            {usernameSuccess && <p className="sec-success">{t('security.saved')}</p>}
            <button type="submit" className="sec-btn-save" disabled={usernameLoading}>
              {usernameLoading ? '...' : t('security.btn.save')}
            </button>
          </form>
        </div>

        {/* Email */}
        <div className="sec-card">
          <h2 className="sec-card-title">{t('security.email.title')}</h2>
          {emailStep === 'form' ? (
            <form onSubmit={handleEmailSubmit}>
              <div className="form-field">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  id="security-email"
                />
              </div>
              {emailError && <p className="sec-error">{emailError}</p>}
              {emailSuccess && <p className="sec-success">{t('security.saved')}</p>}
              <button type="submit" className="sec-btn-save" disabled={emailLoading}>
                {emailLoading ? '...' : t('security.email.change.btn')}
              </button>
            </form>
          ) : (
            <div>
              <p className="sec-verify-info">
                {t('security.email.verify.info.pre')} <strong>{emailVerifyDisplay}</strong> {t('security.email.verify.info.post')}
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
              {verifyError && <p className="sec-error">{verifyError}</p>}
              <div className="sec-verify-actions">
                <button className="sec-btn-save" onClick={handleEmailVerify} disabled={verifyLoading} id="email-verify-btn">
                  {verifyLoading ? '...' : t('security.email.verify.btn')}
                </button>
                <button className="sec-btn-cancel" onClick={() => { setEmailStep('form'); setVerifyCode(''); setVerifyCodeError('') }} id="email-verify-cancel">
                  {t('security.email.verify.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2FA */}
        <div className="sec-card">
          <h2 className="sec-card-title">{t('security.2fa.title')}</h2>
          <CustomCheckbox
            id="two-fa-check"
            checked={twoFAEnabled}
            onChange={handle2FAToggle}
            label={t('security.2fa.label')}
          />
          {twoFASuccess && <p className="sec-success" style={{ marginTop: 'var(--space-sm)' }}>{t('security.saved')}</p>}
        </div>

        {/* Trusted Devices */}
        <div className="sec-card">
          <h2 className="sec-card-title">{t('security.devices.title')}</h2>
          <button className="sec-btn-save" onClick={() => { loadDevices(); setShowDevicesOverlay(true) }}>
            {t('security.devices.manage')}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="sec-card sec-card--danger">
          <h2 className="sec-danger-zone-title">{t('security.danger.title')}</h2>

          {/* Deactivate */}
          <div className="sec-danger-block">
            <p className="sec-danger-sub">{t('security.deactivate.heading')}</p>
            <p className="sec-danger-desc">{t('security.deactivate.desc')}</p>
            <button className="sec-btn-danger" type="button" onClick={() => setShowDeactivateOverlay(true)}>
              {t('security.deactivate.btn')}
            </button>
          </div>

          {/* Delete */}
          <div className="sec-danger-block">
            <p className="sec-danger-sub">{t('security.delete.heading')}</p>
            <p className="sec-danger-desc">{t('security.delete.desc')}</p>
            <form onSubmit={handleDeleteAccount}>
              <div className="form-field">
                <label>{t('security.delete.label.username')}</label>
                <input
                  type="text"
                  value={deleteUsername}
                  onChange={e => setDeleteUsername(e.target.value)}
                  placeholder={user?.username || t('security.overlay.label.username')}
                />
              </div>
              <div className="form-field">
                <label>{t('security.delete.label.password')}</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder={t('security.delete.placeholder.password')}
                />
              </div>
              {deleteError && <p className="sec-error">{deleteError}</p>}
              <button type="submit" className="sec-btn-danger" disabled={deleteLoading}>
                {deleteLoading ? '...' : t('security.delete.btn')}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Deactivate overlay */}
      {showDeactivateOverlay && (
        <div className="logout-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowDeactivateOverlay(false) }}>
          <div className="logout-overlay__box">
            <p className="logout-overlay__text">{t('security.deactivate.confirm')}</p>
            <div className="logout-overlay__actions">
              <button className="btn btn-outline" onClick={() => setShowDeactivateOverlay(false)}>{t('security.deactivate.cancel')}</button>
              <button className="btn btn-primary" onClick={handleDeactivate}>{t('security.deactivate.do')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Devices overlay */}
      {showDevicesOverlay && (
        <div className="logout-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowDevicesOverlay(false) }}>
          <div className="logout-overlay__box devices-overlay-box">
            <button
              onClick={() => setShowDevicesOverlay(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--clr-text-muted)' }}
            >&times;</button>
            <h3 style={{ marginBottom: '1rem' }}>{t('security.devices.title')}</h3>
            {devicesLoading && <p>{t('security.devices.loading')}</p>}
            {!devicesLoading && devices.length === 0 && <p className="devices-empty">{t('security.devices.empty')}</p>}
            {devices.map(d => (
              <div key={d.token} className="trusted-device-item">
                <div className="trusted-device-info">
                  <span className="trusted-device-name">
                    {d.device_name}
                    {d.is_current && <span className="trusted-device-current">{t('security.devices.current')}</span>}
                  </span>
                  {d.created_at && <span className="trusted-device-date">{d.created_at.slice(0, 10)}</span>}
                </div>
                <button
                  className="trusted-device-remove"
                  onClick={async () => {
                    try { await authApi.removeDevice(d.token); loadDevices() } catch {}
                  }}
                >&times;</button>
              </div>
            ))}
          </div>
        </div>
      )}

    </AccountLayout>
  )
}
