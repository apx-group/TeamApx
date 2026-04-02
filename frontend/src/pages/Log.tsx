import { useEffect, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { logApi, type LogEntry } from '@/api/log'
import AccountLayout from '@/templates/layout/AccountLayout'
import '@/styles/log.css'

export default function Log() {
  const { t, lang } = useI18n()
  const [entries, setEntries] = useState<LogEntry[]>([])

  useEffect(() => {
    console.log('Log mounted')
    logApi.getEntries()
      .then(d => {
        console.log('Log data:', JSON.stringify(d))
        setEntries(d.entries || [])
      })
      .catch(e => console.error('Log error:', e))
  }, [])

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
          <h1 className="section-title"><span className="accent">{t('log.title')}</span></h1>
          <div className="log-list">
            {entries.map(entry => (
              <article key={entry.id} className="log-entry">
                <div className="log-entry__content">
                  <div className="log-entry__header">
                    <h2 className="log-entry__title">{entry.title}</h2>
                    <time className="log-entry__date">{formatDate(entry.log_date)}</time>
                  </div>
                  <p className="log-entry__text">{entry.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </AccountLayout>
  )
}
