import { useEffect, useState } from 'react'
import { badgesApi } from '@/api/badges'
import type { Badge } from '@/types'
import AccountLayout from '@/components/layout/AccountLayout'

interface BadgeOverlay {
  name: string
  img: string
  level: number
  maxLevel: number
  desc: string
  info: string
}

export default function Badges() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [error, setError] = useState('')
  const [overlay, setOverlay] = useState<BadgeOverlay | null>(null)

  useEffect(() => {
    badgesApi.getMyBadges()
      .then(d => setBadges(d.badges || []))
      .catch(() => setError('Badges konnten nicht geladen werden.'))
  }, [])

  const visibleBadges = badges.filter(b => b.level > 0 || b.available)

  // Group by category
  const groups: Record<string, Badge[]> = {}
  const order: string[] = []
  visibleBadges.forEach(b => {
    const cat = b.category || 'Sonstige'
    if (!groups[cat]) { groups[cat] = []; order.push(cat) }
    groups[cat].push(b)
  })

  function linesStyle(n: number) {
    const H = Math.min(200, Math.max(80, n * 21))
    const h = Math.max(3, Math.min(16, Math.floor(H / (n * 1.35))))
    const gap = Math.max(1, Math.min(5, Math.floor(h * 0.35)))
    return { h, gap }
  }

  return (
    <AccountLayout>
      <section className="section badges-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">Badges</span></h1>

          {error && <p className="settings-placeholder">{error}</p>}

          {!error && order.length === 0 && (
            <p className="settings-placeholder" style={{ color: 'var(--clr-text-muted)' }}>
              Noch keine Badges verfügbar.
            </p>
          )}

          <div id="badges-container">
            {order.map(cat => (
              <div key={cat}>
                <p className="badges-section-title">{cat}</p>
                <div className="badges-grid">
                  {groups[cat].map(b => {
                    const isLocked = b.level === 0
                    const hasLevels = b.max_level > 0
                    const lvlText = isLocked ? 'Gesperrt' : (hasLevels ? `Level ${b.level}` : '')
                    const { h, gap } = linesStyle(b.max_level)

                    return (
                      <div
                        key={b.id}
                        className={`badge-card${isLocked ? ' badge-locked' : ''}`}
                        onClick={() => setOverlay({ name: b.name, img: b.image_url, level: b.level, maxLevel: b.max_level, desc: b.description, info: b.info })}
                        style={{ cursor: 'pointer' }}
                      >
                        {hasLevels && (
                          <div className="badge-lines badge-lines--left" style={{ gap }}>
                            {Array.from({ length: b.max_level }, (_, i) => {
                              const active = b.level > 0 && (i + 1) >= (b.max_level - b.level + 1)
                              return <span key={i} className={`badge-line${active ? ' badge-line--active' : ''}`} style={{ height: h }} />
                            })}
                          </div>
                        )}
                        <div className="badge-center">
                          <img src={b.image_url} alt={b.name} className="badge-img" />
                          <span className="badge-name">{b.name}</span>
                          {lvlText && <span className="badge-lvl">{lvlText}</span>}
                        </div>
                        {hasLevels && (
                          <div className="badge-lines badge-lines--right" style={{ gap }}>
                            {Array.from({ length: b.max_level }, (_, i) => {
                              const active = b.level > 0 && (i + 1) >= (b.max_level - b.level + 1)
                              return <span key={i} className={`badge-line${active ? ' badge-line--active' : ''}`} style={{ height: h }} />
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {overlay && (
        <div
          className="badge-overlay active"
          onClick={e => { if (e.target === e.currentTarget) setOverlay(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="badge-overlay__box" style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 400, width: '90%', textAlign: 'center', position: 'relative' }}>
            <button
              onClick={() => setOverlay(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--clr-text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            <img src={overlay.img} alt={overlay.name} style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>{overlay.name}</h3>
            {overlay.maxLevel > 0 && (
              <p style={{ color: 'var(--clr-accent)', marginBottom: '0.5rem' }}>
                {overlay.level === 0 ? 'Gesperrt' : `Level ${overlay.level} / ${overlay.maxLevel}`}
              </p>
            )}
            {overlay.desc && <p style={{ color: 'var(--clr-text-muted)', marginBottom: '0.5rem' }}>{overlay.desc}</p>}
            {overlay.info && <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{overlay.info}</p>}
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
