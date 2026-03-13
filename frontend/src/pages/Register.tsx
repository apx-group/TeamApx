import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { authApi } from '@/api/auth'
import AccountLayout from '@/templates/layout/AccountLayout'

type Step = 'register' | 'verify'

export default function Register() {
  const { refetch } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('register')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')

  const [form, setForm] = useState({ username: '', nickname: '', email: '', password: '', confirm_password: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Verify step
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [verifyError, setVerifyError] = useState('')

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setFormErrors(e => ({ ...e, [field]: '' }))
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const usernameRe = /^[a-zA-Z0-9._-]{3,30}$/

    if (!form.username) errs.username = 'Pflichtfeld'
    else if (!usernameRe.test(form.username)) errs.username = 'Nur Buchstaben, Zahlen, . _ - (3–30 Zeichen)'
    if (!form.email) errs.email = 'Pflichtfeld'
    if (!form.password || form.password.length < 8) errs.password = 'Mindestens 8 Zeichen'
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwörter stimmen nicht überein'

    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setFormErrors({})
    setError('')
    setLoading(true)
    try {
      const data = await authApi.register({
        username: form.username,
        nickname: form.nickname || undefined,
        email: form.email,
        password: form.password,
        confirm_password: form.confirm_password,
      })
      if (data.pending) {
        setPendingEmail(form.email)
        setStep('verify')
      } else {
        await refetch()
        navigate('/')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Registrierung fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!/^[0-9]{6}$/.test(code)) {
      setCodeError('Bitte gib den 6-stelligen Code ein.')
      return
    }
    setCodeError('')
    setVerifyError('')
    setLoading(true)
    try {
      await authApi.verifyEmail(pendingEmail, code)
      await refetch()
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setVerifyError(msg || 'Ungültiger Code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AccountLayout>
      <section className="section auth-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">Registrieren</span></h1>

          {step === 'register' ? (
            <form className="auth-form" onSubmit={handleRegisterSubmit} noValidate>
              {(
                [
                  { name: 'username', label: t('auth.register.label.username'), type: 'text', placeholder: 'Benutzername' },
                  { name: 'nickname', label: `${t('auth.register.label.nickname')} (optional)`, type: 'text', placeholder: 'Anzeigename' },
                  { name: 'email', label: t('auth.register.label.email'), type: 'email', placeholder: 'E-Mail Adresse' },
                  { name: 'password', label: t('auth.register.label.password'), type: 'password', placeholder: 'Min. 8 Zeichen' },
                  { name: 'confirm_password', label: t('auth.register.label.confirm'), type: 'password', placeholder: 'Passwort wiederholen' },
                ] as const
              ).map(field => (
                <div key={field.name} className={`form-field${formErrors[field.name] ? ' error' : ''}`}>
                  <label>{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.name]}
                    onChange={e => setField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                  {formErrors[field.name] && <span className="form-error">{formErrors[field.name]}</span>}
                </div>
              ))}

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? '...' : t('auth.register.btn')}
              </button>

              <p className="auth-switch">
                Bereits ein Konto? <Link to="/login" className="accent">Einloggen</Link>
              </p>
              {error && <div className="auth-error">{error}</div>}
            </form>
          ) : (
            <div className="auth-form">
              <p className="verify-info">
                Ein 6-stelliger Code wurde an <strong>{pendingEmail}</strong> gesendet.<br />
                Bitte prüfe dein Postfach (auch den Spam-Ordner).
              </p>
              <div className={`form-field${codeError ? ' error' : ''}`}>
                <label>Verifizierungscode</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                />
                {codeError && <span className="form-error">{codeError}</span>}
              </div>
              <button className="btn-submit" onClick={handleVerify} disabled={loading}>
                {loading ? '...' : 'Code bestätigen'}
              </button>
              <p className="auth-switch">
                Kein Code erhalten?{' '}
                <button
                  className="accent"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0 }}
                  onClick={() => { setStep('register'); setCode(''); setCodeError('') }}
                >
                  Erneut senden
                </button>
              </p>
              {verifyError && <div className="auth-error">{verifyError}</div>}
            </div>
          )}
        </div>
      </section>
    </AccountLayout>
  )
}
