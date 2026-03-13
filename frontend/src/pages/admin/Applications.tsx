import { useEffect, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { adminApplyApi } from '@/api/badges'
import AccountLayout from '@/templates/layout/AccountLayout'

interface App {
  id: number
  username: string
  name: string
  age: string
  discord: string
  game: string
  rank: string
  attacker_role: string
  defender_role: string
  experience: string
  motivation: string
  availability: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export default function AdminApplications() {
  const { t } = useI18n()
  const [apps, setApps] = useState<App[]>([])
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<App | null>(null)

  useEffect(() => {
    adminApplyApi.getApplications()
      .then((d: { applications?: App[] }) => setApps(d.applications || []))
      .catch(() => setError(t('apps.error')))
  }, [])

  async function handleStatus(id: number, status: string) {
    try {
      await adminApplyApi.updateApplication(id, status)
      setApps(a => a.map(app => app.id === id ? { ...app, status: status as App['status'] } : app))
      if (selected?.id === id) setSelected(s => s ? { ...s, status: status as App['status'] } : s)
    } catch {}
  }

  function statusLabel(status: string) {
    if (status === 'accepted') return t('myapp.status.accepted')
    if (status === 'rejected') return t('myapp.status.rejected')
    return t('myapp.status.pending')
  }

  function statusColor(status: string) {
    if (status === 'accepted') return 'var(--clr-accent)'
    if (status === 'rejected') return '#e05c5c'
    return 'var(--clr-text-muted)'
  }

  return (
    <AccountLayout>
      <section className="section admin-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">{t('admin.nav.applications')}</span></h1>
          <p className="section-subtitle">{t('apps.subtitle')}</p>

          {error && <p style={{ color: '#e05c5c' }}>{error}</p>}

          {!error && apps.length === 0 && (
            <p style={{ color: 'var(--clr-text-muted)' }}>{t('apps.empty')}</p>
          )}

          <div className="admin-applications-list">
            {apps.map(app => (
              <div
                key={app.id}
                className="admin-app-row"
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', cursor: 'pointer' }}
                onClick={() => setSelected(app)}
              >
                <span style={{ flex: 1, fontWeight: 600 }}>{app.name || app.username}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{app.game}</span>
                <span style={{ color: statusColor(app.status), fontSize: 'var(--fs-sm)' }}>{statusLabel(app.status)}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>
                  {new Date(app.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto', position: 'relative' }}>
            <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--clr-text-muted)' }}>&times;</button>
            <h2 style={{ marginBottom: '1.5rem' }}>{t('apps.modal.detail')} {selected.name}</h2>

            {[
              [t('apps.label.name'), selected.name],
              [t('apps.label.age'), selected.age],
              [t('apps.label.discord'), selected.discord],
              [t('apps.label.game'), selected.game],
              [t('apps.label.rank'), selected.rank],
              [t('apps.label.attackerRole'), selected.attacker_role],
              [t('apps.label.defenderRole'), selected.defender_role],
              [t('apps.label.experience'), selected.experience],
              [t('apps.label.motivation'), selected.motivation],
              [t('apps.label.availability'), selected.availability],
            ].map(([label, value]) => value ? (
              <div key={label as string} style={{ marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)', display: 'block' }}>{label}</span>
                <span>{value}</span>
              </div>
            ) : null)}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => handleStatus(selected.id, 'accepted')}>{t('apps.btn.accept')}</button>
              <button className="btn btn-outline" onClick={() => handleStatus(selected.id, 'rejected')} style={{ borderColor: '#e05c5c', color: '#e05c5c' }}>{t('apps.btn.reject')}</button>
              <button className="btn btn-outline" onClick={() => handleStatus(selected.id, 'pending')}>{t('apps.btn.reset')}</button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
