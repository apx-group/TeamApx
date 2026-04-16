import { useEffect, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { adminEventsApi } from '@/api/events'
import type { Event } from '@/types'
import AccountLayout from '@/templates/layout/AccountLayout'

const STATUS_OPTIONS = ['upcoming', 'live', 'past'] as const

export default function AdminEvents() {
  const { t } = useI18n()
  const [events, setEvents] = useState<Event[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<Event> | null>(null)
  const [isNew, setIsNew] = useState(false)

  async function load() {
    try {
      const data = await adminEventsApi.getEvents()
      setEvents(data.events || [])
    } catch {
      setError(t('admin.accessDenied'))
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  function openNew() {
    setEditing({
      name: '',
      status: 'upcoming',
      date: '',
      duration_de: '',
      duration_en: '',
      description_de: '',
      description_en: '',
      max_participants: 0,
    })
    setIsNew(true)
  }

  function openEdit(ev: Event) {
    setEditing({ ...ev })
    setIsNew(false)
  }

  async function save() {
    if (!editing) return
    try {
      if (isNew) {
        await adminEventsApi.createEvent(editing)
      } else {
        await adminEventsApi.updateEvent(editing)
      }
      setEditing(null)
      load()
    } catch {
      alert(t('admin.saveError'))
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm(t('admin.events.confirmDelete'))) return
    try {
      await adminEventsApi.deleteEvent(id)
      load()
    } catch {
      alert(t('admin.saveError'))
    }
  }

  function setField(field: keyof Event, value: string | number | boolean) {
    setEditing(e => e ? { ...e, [field]: value } : e)
  }

  return (
    <AccountLayout>
      <section className="section admin-section">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h1 className="section-title" style={{ marginBottom: 0 }}>
              <span className="accent">{t('admin.events.title')}</span>
            </h1>
            <button className="btn btn-primary" onClick={openNew}>{t('admin.add')}</button>
          </div>

          {error && <p style={{ color: '#e05c5c' }}>{error}</p>}

          <div className="admin-table">
            {events.length === 0 && !error && (
              <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{t('admin.events.empty')}</p>
            )}
            {events.map(ev => (
              <div
                key={ev.id}
                style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem 1rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}
              >
                <span style={{ flex: 1, fontWeight: 600 }}>{ev.name}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{ev.date}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)', textTransform: 'uppercase' }}>{ev.status}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>
                  {ev.participant_count}{ev.max_participants > 0 ? ` / ${ev.max_participants}` : ''} {t('admin.events.participants')}
                </span>
                <button
                  className="btn btn-outline"
                  style={{ padding: '0.3rem 0.75rem', fontSize: 'var(--fs-sm)' }}
                  onClick={() => openEdit(ev)}
                >
                  {t('admin.edit')}
                </button>
                <button
                  style={{ background: 'none', border: '1px solid #e05c5c', color: '#e05c5c', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: 'var(--fs-sm)' }}
                  onClick={() => deleteEvent(ev.id)}
                >
                  {t('admin.delete')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 520, width: '90%', maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>
              {isNew ? t('admin.events.addEvent') : t('admin.events.editEvent')}
            </h3>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('admin.events.field.name')}</label>
              <input type="text" value={editing.name || ''} onChange={e => setField('name', e.target.value)} />
            </div>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('admin.events.field.date')}</label>
              <input type="date" value={editing.date || ''} onChange={e => setField('date', e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('admin.events.field.status')}</label>
              <select value={editing.status || 'upcoming'} onChange={e => setField('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('admin.events.field.durationDe')}</label>
              <input type="text" value={editing.duration_de || ''} onChange={e => setField('duration_de', e.target.value)} placeholder="25. Mär – 26. Mär 2026" />
            </div>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('admin.events.field.durationEn')}</label>
              <input type="text" value={editing.duration_en || ''} onChange={e => setField('duration_en', e.target.value)} placeholder="Mar 25 – Mar 26, 2026" />
            </div>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('admin.events.field.descriptionDe')}</label>
              <textarea
                rows={3}
                value={editing.description_de || ''}
                onChange={e => setField('description_de', e.target.value)}
                style={{ width: '100%', background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.5rem 0.75rem', resize: 'vertical', fontFamily: 'inherit', fontSize: 'var(--fs-base)' }}
              />
            </div>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('admin.events.field.descriptionEn')}</label>
              <textarea
                rows={3}
                value={editing.description_en || ''}
                onChange={e => setField('description_en', e.target.value)}
                style={{ width: '100%', background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.5rem 0.75rem', resize: 'vertical', fontFamily: 'inherit', fontSize: 'var(--fs-base)' }}
              />
            </div>

            <div className="form-field" style={{ marginBottom: '1rem' }}>
              <label>{t('admin.events.field.maxParticipants')}</label>
              <input
                type="number"
                min={0}
                value={editing.max_participants ?? 0}
                onChange={e => setField('max_participants', parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={save}>{t('admin.save')}</button>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
