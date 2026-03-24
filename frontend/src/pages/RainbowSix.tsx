import { useEffect, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { teamApi } from '@/api/team'
import type { TeamMember, StaffMember } from '@/types'


export default function RainbowSix() {
  const { t } = useI18n()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [compare, setCompare] = useState<{ player: TeamMember; sub: TeamMember | null } | null>(null)

  useEffect(() => {
    teamApi.getTeam().then(d => setMembers(d.members || [])).catch(() => {})
    teamApi.getStaff().then(d => setStaff(d.staff || [])).catch(() => {})
  }, [])

  const mainRoster = members.filter(m => m.is_main_roster)

  function openCompare(player: TeamMember) {
    const sub = members.find(m => m.paired_with === player.id) || null
    setCompare({ player, sub })
    document.body.style.overflow = 'hidden'
  }
  function closeCompare() {
    setCompare(null)
    document.body.style.overflow = ''
  }

  return (
    <section className="section team" id="team" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-xl))' }}>
      <div className="container">
        <h2 className="team-heading">{t('team.heading')}</h2>
        <div className="team-grid" id="team-grid">
          {mainRoster.map(player => {
            const imgSrc = player.avatar_url || `/images/${player.name}.png`
            return (
              <div key={player.id} className="team-card" onClick={() => openCompare(player)} style={{ cursor: 'pointer' }}>
                <div className="team-card-img">
                  <PlayerImg src={imgSrc} name={player.name} />
                </div>
                <div className="team-card-info">
                  <span className="team-card-role">{player.atk_role} | {player.def_role}</span>
                  <h3 className="team-card-name">{player.name}</h3>
                </div>
              </div>
            )
          })}
        </div>

        {staff.length > 0 && (
          <>
            <h2 className="team-heading" style={{ marginTop: 'var(--space-xl)' }}>STAFF</h2>
            <div className="staff-grid" id="staff-grid">
              {staff.map(s => {
                const imgSrc = s.avatar_url || `/images/${s.name}.png`
                return (
                  <div key={s.id} className="staff-card">
                    <div className="staff-card-img">
                      <PlayerImg src={imgSrc} name={s.name} />
                    </div>
                    <div className="staff-card-info">
                      <span className="staff-card-role">{s.role}</span>
                      <span className="staff-card-name">{s.name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Compare Modal */}
      {compare && (
        <div className="player-compare-overlay active" onClick={e => { if (e.target === e.currentTarget) closeCompare() }}>
          <div className="player-compare">
            <button className="player-compare-close" onClick={closeCompare}>&times;</button>
            <div className="compare-header">
              <div className="compare-side">
                <PlayerImg src={compare.player.avatar_url || `/images/${compare.player.name}.png`} name={compare.player.name} className="compare-img" />
                <span className="compare-name">{compare.player.name}</span>
              </div>
              <span className="compare-vs">VS</span>
              <div className="compare-side">
                {compare.sub
                  ? <>
                    <PlayerImg src={compare.sub.avatar_url || `/images/${compare.sub.name}.png`} name={compare.sub.name} className="compare-img" />
                    <span className="compare-name">{compare.sub.name}</span>
                  </>
                  : <div className="compare-placeholder">?</div>
                }
              </div>
            </div>

            <div className="compare-roles">
              <div className="compare-role-col">
                <span className="compare-role-label">{t('compare.atkRole')}</span>
                <span className="compare-role-val">{compare.player.atk_role}</span>
              </div>
              <div className="compare-role-col">
                <span className="compare-role-label">{t('compare.defRole')}</span>
                <span className="compare-role-val">{compare.player.def_role}</span>
              </div>
              {compare.sub && <>
                <div className="compare-role-col">
                  <span className="compare-role-label">{t('compare.atkRole')}</span>
                  <span className="compare-role-val">{compare.sub.atk_role}</span>
                </div>
                <div className="compare-role-col">
                  <span className="compare-role-label">{t('compare.defRole')}</span>
                  <span className="compare-role-val">{compare.sub.def_role}</span>
                </div>
              </>}
            </div>

          </div>
        </div>
      )}
    </section>
  )
}

function PlayerImg({ src, name, className }: { src: string; name: string; className?: string }) {
  const [err, setErr] = useState(false)
  if (err) return <span className={`img-initial${className ? ' ' + className : ''}`}>{name.charAt(0)}</span>
  return <img src={src} alt={name} className={className} onError={() => setErr(true)} />
}
