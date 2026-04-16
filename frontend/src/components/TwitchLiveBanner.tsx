import { useEffect, useState } from 'react'
import { getLiveStreams, TwitchStream } from '@/api/twitch'
import '../styles/twitch-banner.css'

export default function TwitchLiveBanner() {
  const [stream, setStream] = useState<TwitchStream | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const streams = await getLiveStreams()
        if (streams && streams.length > 0) {
          setStream(streams[0])
        }
      } catch (err) {
        console.error('Failed to fetch Twitch streams:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStreams()
  }, [])

  if (loading || !stream || dismissed) {
    return null
  }

  return (
    <div className="twitch-banner">
      <div className="twitch-banner__content">
        <div className="twitch-banner__header">
          <span className="twitch-banner__live-dot">●</span>
          <span className="twitch-banner__label">LIVE</span>
          <span className="twitch-banner__username">{stream.user_name}</span>
        </div>
        <div className="twitch-banner__title">{stream.title}</div>
        <div className="twitch-banner__footer">
          <a
            href={`https://twitch.tv/${stream.user_login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="twitch-banner__link"
          >
            Jetzt zuschauen →
          </a>
          <button
            className="twitch-banner__close"
            onClick={() => setDismissed(true)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
