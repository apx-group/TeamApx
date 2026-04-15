import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'
import { useAuth } from '@/contexts/AuthContext'
import { eventsApi } from '@/api/events'
import type { Event, EventParticipant } from '@/types'
import '@/styles/event-detail.css'

const MONTHS = {
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const { lang, t } = useI18n()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadEvent() {
    if (!id) return
    try {
      const data = await eventsApi.getEvent(id)
      setEvent(data.event)
      setParticipants(data.participants)
    } catch {
      setError(t('event.detail.notFound'))
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadEvent() }, [id])

  async function handleJoin() {
    if (!id || !event) return
    setError('')
    setActionLoading(true)
    try {
      await eventsApi.join(id)
      await loadEvent()
    } catch {
      setError(t('event.detail.joinError'))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleLeave() {
    if (!id || !event) return
    setError('')
    setActionLoading(true)
    try {
      await eventsApi.leave(id)
      await loadEvent()
    } catch {
      setError(t('event.detail.leaveError'))
    } finally {
      setActionLoading(false)
    }
  }

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

  function renderJoinButton() {
    if (!event) return null
    const isFull = event.max_participants > 0 && event.participant_count >= event.max_participants
    const isPast = event.status === 'past'

    if (isPast) return null

    if (!user) {
      return (
        <button className="event-detail__join-btn event-detail__join-btn--disabled" disabled>
          {t('event.detail.loginRequired')}
        </button>
      )
    }

    if (event.is_joined) {
      return (
        <button
          className="event-detail__join-btn event-detail__join-btn--leave"
          onClick={handleLeave}
          disabled={actionLoading}
        >
          {t('event.detail.leave')}
        </button>
      )
    }

    if (!user.event_access) {
      return (
        <div className="event-detail__join-wrap">
          <button className="event-detail__join-btn event-detail__join-btn--disabled" disabled title={t('event.detail.noAccessTooltip')}>
            {t('event.detail.noAccess')}
          </button>
          <span className="event-detail__join-hint">{t('event.detail.noAccessTooltip')}</span>
        </div>
      )
    }

    if (isFull) {
      return (
        <button className="event-detail__join-btn event-detail__join-btn--disabled" disabled>
          {t('event.detail.full')}
        </button>
      )
    }

    return (
      <button
        className="event-detail__join-btn event-detail__join-btn--join"
        onClick={handleJoin}
        disabled={actionLoading}
      >
        {t('event.detail.join')}
      </button>
    )
  }

  if (loading) {
    return (
      <section className="section event-detail-page" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-xl))' }}>
        <div className="container">
          <p style={{ color: 'var(--clr-text-muted)' }}>Loading…</p>
        </div>
      </section>
    )
  }

  if (!event) {
    return (
      <section className="section event-detail-page" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-xl))' }}>
        <div className="container">
          <p style={{ color: '#e05c5c' }}>{error || t('event.detail.notFound')}</p>
          <button className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={() => navigate('/rainbow-six')}>
            {t('event.detail.back')}
          </button>
        </div>
      </section>
    )
  }

  const { day, month, year } = formatDate(event.date)
  const statusClass = event.status === 'live' ? 'event-live' : event.status === 'upcoming' ? 'event-upcoming' : 'event-past'
  const badgeClass = event.status === 'live' ? 'event-badge-live' : event.status === 'past' ? 'event-badge-past' : ''
  const duration = lang === 'en' ? event.duration_en || event.duration_de : event.duration_de || event.duration_en
  const description = lang === 'en' ? event.description_en || event.description_de : event.description_de || event.description_en

  return (
    <section className="section event-detail-page" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-xl))' }}>
      <div className="container">
        <button
          className="event-detail__back"
          onClick={() => navigate('/rainbow-six')}
        >
          ← {t('event.detail.back')}
        </button>

        {/* Event Card */}
        <div className={`event-detail__card ${statusClass}`}>
          <div className={`event-status-badge ${badgeClass}`}>{statusLabel(event.status)}</div>
          <div className="event-detail__header">
            <div className="event-date">
              <span className="event-day">{day}</span>
              <span className="event-month">{month}</span>
              <span className="event-year">{year}</span>
            </div>
            <div className="event-detail__info">
              <h1 className="event-detail__title">{event.name}</h1>
              {duration && <span className="event-duration">{duration}</span>}
              {description && <p className="event-description">{description}</p>}
              {event.max_participants > 0 && (
                <p className="event-detail__capacity">
                  {t('event.detail.participants')}: {event.participant_count}
                  {' / '}{event.max_participants}
                </p>
              )}
            </div>
          </div>

          {error && <p className="event-detail__error">{error}</p>}
          <div className="event-detail__actions">
            {renderJoinButton()}
          </div>
        </div>

        {/* Participants */}
        <div className="event-detail__participants">
          <h2 className="event-detail__participants-title">
            {t('event.detail.participants')}
            <span className="event-detail__participants-count">{participants.length}</span>
          </h2>
          {participants.length === 0 ? (
            <p className="event-detail__participants-empty">{t('event.detail.noParticipants')}</p>
          ) : (
            <div className="event-detail__participants-list">
              {participants.map(p => (
                <div key={p.user_id} className="event-detail__participant">
                  <ParticipantAvatar src={p.avatar_url} name={p.nickname || p.username} />
                  <span className="event-detail__participant-name">{p.nickname || p.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ParticipantAvatar({ src, name }: { src: string; name: string }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return <span className="event-detail__participant-initial">{name.charAt(0).toUpperCase()}</span>
  }
  return (
    <img
      src={src}
      alt={name}
      className="event-detail__participant-avatar"
      onError={() => setErr(true)}
    />
  )
}
