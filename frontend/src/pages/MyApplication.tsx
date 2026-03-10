import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'
import { authApi } from '@/api/auth'
import AccountLayout from '@/components/layout/AccountLayout'

interface AppData {
  id?: number
  name?: string
  age?: string
  discord?: string
  game?: string
  rank?: string
  attacker_role?: string
  defender_role?: string
  experience?: string
  motivation?: string
  availability?: string
  status?: 'pending' | 'accepted' | 'rejected'
  created_at?: string
}

export default function MyApplication() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [app, setApp] = useState<AppData | null>(null)
  const [notLoggedIn, setNotLoggedIn] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    authApi.getMyApplication()
      .then(d => setApp(d.application || null))
      .catch((err) => {
        if (err?.response?.status === 401) setNotLoggedIn(true)
        else setApp(null)
      })
      .finally(() => setLoading(false))
  }, [])

  function setField(field: string, value: string) {
    setApp(a => a ? { ...a, [field]: value } : a)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!app) return
    setSaveLoading(true)
    setSaveSuccess(false)
    setSaveError('')
    try {
      await authApi.saveMyApplication({
        name: app.name || '',
        age: app.age || '',
        discord: app.discord || '',
        game: app.game || '',
        rank: app.rank || '',
        attacker_role: app.attacker_role || '',
        defender_role: app.defender_role || '',
        experience: app.experience || '',
        motivation: app.motivation || '',
        availability: app.availability || '',
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError(t('myapp.saveFailed'))
    } finally {
      setSaveLoading(false)
    }
  }

  function statusLabel(status?: string) {
    if (status === 'accepted') return t('myapp.status.accepted')
    if (status === 'rejected') return t('myapp.status.rejected')
    return t('myapp.status.pending')
  }

  function statusClass(status?: string) {
    if (status === 'accepted') return 'status-accepted'
    if (status === 'rejected') return 'status-rejected'
    return 'status-pending'
  }

  return (
    <AccountLayout>
      <section className="section my-application-section">
        <div className="container">
          <h1 className="section-title">
            Meine <span className="accent">Bewerbung</span>
          </h1>

          {loading && <p style={{ color: 'var(--clr-text-muted)' }}>{t('myapp.loading')}</p>}

          {!loading && notLoggedIn && (
            <div>
              <p style={{ color: 'var(--clr-text-muted)', marginBottom: '1rem' }}>{t('myapp.loginRequired')}</p>
              <Link to="/login" className="btn btn-primary">{t('myapp.goToLogin')}</Link>
            </div>
          )}

          {!loading && !notLoggedIn && !app && (
            <div>
              <p style={{ color: 'var(--clr-text-muted)', marginBottom: '1rem' }}>{t('myapp.empty')}</p>
              <Link to="/apply" className="btn btn-primary">Jetzt bewerben</Link>
            </div>
          )}

          {!loading && !notLoggedIn && app && (
            <form onSubmit={handleSave} className="apply-form">
              {app.status && (
                <div className={`application-status ${statusClass(app.status)}`} style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--clr-bg-card)' }}>
                  <strong>Status:</strong> {statusLabel(app.status)}
                  {app.created_at && (
                    <span style={{ marginLeft: '1rem', color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>
                      {t('myapp.received')} {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              <fieldset className="apply-fieldset">
                <legend>{t('myapp.legend.personal') || 'Persönliche Infos'}</legend>
                <div className="form-field">
                  <label>{t('myapp.label.name')}</label>
                  <input type="text" value={app.name || ''} onChange={e => setField('name', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>{t('myapp.label.age')}</label>
                  <input type="text" value={app.age || ''} onChange={e => setField('age', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>{t('myapp.label.discord')}</label>
                  <input type="text" value={app.discord || ''} onChange={e => setField('discord', e.target.value)} />
                </div>
              </fieldset>

              <fieldset className="apply-fieldset">
                <legend>{t('myapp.legend.gaming') || 'Gaming'}</legend>
                <div className="form-field">
                  <label>{t('myapp.label.game')}</label>
                  <input type="text" value={app.game || ''} onChange={e => setField('game', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>{t('myapp.label.rank')}</label>
                  <input type="text" value={app.rank || ''} onChange={e => setField('rank', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>{t('myapp.label.attackerRole')}</label>
                  <input type="text" value={app.attacker_role || ''} onChange={e => setField('attacker_role', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>{t('myapp.label.defenderRole')}</label>
                  <input type="text" value={app.defender_role || ''} onChange={e => setField('defender_role', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>{t('myapp.label.experience')}</label>
                  <input type="text" value={app.experience || ''} onChange={e => setField('experience', e.target.value)} />
                </div>
              </fieldset>

              <fieldset className="apply-fieldset">
                <legend>{t('myapp.legend.motivation') || 'Motivation'}</legend>
                <div className="form-field">
                  <label>{t('myapp.label.motivation')}</label>
                  <textarea value={app.motivation || ''} onChange={e => setField('motivation', e.target.value)} rows={5} />
                </div>
                <div className="form-field">
                  <label>{t('myapp.label.availability')}</label>
                  <input type="text" value={app.availability || ''} onChange={e => setField('availability', e.target.value)} />
                </div>
              </fieldset>

              {saveError && <p style={{ color: 'var(--clr-accent)', marginBottom: '0.5rem' }}>{saveError}</p>}
              {saveSuccess && <p style={{ color: 'green', marginBottom: '0.5rem' }}>{t('myapp.saveSuccess')}</p>}
              <button type="submit" className="btn btn-primary" disabled={saveLoading}>
                {saveLoading ? '...' : t('myapp.btn.save')}
              </button>
            </form>
          )}
        </div>
      </section>
    </AccountLayout>
  )
}
