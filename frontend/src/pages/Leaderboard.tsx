import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { progressionApi, type LeaderboardEntry } from '@/api/progression'
import { useI18n } from '@/contexts/I18nContext'
import '@/styles/leaderboard.css'

const RANK_THRESHOLDS = [
  { rank: 'S', min: 500 },
  { rank: 'A', min: 300 },
  { rank: 'B', min: 200 },
  { rank: 'C', min: 100 },
  { rank: 'D', min: 0 },
]

function levelToRank(level: number): string {
  return RANK_THRESHOLDS.find(r => level >= r.min)?.rank ?? 'D'
}

export default function Leaderboard() {
  const { t } = useI18n()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    progressionApi.getLeaderboard(50, 0)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="lb-page">
      <div className="lb-container">
        <div className="lb-header">
          <h1 className="lb-title">{t('leaderboard.title')}</h1>
          <p className="lb-subtitle">{t('leaderboard.subtitle')}</p>
        </div>

        {loading && (
          <div className="lb-loading">
            <div className="lb-spinner" />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <p className="lb-empty">{t('leaderboard.empty')}</p>
        )}

        {!loading && entries.length > 0 && (
          <div className="lb-table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th className="lb-th lb-th--rank">#</th>
                  <th className="lb-th lb-th--player">{t('leaderboard.col.player')}</th>
                  <th className="lb-th lb-th--level">{t('leaderboard.col.level')}</th>
                  <th className="lb-th lb-th--coins">{t('leaderboard.col.coins')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const rank = levelToRank(e.level)
                  const display = e.nickname || e.username
                  return (
                    <tr key={e.rank} className={`lb-row${e.rank <= 3 ? ` lb-row--top${e.rank}` : ''}`}>
                      <td className="lb-td lb-td--rank">
                        {e.rank <= 3
                          ? <span className={`lb-medal lb-medal--${e.rank}`}>{e.rank}</span>
                          : <span className="lb-rank-num">{e.rank}</span>
                        }
                      </td>
                      <td className="lb-td lb-td--player">
                        <Link className="lb-player" to={`/user?u=${encodeURIComponent(e.username)}`}>
                          <div className="lb-avatar-wrap">
                            {e.avatar_url
                              ? <img className="lb-avatar" src={e.avatar_url} alt="" />
                              : <span className="lb-avatar-initial">{(display[0] ?? '?').toUpperCase()}</span>
                            }
                          </div>
                          <div className="lb-player-info">
                            <span className="lb-player-name">{display}</span>
                            {e.nickname && <span className="lb-player-handle">@{e.username}</span>}
                          </div>
                        </Link>
                      </td>
                      <td className="lb-td lb-td--level">
                        <div className="lb-level-wrap">
                          <span className={`lb-rank-badge lb-rank-badge--${rank}`}>{rank}</span>
                          <span className="lb-level-num">{e.level}</span>
                        </div>
                      </td>
                      <td className="lb-td lb-td--coins">
                        <span className="lb-coins">
                          <span className="lb-coins-icon">◆</span>
                          {e.currency_balance.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
