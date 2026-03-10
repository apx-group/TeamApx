import { useEffect, useRef, useState } from 'react'
import { adminBadgesApi } from '@/api/badges'
import type { AdminBadge } from '@/types'
import AccountLayout from '@/components/layout/AccountLayout'

export default function AdminBadges() {
  const [badges, setBadges] = useState<AdminBadge[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<AdminBadge> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)

  // Assign badge
  const [assignUsername, setAssignUsername] = useState('')
  const [assignBadgeId, setAssignBadgeId] = useState(0)
  const [assignLevel, setAssignLevel] = useState(1)
  const [assignSuccess, setAssignSuccess] = useState(false)
  const [assignError, setAssignError] = useState('')

  useEffect(() => { loadBadges() }, [])

  async function loadBadges() {
    try {
      const d = await adminBadgesApi.getBadges()
      setBadges(d.badges || [])
    } catch {
      setError('Zugriff verweigert.')
    }
  }

  function setField(field: string, value: string | boolean | number) {
    setEditing(b => b ? { ...b, [field]: value } : b)
  }

  async function saveBadge() {
    if (!editing) return
    try {
      let result: AdminBadge
      if (isNew) {
        result = await adminBadgesApi.createBadge(editing)
      } else {
        result = await adminBadgesApi.updateBadge(editing.id!, editing)
      }
      if (imageFile && result.id) {
        await adminBadgesApi.uploadImage(result.id, imageFile)
      }
      setEditing(null)
      setImageFile(null)
      loadBadges()
    } catch { alert('Fehler beim Speichern') }
  }

  async function deleteBadge(id: number) {
    if (!confirm('Badge löschen?')) return
    await adminBadgesApi.deleteBadge(id)
    loadBadges()
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setAssignError('')
    setAssignSuccess(false)
    try {
      await adminBadgesApi.assignBadge(assignUsername, assignBadgeId, assignLevel)
      setAssignSuccess(true)
      setTimeout(() => setAssignSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setAssignError(msg || 'Fehler beim Zuweisen.')
    }
  }

  return (
    <AccountLayout>
      <section className="section admin-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">Badges</span> verwalten</h1>

          {error && <p style={{ color: '#e05c5c' }}>{error}</p>}

          {/* Badge list */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Badges</h2>
            <button className="btn btn-primary" onClick={() => { setEditing({ name: '', description: '', info: '', category: '', available: true, max_level: 0 }); setIsNew(true) }}>
              + Neu
            </button>
          </div>

          <div className="admin-badges-list">
            {badges.map(b => (
              <div key={b.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                {b.image_url && <img src={b.image_url} alt={b.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }} />}
                <span style={{ flex: 1, fontWeight: 600 }}>{b.name}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{b.category}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>Lvl {b.max_level}</span>
                <span style={{ color: b.available ? 'var(--clr-accent)' : 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>
                  {b.available ? 'Aktiv' : 'Inaktiv'}
                </span>
                <button className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: 'var(--fs-sm)' }} onClick={() => { setEditing({ ...b }); setIsNew(false) }}>Bearbeiten</button>
                <button style={{ background: 'none', border: '1px solid #e05c5c', color: '#e05c5c', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: 'var(--fs-sm)' }} onClick={() => deleteBadge(b.id)}>Löschen</button>
              </div>
            ))}
          </div>

          {/* Assign badge */}
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Badge zuweisen</h2>
            <form onSubmit={handleAssign} style={{ maxWidth: 400 }}>
              <div className="form-field">
                <label>Benutzername</label>
                <input type="text" value={assignUsername} onChange={e => setAssignUsername(e.target.value)} placeholder="Benutzername" required />
              </div>
              <div className="form-field">
                <label>Badge</label>
                <select value={assignBadgeId} onChange={e => setAssignBadgeId(Number(e.target.value))} required>
                  <option value={0}>Badge auswählen</option>
                  {badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Level</label>
                <input type="number" min={0} value={assignLevel} onChange={e => setAssignLevel(Number(e.target.value))} />
              </div>
              {assignError && <p style={{ color: '#e05c5c', marginBottom: '0.5rem' }}>{assignError}</p>}
              {assignSuccess && <p style={{ color: 'green', marginBottom: '0.5rem' }}>Badge zugewiesen!</p>}
              <button type="submit" className="btn btn-primary">Zuweisen</button>
            </form>
          </div>
        </div>
      </section>

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 480, width: '90%', maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{isNew ? 'Badge erstellen' : 'Badge bearbeiten'}</h3>

            {[
              { field: 'name', label: 'Name' },
              { field: 'description', label: 'Beschreibung' },
              { field: 'info', label: 'Info' },
              { field: 'category', label: 'Kategorie' },
            ].map(({ field, label }) => (
              <div key={field} className="form-field" style={{ marginBottom: '0.75rem' }}>
                <label>{label}</label>
                <input type="text" value={(editing as Record<string, unknown>)[field] as string ?? ''} onChange={e => setField(field, e.target.value)} />
              </div>
            ))}

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>Max Level</label>
              <input type="number" min={0} value={editing.max_level ?? 0} onChange={e => setField('max_level', Number(e.target.value))} />
            </div>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!editing.available} onChange={e => setField('available', e.target.checked)} />
                Verfügbar
              </label>
            </div>

            {!isNew && (
              <div className="form-field" style={{ marginBottom: '0.75rem' }}>
                <label>Bild hochladen</label>
                <input ref={imgInputRef} type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={saveBadge}>Speichern</button>
              <button className="btn btn-outline" onClick={() => { setEditing(null); setImageFile(null) }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
