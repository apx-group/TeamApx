import { useEffect, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { badgesApi } from '@/api/badges'
import type { Badge } from '@/types'
import AccountLayout from '@/templates/layout/AccountLayout'

interface BadgeOverlay {
  name: string
  img: string
  level: number
  maxLevel: number
  desc: string
  info: string
}

export default function Badges() {
  const { t } = useI18n()
  const [badges, setBadges] = useState<Badge[]>([])
  const [error, setError] = useState('')
  const [overlay, setOverlay] = useState<BadgeOverlay | null>(null)

  useEffect(() => {
    badgesApi.getMyBadges()
      .then(d => setBadges(d.badges || []))
      .catch(() => setError(t('badges.loadError')))
  }, [])

  const visibleBadges = badges.filter(b => b.level > 0 || b.available)

  // Group by category
  const groups: Record<string, Badge[]> = {}
  const order: string[] = []
  visibleBadges.forEach(b => {
    const cat = b.category || t('badges.category.other')
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
              {t('badges.empty')}
            </p>
          )}

          <div id="badges-container">
            {order.map(cat => (
              <div key={cat}>
                <p className="badges-section-title">{cat}</p>
                <div className="badges-grid">
                  {groups[cat].map(b => {
                    const hasLevels = b.max_level > 0
                    const isLocked = hasLevels ? b.level === 0 : !b.owned
                    const lvlText = isLocked ? t('badges.locked') : (hasLevels ? `Level ${b.level}` : '')
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
                {overlay.level === 0 ? t('badges.locked') : `Level ${overlay.level} / ${overlay.maxLevel}`}
              </p>
            )}
            {/* Timeline */}
            {overlay.maxLevel > 0 && (
              <div className="badge-timeline" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, margin: '1.5rem 0', overflowX: 'auto' }}>
                {Array.from({ length: overlay.maxLevel }, (_, i) => {
                  const lvl = i + 1
                  const isAchieved = overlay.level > 0 && lvl <= overlay.level
                  const isCurrent = overlay.level > 0 && lvl === overlay.level
                  return (
                    <div key={lvl} style={{ display: 'contents' }}>
                      <div
                        className={`timeline-node${isAchieved ? ' achieved' : ''}${isCurrent ? ' current' : ''}`}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <div className="tl-dot" style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: isAchieved ? '2px solid var(--clr-accent)' : '2px solid var(--clr-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={overlay.img} alt={`Level ${lvl}`} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: isAchieved ? 1 : 0.35 }} loading="lazy" />
                        </div>
                        <span className="tl-label" style={{ fontSize: '0.65rem', color: isAchieved ? 'var(--clr-accent)' : 'var(--clr-text-muted)' }}>Level {lvl}</span>
                      </div>
                      {lvl < overlay.maxLevel && (
                        <div
                          className={`tl-connector${overlay.level > 0 && lvl < overlay.level ? ' achieved' : ''}`}
                          style={{ width: 24, height: 2, background: overlay.level > 0 && lvl < overlay.level ? 'var(--clr-accent)' : 'var(--clr-text-muted)', alignSelf: 'flex-start', marginTop: 19, flexShrink: 0, opacity: 0.5 }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {overlay.desc && <p style={{ color: 'var(--clr-text-muted)', marginBottom: '0.5rem' }}>{overlay.desc}</p>}
            {overlay.info && <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{overlay.info}</p>}
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
