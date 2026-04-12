import { useEffect, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { adminLogApi, type LogEntry } from '@/api/log'
import AccountLayout from '@/templates/layout/AccountLayout'
import '@/styles/log.css'

interface EditState {
  title: string
  body: string
  log_date: string
}

export default function AdminLog() {
  const { t, lang } = useI18n()
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState>({ title: '', body: '', log_date: '' })
  const [error, setError] = useState('')

  // New entry form
  const [showNew, setShowNew] = useState(false)
  const [newState, setNewState] = useState<EditState>({ title: '', body: '', log_date: new Date().toISOString().slice(0, 10) })

  async function loadEntries() {
    try {
      const d = await adminLogApi.getEntries()
      setEntries(d.entries || [])
    } catch {
      setError(t('admin.accessDenied'))
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries()
  }, [])

  function startEdit(entry: LogEntry) {
    setEditingId(entry.id)
    setEditState({ title: entry.title, body: entry.body, log_date: entry.log_date })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: number) {
    try {
      await adminLogApi.updateEntry(id, editState)
      setEditingId(null)
      loadEntries()
    } catch {
      setError('Fehler beim Speichern')
    }
  }

  async function deleteEntry(id: number) {
    try {
      await adminLogApi.deleteEntry(id)
      loadEntries()
    } catch {
      setError('Fehler beim Löschen')
    }
  }

  async function createEntry() {
    try {
      await adminLogApi.createEntry(newState)
      setShowNew(false)
      setNewState({ title: '', body: '', log_date: new Date().toISOString().slice(0, 10) })
      loadEntries()
    } catch {
      setError('Fehler beim Erstellen')
    }
  }

  function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const locale = lang === 'de' ? 'de-DE' : 'en-US'
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <AccountLayout>
      <section className="section">
        <div className="container">
          <div className="log-admin-header">
            <h1 className="section-title"><span className="accent">{t('log.title')}</span></h1>
            <button className="btn btn-primary" onClick={() => setShowNew(v => !v)}>
              {showNew ? '×' : '+ Neuer Eintrag'}
            </button>
          </div>

          {error && <p className="log-error">{error}</p>}

          {showNew && (
            <article className="log-entry log-entry--editing">
              <div className="log-entry__fields">
                <input
                  className="log-entry__input"
                  value={newState.title}
                  onChange={e => setNewState(s => ({ ...s, title: e.target.value }))}
                  placeholder="Titel"
                />
                <input
                  className="log-entry__input log-entry__input--date"
                  type="date"
                  value={newState.log_date}
                  onChange={e => setNewState(s => ({ ...s, log_date: e.target.value }))}
                />
                <textarea
                  className="log-entry__textarea"
                  value={newState.body}
                  onChange={e => setNewState(s => ({ ...s, body: e.target.value }))}
                  placeholder="Text"
                  rows={3}
                />
              </div>
              <div className="log-entry__controls">
                <button className="log-ctrl log-ctrl--save" onClick={createEntry} title="Speichern">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button className="log-ctrl log-ctrl--cancel" onClick={() => setShowNew(false)} title="Abbrechen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </article>
          )}

          <div className="log-list">
            {entries.map(entry => (
              <article key={entry.id} className={`log-entry${editingId === entry.id ? ' log-entry--editing' : ''}`}>
                {editingId === entry.id ? (
                  <div className="log-entry__fields">
                    <input
                      className="log-entry__input"
                      value={editState.title}
                      onChange={e => setEditState(s => ({ ...s, title: e.target.value }))}
                    />
                    <input
                      className="log-entry__input log-entry__input--date"
                      type="date"
                      value={editState.log_date}
                      onChange={e => setEditState(s => ({ ...s, log_date: e.target.value }))}
                    />
                    <textarea
                      className="log-entry__textarea"
                      value={editState.body}
                      onChange={e => setEditState(s => ({ ...s, body: e.target.value }))}
                      rows={3}
                    />
                  </div>
                ) : (
                  <div className="log-entry__content">
                    <div className="log-entry__header">
                      <h2 className="log-entry__title">{entry.title}</h2>
                      <time className="log-entry__date">{formatDate(entry.log_date)}</time>
                    </div>
                    <p className="log-entry__text">{entry.body}</p>
                  </div>
                )}

                <div className="log-entry__controls">
                  {editingId === entry.id ? (
                    <>
                      <button className="log-ctrl log-ctrl--save" onClick={() => saveEdit(entry.id)} title="Speichern">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <button className="log-ctrl log-ctrl--cancel" onClick={cancelEdit} title="Abbrechen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="log-ctrl log-ctrl--edit" onClick={() => startEdit(entry)} title="Bearbeiten">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className="log-ctrl log-ctrl--delete" onClick={() => deleteEntry(entry.id)} title="Löschen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </AccountLayout>
  )
}
