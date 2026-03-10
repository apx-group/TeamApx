import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'
import type { Event } from '@/types'

const HERO_CLIPS = [
  '/videos/bg-01.mp4',
  '/videos/bg-02.mp4',
  '/videos/bg-03.mp4',
  '/videos/bg-04.mp4',
  '/videos/bg-05.mp4',
]

const MONTHS = {
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

export default function Home() {
  const { lang, t } = useI18n()

  // Hero video
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastClip = useRef(-1)

  function playRandomClip() {
    if (!videoRef.current) return
    let idx: number
    do { idx = Math.floor(Math.random() * HERO_CLIPS.length) }
    while (HERO_CLIPS.length > 1 && idx === lastClip.current)
    lastClip.current = idx
    videoRef.current.src = HERO_CLIPS[idx]
    videoRef.current.play().catch(() => {})
  }

  useEffect(() => {
    playRandomClip()
  }, [])

  // Events
  const [activeEvents, setActiveEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    fetch('/data/events-active.json').then(r => r.json()).then(setActiveEvents).catch(() => {})
    fetch('/data/events-past.json').then(r => r.json()).then(setPastEvents).catch(() => {})
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

  return (
    <>
      {/* Hero */}
      <section className="hero" id="hero">
        <video
          ref={videoRef}
          className="hero-video"
          autoPlay
          muted
          playsInline
          onEnded={playRandomClip}
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-title">TEAM <span className="accent">APX</span></h1>
          <p className="hero-subtitle">{t('hero.subtitle')}</p>
          <div className="hero-actions">
            <a href="#about" className="btn btn-primary">{t('hero.btn.more')}</a>
            <Link to="/apply" className="btn btn-outline">{t('hero.btn.apply')}</Link>
          </div>
        </div>
      </section>

      {/* Player of the Week */}
      <section className="section potw" id="potw">
        <div className="container">
          <h2 className="section-title">
            {lang === 'de'
              ? <>Spieler der <span className="accent">Woche</span></>
              : <>Player of the <span className="accent">Week</span></>}
          </h2>
          <div className="potw-grid">
            <div className="potw-left">
              <h3 className="potw-player-name">LIXH</h3>
              <div className="potw-stats">
                <div className="potw-stat"><span className="potw-stat-label">K/D</span><span className="potw-stat-value">1.4</span></div>
                <div className="potw-stat"><span className="potw-stat-label">KOST</span><span className="potw-stat-value">72%</span></div>
                <div className="potw-stat"><span className="potw-stat-label">Rating</span><span className="potw-stat-value">1.21</span></div>
                <div className="potw-stat"><span className="potw-stat-label">{t('potw.stat.role')}</span><span className="potw-stat-value">Entry-Frag</span></div>
              </div>
            </div>
            <div className="potw-right">
              <iframe
                className="potw-video"
                src="https://www.youtube.com/embed/2F7AFSXC9zw?si=Vk6q4VQuG_gDqNzg"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section about" id="about">
        <div className="container">
          <h2 className="section-title">
            {lang === 'de' ? <>Über <span className="accent">uns</span></> : <>About <span className="accent">us</span></>}
          </h2>
          <div className="about-grid">
            <div className="about-text">
              <p>{t('about.text1')}</p>
              <p>{t('about.text2')}</p>
            </div>
            <div className="about-stats">
              <div className="stat"><span className="stat-number">12</span><span className="stat-label">{t('about.stat.players')}</span></div>
              <div className="stat"><span className="stat-number">19</span><span className="stat-label">{t('about.stat.tournaments')}</span></div>
              <div className="stat"><span className="stat-number">2021</span><span className="stat-label">{t('about.stat.founded')}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Team section */}
      <section className="section team-games" id="team">
        <div className="container">
          <h2 className="section-title">{t('nav.team')}</h2>
          <div className="team-games-list">
            <Link to="/rainbow-six" className="team-game-btn team-game-btn--top">
              <div className="team-game-btn__text">
                <span className="team-game-btn__title">RAINBOW SIX SIEGE</span>
                <span className="team-game-btn__desc">
                  {lang === 'de'
                    ? 'Hier findest du Informationen zu einzelnen Spielern und Management'
                    : 'Find information about individual players and management here'}
                </span>
              </div>
              <span className="team-game-btn__arrow">&#8250;</span>
            </Link>
            <Link to="/assetto-corsa" className="team-game-btn team-game-btn--bottom">
              <div className="team-game-btn__text">
                <span className="team-game-btn__title">ASSETTO CORSA COMPETIZIONE</span>
                <span className="team-game-btn__desc">Soon available</span>
              </div>
              <span className="team-game-btn__arrow">&#8250;</span>
            </Link>
          </div>
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
            {activeEvents.map((ev, i) => {
              const { day, month, year } = formatDate(ev.date)
              const statusClass = ev.status === 'live' ? 'event-live' : ev.status === 'upcoming' ? 'event-upcoming' : 'event-past'
              const badgeClass = ev.status === 'live' ? 'event-badge-live' : ev.status === 'past' ? 'event-badge-past' : ''
              return (
                <div key={i} className={`event-card ${statusClass}`}>
                  <div className={`event-status-badge ${badgeClass}`}>{statusLabel(ev.status)}</div>
                  <div className="event-date">
                    <span className="event-day">{day}</span>
                    <span className="event-month">{month}</span>
                    <span className="event-year">{year}</span>
                  </div>
                  <div className="event-details">
                    <h3 className="event-name">{ev.name}</h3>
                    <span className="event-duration">{ev.duration[lang] || ev.duration.de}</span>
                    <p className="event-description">{ev.description[lang] || ev.description.de}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {pastEvents.length > 0 && (
            <div className={`events-hidden${showPast ? ' active' : ''}`}>
              {pastEvents.map((ev, i) => {
                const { day, month, year } = formatDate(ev.date)
                return (
                  <div key={i} className="event-card event-past">
                    <div className="event-status-badge event-badge-past">{t('event.status.past')}</div>
                    <div className="event-date">
                      <span className="event-day">{day}</span>
                      <span className="event-month">{month}</span>
                      <span className="event-year">{year}</span>
                    </div>
                    <div className="event-details">
                      <h3 className="event-name">{ev.name}</h3>
                      <span className="event-duration">{ev.duration[lang] || ev.duration.de}</span>
                      <p className="event-description">{ev.description[lang] || ev.description.de}</p>
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

      {/* Socials */}
      <section className="section socials" id="socials">
        <div className="container">
          <h2 className="section-title">
            {lang === 'de' ? <>Folge <span className="accent">uns</span></> : <>Follow <span className="accent">us</span></>}
          </h2>
          <p className="section-subtitle">{t('socials.subtitle')}</p>
          <div className="socials-grid">
            <a href="https://discord.gg/PQg5hqr4K5" className="social-card" target="_blank" rel="noopener noreferrer">
              <img className="social-icon" src="/icons/DISCORD.svg" alt="Discord" />
              <span className="social-name">Discord</span>
            </a>
            <a href="https://x.com/teamapxr6" className="social-card" target="_blank" rel="noopener noreferrer">
              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="social-name">X / Twitter</span>
            </a>
            <a href="https://www.instagram.com/team.apx.r6/" className="social-card" target="_blank" rel="noopener noreferrer">
              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
              <span className="social-name">Instagram</span>
            </a>
            <a href="https://www.youtube.com/@teamapxr6" className="social-card" target="_blank" rel="noopener noreferrer">
              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span className="social-name">YouTube</span>
            </a>
            <a href="https://www.challengermode.com/teams/9d50abad-3f1a-4a6a-5a05-08dddbfe140d" className="social-card" target="_blank" rel="noopener noreferrer">
              <img className="social-icon" src="/images/CM.png" alt="Challengermode" />
              <span className="social-name">Challengermode</span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta" id="join">
        <div className="container">
          <div className="cta-content">
            <h2>
              {lang === 'de'
                ? <>Werde Teil von <span className="accent">Team Apx</span></>
                : <>Join <span className="accent">Team Apx</span></>}
            </h2>
            <p>{t('cta.text')}</p>
            <Link to="/apply" className="btn btn-primary btn-large">{t('cta.btn')}</Link>
          </div>
        </div>
      </section>

    </>
  )
}
