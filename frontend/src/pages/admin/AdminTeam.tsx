import { useEffect, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { adminTeamApi } from '@/api/team'
import type { TeamMember, StaffMember } from '@/types'
import AccountLayout from '@/templates/layout/AccountLayout'

export default function AdminTeam() {
  const { t } = useI18n()
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
      setError(t('admin.accessDenied'))
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
    } catch { alert(t('admin.saveError')) }
  }

  async function deleteMember(id: number) {
    if (!confirm(t('admin.team.confirmDeletePlayer'))) return
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
    } catch { alert(t('admin.saveError')) }
  }

  async function deleteStaff(id: number) {
    if (!confirm(t('admin.team.confirmDeleteStaff'))) return
    await adminTeamApi.deleteStaff(id)
    loadAll()
  }

  function setMemberField(field: string, value: string | boolean | number) {
    setEditingMember(m => m ? { ...m, [field]: value } : m)
  }

  function setStaffField(field: string, value: string) {
    setEditingStaff(s => s ? { ...s, [field]: value } : s)
  }

  const memberFields = [
    { field: 'name', label: t('team.addPlayer.namePlaceholder'), type: 'text' },
    { field: 'username', label: t('admin.team.usernameLink'), type: 'text' },
    { field: 'atk_role', label: t('team.label.atkRole'), type: 'text' },
    { field: 'def_role', label: t('team.label.defRole'), type: 'text' },
    { field: 'kills', label: t('team.label.kills'), type: 'number' },
    { field: 'deaths', label: t('team.label.deaths'), type: 'number' },
    { field: 'rounds', label: t('team.label.rounds'), type: 'number' },
    { field: 'kost_points', label: 'KOST Points', type: 'number' },
  ]

  return (
    <AccountLayout>
      <section className="section admin-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">{t('admin.team.title')}</span></h1>

          {error && <p style={{ color: '#e05c5c' }}>{error}</p>}

          {/* Players */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2>{t('player.heading')}</h2>
            <button className="btn btn-primary" onClick={() => { setEditingMember({ name: '', atk_role: '', def_role: '', kills: 0, deaths: 0, rounds: 0, kost_points: 0, is_main_roster: true }); setIsNew(true) }}>
              {t('admin.add')}
            </button>
          </div>

          <div className="admin-table">
            {members.map(m => (
              <div key={m.id} className="admin-table-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem 1rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{m.name}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{m.atk_role} | {m.def_role}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{m.is_main_roster ? 'Main' : 'Sub'}</span>
                <button className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: 'var(--fs-sm)' }} onClick={() => { setEditingMember({ ...m }); setIsNew(false) }}>{t('admin.edit')}</button>
                <button style={{ background: 'none', border: '1px solid #e05c5c', color: '#e05c5c', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: 'var(--fs-sm)' }} onClick={() => deleteMember(m.id)}>{t('admin.delete')}</button>
              </div>
            ))}
          </div>

          {/* Staff */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2rem 0 1rem' }}>
            <h2>{t('staff.heading')}</h2>
            <button className="btn btn-primary" onClick={() => { setEditingStaff({ name: '', role: '' }); setIsNewStaff(true) }}>
              {t('admin.add')}
            </button>
          </div>

          <div>
            {staff.map(s => (
              <div key={s.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem 1rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{s.role}</span>
                <button className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: 'var(--fs-sm)' }} onClick={() => { setEditingStaff({ ...s }); setIsNewStaff(false) }}>{t('admin.edit')}</button>
                <button style={{ background: 'none', border: '1px solid #e05c5c', color: '#e05c5c', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: 'var(--fs-sm)' }} onClick={() => deleteStaff(s.id)}>{t('admin.delete')}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Member edit modal */}
      {editingMember && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 480, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{isNew ? t('admin.team.addPlayer') : t('admin.team.editPlayer')}</h3>
            {memberFields.map(({ field, label, type }) => (
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
                {t('admin.team.mainRoster')}
              </label>
            </div>
            <div className="form-field" style={{ marginBottom: '1rem' }}>
              <label>{t('admin.team.supports')}</label>
              <select value={editingMember.paired_with || 0} onChange={e => setMemberField('paired_with', Number(e.target.value))}>
                <option value={0}>{t('team.label.nobody')}</option>
                {members.filter(m => m.id !== editingMember.id && m.is_main_roster).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={saveMember}>{t('admin.save')}</button>
              <button className="btn btn-outline" onClick={() => setEditingMember(null)}>{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff edit modal */}
      {editingStaff && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 400, width: '90%' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{isNewStaff ? t('admin.team.addStaff') : t('admin.team.editStaff')}</h3>
            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('team.addStaff.namePlaceholder')}</label>
              <input type="text" value={editingStaff.name || ''} onChange={e => setStaffField('name', e.target.value)} />
            </div>
            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('admin.team.usernameLink')}</label>
              <input type="text" value={editingStaff.username || ''} onChange={e => setStaffField('username', e.target.value)} />
            </div>
            <div className="form-field" style={{ marginBottom: '1rem' }}>
              <label>{t('team.label.staffRole')}</label>
              <input type="text" value={editingStaff.role || ''} onChange={e => setStaffField('role', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={saveStaff}>{t('admin.save')}</button>
              <button className="btn btn-outline" onClick={() => setEditingStaff(null)}>{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
