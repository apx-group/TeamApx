import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'
import { applyApi } from '@/api/badges'
import AccountLayout from '@/components/layout/AccountLayout'

export default function Apply() {
  const { t } = useI18n()
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', age: '', discord: '', game: 'Rainbow Six Siege',
    rank: '', attacker_role: '', defender_role: '',
    experience: '', motivation: '', availability: '',
  })

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await applyApi.submit(form)
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Bewerbung konnte nicht gesendet werden.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AccountLayout>
        <section className="section apply-section">
          <div className="container">
            <div className="apply-success">
              <h2>{t('apply.success.title')}</h2>
              <p>{t('apply.success.text')}</p>
              <Link to="/" className="btn btn-primary">{t('apply.success.btn')}</Link>
            </div>
          </div>
        </section>
      </AccountLayout>
    )
  }

  return (
    <AccountLayout>
      <section className="section apply-section">
        <div className="container">
          <h1 className="section-title">
            {/* eslint-disable-next-line react/no-danger */}
            Bewirb dich <span className="accent">jetzt</span>
          </h1>
          <p className="section-subtitle">{t('apply.subtitle')}</p>

          <form className="apply-form" onSubmit={handleSubmit} noValidate>
            <fieldset className="apply-fieldset">
              <legend>{t('apply.legend.personal')}</legend>

              <div className="form-field">
                <label>{t('apply.label.name')}</label>
                <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Dein Name oder Nickname" required />
              </div>
              <div className="form-field">
                <label>{t('apply.label.age')}</label>
                <input type="text" value={form.age} onChange={e => setField('age', e.target.value)} placeholder="Dein Alter" required />
              </div>
              <div className="form-field">
                <label>{t('apply.label.discord')}</label>
                <input type="text" value={form.discord} onChange={e => setField('discord', e.target.value)} placeholder="z.B. username" required />
              </div>
            </fieldset>

            <fieldset className="apply-fieldset">
              <legend>{t('apply.legend.gaming')}</legend>

              <div className="form-field">
                <label>{t('apply.label.game')}</label>
                <select value={form.game} onChange={e => setField('game', e.target.value)} required>
                  <option value="">{t('apply.option.selectgame')}</option>
                  <option value="Rainbow Six Siege">Rainbow Six Siege</option>
                  <option value="Assetto Corsa Competizione">Assetto Corsa Competizione</option>
                  <option value="">{t('apply.option.other')}</option>
                </select>
              </div>
              <div className="form-field">
                <label>{t('apply.label.rank')}</label>
                <input type="text" value={form.rank} onChange={e => setField('rank', e.target.value)} placeholder="z.B. Diamond, Champion" />
              </div>
              <div className="form-field">
                <label>{t('apply.label.attackerRole')}</label>
                <input type="text" value={form.attacker_role} onChange={e => setField('attacker_role', e.target.value)} placeholder="Bis zu 3 wählen" />
              </div>
              <div className="form-field">
                <label>{t('apply.label.defenderRole')}</label>
                <input type="text" value={form.defender_role} onChange={e => setField('defender_role', e.target.value)} placeholder="Bis zu 3 wählen" />
              </div>
              <div className="form-field">
                <label>{t('apply.label.experience')}</label>
                <select value={form.experience} onChange={e => setField('experience', e.target.value)} required>
                  <option value="">{t('apply.option.howmuch')}</option>
                  <option value="beginner">{t('apply.option.beginner')}</option>
                  <option value="intermediate">{t('apply.option.intermediate')}</option>
                  <option value="advanced">{t('apply.option.advanced')}</option>
                  <option value="pro">{t('apply.option.pro')}</option>
                </select>
              </div>
            </fieldset>

            <fieldset className="apply-fieldset">
              <legend>{t('apply.legend.motivation')}</legend>

              <div className="form-field">
                <label>{t('apply.label.motivation')}</label>
                <textarea
                  value={form.motivation}
                  onChange={e => setField('motivation', e.target.value)}
                  placeholder="Erzähl uns, warum du zum Team passt..."
                  rows={5}
                  required
                />
              </div>
              <div className="form-field">
                <label>{t('apply.label.availability')}</label>
                <input type="text" value={form.availability} onChange={e => setField('availability', e.target.value)} placeholder="z.B. Mo-Fr abends, Wochenende flexibel" />
              </div>
            </fieldset>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
              {loading ? '...' : t('apply.btn.submit')}
            </button>
          </form>
        </div>
      </section>
    </AccountLayout>
  )
}
