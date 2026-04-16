import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'
import { teamApi } from '@/api/team'
import { eventsApi } from '@/api/events'
import type { TeamMember, StaffMember, Event } from '@/types'

const MONTHS = {
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

export default function RainbowSix() {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [compare, setCompare] = useState<{ player: TeamMember; sub: TeamMember | null } | null>(null)
  const [activeEvents, setActiveEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    teamApi.getTeam().then(d => setMembers(d.members || [])).catch(() => {})
    teamApi.getStaff().then(d => setStaff(d.staff || [])).catch(() => {})
    eventsApi.getEvents().then(d => {
      const all = d.events || []
      setActiveEvents(all.filter(e => e.status !== 'past'))
      setPastEvents(all.filter(e => e.status === 'past'))
    }).catch(() => {})
  }, [])

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const months = MONTHS[lang]
    return {
      day: String(d.getDate()).padStart(2, '0'),
      month: months[d.getMonth()],
      year: d.getFullYear(),
    }
  }

  function statusLabel(status: string) {
    if (status === 'live') return t('event.status.live')
    if (status === 'upcoming') return t('event.status.upcoming')
    return t('event.status.past')
  }

  const mainRoster = members.filter(m => m.is_main_roster)

  function openCompare(player: TeamMember) {
    const sub = members.find(m => m.paired_with === player.id) || null
    setCompare({ player, sub })
    // eslint-disable-next-line react-hooks/immutability
    document.body.style.overflow = 'hidden'
  }
  function closeCompare() {
    setCompare(null)
    document.body.style.overflow = ''
  }

  return (
    <>
      {/* Description */}
      <section className="section r6-description" id="r6-description" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-xl))' }}>
        <div className="container">
          <h2 className="section-title">
            RAINBOW SIX <span className="accent">SIEGE</span>
          </h2>
          <div className="r6-description-grid">
            <div className="r6-description-text">
              <p>{t('r6.description.text1')}</p>
            </div>
            <div className="about-stats">
              <div className="stat">
                <span className="stat-number">R6S</span>
                <span className="stat-label">{t('r6.description.stat.game')}</span>
              </div>
              <div className="stat">
                <span className="stat-number">2021</span>
                <span className="stat-label">{t('r6.description.stat.founded')}</span>
              </div>
              <div className="stat">
                <span className="stat-number">{mainRoster.length}</span>
                <span className="stat-label">{t('r6.description.stat.players')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Players */}
      <section className="section r6-players" id="r6-players">
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
      </section>

      {/* Events */}
      <section className="section events" id="events">
        <div className="container">
          <h2 className="section-title">
            {lang === 'de' ? <>Unsere <span className="accent">Events</span></> : <>Our <span className="accent">Events</span></>}
          </h2>
          <p className="section-subtitle">{t('events.subtitle')}</p>

          <div className="events-timeline" id="events-active">
            {activeEvents.map(ev => {
              const { day, month, year } = formatDate(ev.date)
              const statusClass = ev.status === 'live' ? 'event-live' : ev.status === 'upcoming' ? 'event-upcoming' : 'event-past'
              const badgeClass = ev.status === 'live' ? 'event-badge-live' : ev.status === 'past' ? 'event-badge-past' : ''
              const duration = lang === 'en' ? ev.duration_en || ev.duration_de : ev.duration_de || ev.duration_en
              const description = lang === 'en' ? ev.description_en || ev.description_de : ev.description_de || ev.description_en
              return (
                <div key={ev.id} className={`event-card ${statusClass}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/rainbow-six/${ev.id}`)}>
                  <div className={`event-status-badge ${badgeClass}`}>{statusLabel(ev.status)}</div>
                  <div className="event-date">
                    <span className="event-day">{day}</span>
                    <span className="event-month">{month}</span>
                    <span className="event-year">{year}</span>
                  </div>
                  <div className="event-details">
                    <h3 className="event-name">{ev.name}</h3>
                    <span className="event-duration">{duration}</span>
                    <p className="event-description">{description}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {pastEvents.length > 0 && (
            <div className={`events-hidden${showPast ? ' active' : ''}`}>
              {pastEvents.map(ev => {
                const { day, month, year } = formatDate(ev.date)
                const duration = lang === 'en' ? ev.duration_en || ev.duration_de : ev.duration_de || ev.duration_en
                const description = lang === 'en' ? ev.description_en || ev.description_de : ev.description_de || ev.description_en
                return (
                  <div key={ev.id} className="event-card event-past" style={{ cursor: 'pointer' }} onClick={() => navigate(`/rainbow-six/${ev.id}`)}>
                    <div className="event-status-badge event-badge-past">{t('event.status.past')}</div>
                    <div className="event-date">
                      <span className="event-day">{day}</span>
                      <span className="event-month">{month}</span>
                      <span className="event-year">{year}</span>
                    </div>
                    <div className="event-details">
                      <h3 className="event-name">{ev.name}</h3>
                      <span className="event-duration">{duration}</span>
                      <p className="event-description">{description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {pastEvents.length > 0 && (
            <button className="events-toggle-btn" onClick={() => setShowPast(v => !v)}>
              {showPast ? t('events.showLess') : t('events.showOlder')}
            </button>
          )}
        </div>
      </section>

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
    </>
  )
}

function PlayerImg({ src, name, className }: { src: string; name: string; className?: string }) {
  const [err, setErr] = useState(false)
  if (err) return <span className={`img-initial${className ? ' ' + className : ''}`}>{name.charAt(0)}</span>
  return <img src={src} alt={name} className={className} onError={() => setErr(true)} />
}
