import { useEffect, useState } from 'react'
import { adminTeamApi } from '@/api/team'
import type { TeamMember, StaffMember } from '@/types'
import AccountLayout from '@/components/layout/AccountLayout'

export default function AdminTeam() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [error, setError] = useState('')
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null)
  const [editingStaff, setEditingStaff] = useState<Partial<StaffMember> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [isNewStaff, setIsNewStaff] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [tData, sData] = await Promise.all([adminTeamApi.getTeam(), adminTeamApi.getStaff()])
      setMembers(tData.members || [])
      setStaff(sData.staff || [])
    } catch {
      setError('Zugriff verweigert.')
    }
  }

  async function saveMember() {
    if (!editingMember) return
    try {
      if (isNew) {
        await adminTeamApi.addMember(editingMember)
      } else if (editingMember.id) {
        await adminTeamApi.updateMember(editingMember.id, editingMember)
      }
      setEditingMember(null)
      loadAll()
    } catch (e) { alert('Fehler beim Speichern') }
  }

  async function deleteMember(id: number) {
    if (!confirm('Spieler löschen?')) return
    await adminTeamApi.deleteMember(id)
    loadAll()
  }

  async function saveStaff() {
    if (!editingStaff) return
    try {
      if (isNewStaff) {
        await adminTeamApi.addStaff(editingStaff)
      } else if (editingStaff.id) {
        await adminTeamApi.updateStaff(editingStaff.id, editingStaff)
      }
      setEditingStaff(null)
      loadAll()
    } catch { alert('Fehler beim Speichern') }
  }

  async function deleteStaff(id: number) {
    if (!confirm('Personal löschen?')) return
    await adminTeamApi.deleteStaff(id)
    loadAll()
  }

  function setMemberField(field: string, value: string | boolean | number) {
    setEditingMember(m => m ? { ...m, [field]: value } : m)
  }

  function setStaffField(field: string, value: string) {
    setEditingStaff(s => s ? { ...s, [field]: value } : s)
  }

  return (
    <AccountLayout>
      <section className="section admin-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">Team</span> verwalten</h1>

          {error && <p style={{ color: '#e05c5c' }}>{error}</p>}

          {/* Players */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2>Spieler</h2>
            <button className="btn btn-primary" onClick={() => { setEditingMember({ name: '', atk_role: '', def_role: '', kills: 0, deaths: 0, rounds: 0, kost_points: 0, is_main_roster: true }); setIsNew(true) }}>
              + Hinzufügen
            </button>
          </div>

          <div className="admin-table">
            {members.map(m => (
              <div key={m.id} className="admin-table-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem 1rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{m.name}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{m.atk_role} | {m.def_role}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{m.is_main_roster ? 'Main' : 'Sub'}</span>
                <button className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: 'var(--fs-sm)' }} onClick={() => { setEditingMember({ ...m }); setIsNew(false) }}>Bearbeiten</button>
                <button style={{ background: 'none', border: '1px solid #e05c5c', color: '#e05c5c', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: 'var(--fs-sm)' }} onClick={() => deleteMember(m.id)}>Löschen</button>
              </div>
            ))}
          </div>

          {/* Staff */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2rem 0 1rem' }}>
            <h2>Personal</h2>
            <button className="btn btn-primary" onClick={() => { setEditingStaff({ name: '', role: '' }); setIsNewStaff(true) }}>
              + Hinzufügen
            </button>
          </div>

          <div>
            {staff.map(s => (
              <div key={s.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem 1rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{s.role}</span>
                <button className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: 'var(--fs-sm)' }} onClick={() => { setEditingStaff({ ...s }); setIsNewStaff(false) }}>Bearbeiten</button>
                <button style={{ background: 'none', border: '1px solid #e05c5c', color: '#e05c5c', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: 'var(--fs-sm)' }} onClick={() => deleteStaff(s.id)}>Löschen</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Member edit modal */}
      {editingMember && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 480, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{isNew ? 'Spieler hinzufügen' : 'Spieler bearbeiten'}</h3>
            {[
              { field: 'name', label: 'Name', type: 'text' },
              { field: 'atk_role', label: 'ATK Rolle', type: 'text' },
              { field: 'def_role', label: 'DEF Rolle', type: 'text' },
              { field: 'kills', label: 'Kills', type: 'number' },
              { field: 'deaths', label: 'Deaths', type: 'number' },
              { field: 'rounds', label: 'Rounds', type: 'number' },
              { field: 'kost_points', label: 'KOST Points', type: 'number' },
            ].map(({ field, label, type }) => (
              <div key={field} className="form-field" style={{ marginBottom: '0.75rem' }}>
                <label>{label}</label>
                <input
                  type={type}
                  value={(editingMember as Record<string, unknown>)[field] as string ?? ''}
                  onChange={e => setMemberField(field, type === 'number' ? Number(e.target.value) : e.target.value)}
                />
              </div>
            ))}
            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!editingMember.is_main_roster} onChange={e => setMemberField('is_main_roster', e.target.checked)} />
                Main Roster
              </label>
            </div>
            <div className="form-field" style={{ marginBottom: '1rem' }}>
              <label>Supportet (ID)</label>
              <select value={editingMember.paired_with || 0} onChange={e => setMemberField('paired_with', Number(e.target.value))}>
                <option value={0}>— Niemanden —</option>
                {members.filter(m => m.id !== editingMember.id && m.is_main_roster).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={saveMember}>Speichern</button>
              <button className="btn btn-outline" onClick={() => setEditingMember(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff edit modal */}
      {editingStaff && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 400, width: '90%' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{isNewStaff ? 'Personal hinzufügen' : 'Personal bearbeiten'}</h3>
            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>Name</label>
              <input type="text" value={editingStaff.name || ''} onChange={e => setStaffField('name', e.target.value)} />
            </div>
            <div className="form-field" style={{ marginBottom: '1rem' }}>
              <label>Rolle</label>
              <input type="text" value={editingStaff.role || ''} onChange={e => setStaffField('role', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={saveStaff}>Speichern</button>
              <button className="btn btn-outline" onClick={() => setEditingStaff(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
