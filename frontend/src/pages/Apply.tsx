import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'
import { applyApi } from '@/api/badges'
import AccountLayout from '@/templates/layout/AccountLayout'

interface IconSelectOption { value: string; label: string; icon?: string }

function IconSelect({ value, options, onChange, placeholder }: {
  value: string
  options: IconSelectOption[]
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={ref} className={`custom-select${open ? ' open' : ''}`}>
      <button
        type="button"
        className={`custom-select-trigger${value ? ' has-value' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="custom-select-text">
          {selected?.icon && <img className="custom-select-icon" src={selected.icon} alt="" />}
          {selected?.label || placeholder}
        </span>
        <span className="custom-select-arrow">▾</span>
      </button>
      <div className="custom-select-options">
        {options.map(opt => (
          <div
            key={opt.value}
            className={`custom-select-option${opt.value === value ? ' selected' : ''}`}
            onClick={() => { onChange(opt.value); setOpen(false) }}
          >
            {opt.icon && <img className="custom-select-icon" src={opt.icon} alt="" />}
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  )
}

const RANKS = ['Champion', 'Diamond', 'Emerald', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Copper']
const ATTACKER_ROLES = ['Entry Frag', 'Second-Entry', 'Breach', 'Support', 'Intel', 'Anti-Gadget', 'Flex']
const DEFENDER_ROLES = ['Anti-Entry', 'Anti-Gadget', 'Intel', 'Roamer/Lurker', 'Flex', 'Support', 'Crowd Control', 'Trapper']

export default function Apply() {
  const { t } = useI18n()

  const GAMES: IconSelectOption[] = [
    { value: 'Rainbow Six Siege', label: 'Rainbow Six Siege', icon: '/icons/SIEGE.png' },
    { value: 'Assetto Corsa Competizione', label: 'Assetto Corsa Competizione', icon: '/icons/ACC.png' },
    { value: 'other', label: t('apply.option.sonstige') },
  ]

  const RANK_OPTIONS: IconSelectOption[] = [
    { value: '', label: t('apply.option.selectRank') },
    ...RANKS.map(r => ({ value: r, label: r, icon: `/icons/S_${r.toUpperCase()}.png` })),
  ]

  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    name: '', age: '', discord: '', game: 'Rainbow Six Siege',
    rank: '', attacker_role: [] as string[], defender_role: [] as string[],
    experience: '', motivation: '', availability: '',
  })

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleRole(field: 'attacker_role' | 'defender_role', role: string) {
    setForm(f => {
      const current = f[field]
      if (current.includes(role)) {
        return { ...f, [field]: current.filter(r => r !== role) }
      }
      if (current.length >= 3) return f
      return { ...f, [field]: [...current, role] }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const errors: Record<string, string> = {}

    if (!form.name.trim()) {
      errors.name = t('apply.error.required')
    } else if (form.name.trim().length > 20) {
      errors.name = t('apply.error.nameTooLong')
    }

    const age = parseInt(form.age, 10)
    if (!form.age.trim()) {
      errors.age = t('apply.error.required')
    } else if (isNaN(age) || age < 13 || age > 30) {
      errors.age = t('apply.error.ageInvalid')
    }

    if (!form.discord.trim()) {
      errors.discord = t('apply.error.required')
    } else if (form.discord.trim().length < 2 || form.discord.trim().length > 20) {
      errors.discord = t('apply.error.discordLength')
    }

    if (!form.game) errors.game = t('apply.error.required')
    if (!form.rank) errors.rank = t('apply.error.required')

    if (form.attacker_role.length === 0) {
      errors.attacker_role = t('apply.error.roleMin')
    }
    if (form.defender_role.length === 0) {
      errors.defender_role = t('apply.error.roleMin')
    }

    if (!form.experience) errors.experience = t('apply.error.required')
    if (!form.motivation.trim()) errors.motivation = t('apply.error.required')

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setTimeout(() => {
        const firstErr = document.querySelector('.form-field.error')
        firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }

    setLoading(true)
    try {
      await applyApi.submit({
        ...form,
        age,
        attacker_role: form.attacker_role.join(', '),
        defender_role: form.defender_role.join(', '),
      })
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || t('apply.error.submit'))
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
              <span style={{ fontSize: '3rem', color: 'var(--clr-accent)' }}>&#10003;</span>
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
          <h1 className="section-title"><span className="accent">{t('apply.title')}</span></h1>
          <p className="section-subtitle">{t('apply.subtitle')}</p>

          <form className="apply-form" onSubmit={handleSubmit} noValidate>
            <fieldset className="apply-fieldset">
              <legend>{t('apply.legend.personal')}</legend>

              <div className={`form-field${fieldErrors.name ? ' error' : ''}`}>
                <label>{t('apply.label.name')}</label>
                <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder={t('apply.placeholder.name')} maxLength={20} required />
                {fieldErrors.name && <span className="form-error">{fieldErrors.name}</span>}
              </div>
              <div className={`form-field${fieldErrors.age ? ' error' : ''}`}>
                <label>{t('apply.label.age')}</label>
                <input type="text" value={form.age} onChange={e => setField('age', e.target.value)} placeholder={t('apply.placeholder.age')} required />
                {fieldErrors.age && <span className="form-error">{fieldErrors.age}</span>}
              </div>
              <div className={`form-field${fieldErrors.discord ? ' error' : ''}`}>
                <label>{t('apply.label.discord')}</label>
                <input type="text" value={form.discord} onChange={e => setField('discord', e.target.value)} placeholder={t('apply.placeholder.discord')} maxLength={20} required />
                {fieldErrors.discord && <span className="form-error">{fieldErrors.discord}</span>}
              </div>
            </fieldset>

            <fieldset className="apply-fieldset">
              <legend>{t('apply.legend.gaming')}</legend>

              <div className={`form-field${fieldErrors.game ? ' error' : ''}`}>
                <label>{t('apply.label.game')}</label>
                <IconSelect
                  value={form.game}
                  options={GAMES}
                  onChange={v => setField('game', v)}
                />
                {fieldErrors.game && <span className="form-error">{fieldErrors.game}</span>}
              </div>

              <div className={`form-field${fieldErrors.rank ? ' error' : ''}`}>
                <label>{t('apply.label.rank')}</label>
                <IconSelect
                  value={form.rank}
                  options={RANK_OPTIONS}
                  onChange={v => setField('rank', v)}
                  placeholder={t('apply.option.selectRank')}
                />
                {fieldErrors.rank && <span className="form-error">{fieldErrors.rank}</span>}
              </div>

              <div className={`form-field${fieldErrors.attacker_role ? ' error' : ''}`}>
                <label>{t('apply.label.attackerRole')} <span style={{ color: 'var(--clr-text-muted)', fontWeight: 400, fontSize: 'var(--fs-sm)' }}>(min. 1, max. 3)</span></label>
                <div className="role-checkboxes">
                  {ATTACKER_ROLES.map(role => (
                    <label key={role} className={`role-checkbox${form.attacker_role.includes(role) ? ' selected' : ''}${!form.attacker_role.includes(role) && form.attacker_role.length >= 3 ? ' disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={form.attacker_role.includes(role)}
                        onChange={() => toggleRole('attacker_role', role)}
                        disabled={!form.attacker_role.includes(role) && form.attacker_role.length >= 3}
                      />
                      {role}
                    </label>
                  ))}
                </div>
                {fieldErrors.attacker_role && <span className="form-error">{fieldErrors.attacker_role}</span>}
              </div>

              <div className={`form-field${fieldErrors.defender_role ? ' error' : ''}`}>
                <label>{t('apply.label.defenderRole')} <span style={{ color: 'var(--clr-text-muted)', fontWeight: 400, fontSize: 'var(--fs-sm)' }}>(min. 1, max. 3)</span></label>
                <div className="role-checkboxes">
                  {DEFENDER_ROLES.map(role => (
                    <label key={role} className={`role-checkbox${form.defender_role.includes(role) ? ' selected' : ''}${!form.defender_role.includes(role) && form.defender_role.length >= 3 ? ' disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={form.defender_role.includes(role)}
                        onChange={() => toggleRole('defender_role', role)}
                        disabled={!form.defender_role.includes(role) && form.defender_role.length >= 3}
                      />
                      {role}
                    </label>
                  ))}
                </div>
                {fieldErrors.defender_role && <span className="form-error">{fieldErrors.defender_role}</span>}
              </div>

              <div className={`form-field${fieldErrors.experience ? ' error' : ''}`}>
                <label>{t('apply.label.experience')}</label>
                <select value={form.experience} onChange={e => setField('experience', e.target.value)} required>
                  <option value="" disabled>{t('apply.option.selectExperience')}</option>
                  <option value="beginner">{t('apply.option.beginner')}</option>
                  <option value="intermediate">{t('apply.option.intermediate')}</option>
                  <option value="advanced">{t('apply.option.advanced')}</option>
                  <option value="pro">{t('apply.option.pro')}</option>
                </select>
                {fieldErrors.experience && <span className="form-error">{fieldErrors.experience}</span>}
              </div>
            </fieldset>

            <fieldset className="apply-fieldset">
              <legend>{t('apply.legend.motivation')}</legend>

              <div className={`form-field${fieldErrors.motivation ? ' error' : ''}`}>
                <label>{t('apply.label.motivation')}</label>
                <textarea
                  value={form.motivation}
                  onChange={e => setField('motivation', e.target.value)}
                  placeholder={t('apply.placeholder.motivation')}
                  rows={5}
                  required
                />
                {fieldErrors.motivation && <span className="form-error">{fieldErrors.motivation}</span>}
              </div>
              <div className="form-field">
                <label>{t('apply.label.availability')}</label>
                <input type="text" value={form.availability} onChange={e => setField('availability', e.target.value)} placeholder={t('apply.placeholder.availability')} />
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
