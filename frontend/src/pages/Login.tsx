import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { authApi } from '@/api/auth'
import AccountLayout from '@/templates/layout/AccountLayout'

type Step = 'login' | '2fa'

export default function Login() {
  const { refetch } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [twoFAToken, setTwoFAToken] = useState('')

  // Login form
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [loginErrors, setLoginErrors] = useState<{ login?: string; password?: string }>({})

  // 2FA
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [deviceName, setDeviceName] = useState('')

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: { login?: string; password?: string } = {}
    if (!login) errs.login = 'Pflichtfeld'
    if (!password) errs.password = 'Pflichtfeld'
    if (Object.keys(errs).length) { setLoginErrors(errs); return }

    setLoginErrors({})
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(login, password)
      if (data.twofa && data.token) {
        setTwoFAToken(data.token)
        setStep('2fa')
      } else {
        await refetch()
        navigate('/')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Login fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  async function handle2FA() {
    if (!/^[0-9]{6}$/.test(code)) {
      setCodeError('Bitte den 6-stelligen Code eingeben.')
      return
    }
    setCodeError('')
    setLoading(true)
    try {
      await authApi.login2fa(twoFAToken, code, rememberDevice ? deviceName : undefined)
      await refetch()
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Ungültiger Code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AccountLayout>
      <section className="section auth-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">Login</span></h1>

          {step === 'login' ? (
            <form className="auth-form" onSubmit={handleLoginSubmit} noValidate>
              <div className={`form-field${loginErrors.login ? ' error' : ''}`}>
                <label>{t('auth.login.label.identifier')}</label>
                <input
                  type="text"
                  name="login"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  placeholder={t('auth.login.placeholder.identifier')}
                  required
                />
                {loginErrors.login && <span className="form-error">{loginErrors.login}</span>}
              </div>
              <div className={`form-field${loginErrors.password ? ' error' : ''}`}>
                <label>{t('auth.login.label.password')}</label>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.login.placeholder.password')}
                  required
                />
                {loginErrors.password && <span className="form-error">{loginErrors.password}</span>}
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? '...' : t('auth.login.btn')}
              </button>

              <p className="auth-switch">
                Noch kein Konto? <Link to="/register" className="accent">Registrieren</Link>
              </p>
              {error && <div className="auth-error">{error}</div>}
            </form>
          ) : (
            <div className="auth-form">
              <p style={{ marginBottom: 'var(--space-sm)', color: 'var(--clr-text-muted)' }}>
                Ein Verifizierungscode wurde an deine E-Mail gesendet.
              </p>
              <div className={`form-field${codeError ? ' error' : ''}`}>
                <label>Verifizierungscode</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handle2FA()}
                />
                {codeError && <span className="form-error">{codeError}</span>}
              </div>
              <div className="form-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.4rem' }}>
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={e => setRememberDevice(e.target.checked)}
                    style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--clr-text-muted)' }}>Gerät merken</span>
                </label>
                {rememberDevice && (
                  <input
                    type="text"
                    placeholder="Gerätename (z.B. Mein PC)"
                    value={deviceName}
                    onChange={e => setDeviceName(e.target.value)}
                    autoComplete="off"
                  />
                )}
              </div>
              <button className="btn-submit" onClick={handle2FA} disabled={loading}>
                {loading ? '...' : 'Bestätigen'}
              </button>
              {error && <div className="auth-error">{error}</div>}
            </div>
          )}
        </div>
      </section>
    </AccountLayout>
  )
}
