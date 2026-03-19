import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { progressionApi, type LeaderboardEntry } from '@/api/progression'
import { useI18n } from '@/contexts/I18nContext'
import AccountLayout from '@/templates/layout/AccountLayout'
import '@/styles/leaderboard.css'

const SORT_OPTIONS = ['level', 'gold'] as const
type SortOption = typeof SORT_OPTIONS[number]

function displayName(e: LeaderboardEntry): string {
  return e.nickname || e.username || e.discord_username || `@${e.user_id.slice(0, 8)}`
}

function LbRow({ e, isSelf = false }: { e: LeaderboardEntry; isSelf?: boolean }) {
  const name = displayName(e)
  const rank = e.prog_rank || 'D'
  const hasAccount = e.username !== ''

  const rowClass = isSelf
    ? 'lb-row lb-row--self'
    : `lb-row${e.rank <= 3 ? ` lb-row--top${e.rank}` : ''}`

  const playerInner = (
    <>
      <div className="lb-avatar-wrap">
        {e.avatar_url
          ? <img className="lb-avatar" src={e.avatar_url} alt="" />
          : <span className="lb-avatar-initial">{(name[0] ?? '?').toUpperCase()}</span>
        }
      </div>
      <div className="lb-player-info">
        <span className="lb-player-name">{name}</span>
        {e.nickname && e.username && (
          <span className="lb-player-handle">@{e.username}</span>
        )}
      </div>
    </>
  )

  return (
    <tr className={rowClass}>
      <td className="lb-td lb-td--rank">
        {e.rank <= 3 && !isSelf
          ? <span className={`lb-medal lb-medal--${e.rank}`}>{e.rank}</span>
          : <span className="lb-rank-num">{e.rank}</span>
        }
      </td>
      <td className="lb-td lb-td--player">
        {hasAccount
          ? <Link className="lb-player" to={`/user?u=${encodeURIComponent(e.username)}`}>{playerInner}</Link>
          : <span className="lb-player">{playerInner}</span>
        }
      </td>
      <td className="lb-td lb-td--level">
        <div className="lb-level-wrap">
          <span className={`lb-rank-badge lb-rank-badge--${rank}`}>{rank}</span>
          <span className="lb-level-num">{e.level}</span>
        </div>
      </td>
      <td className="lb-td lb-td--gold">
        <span className="lb-gold">
          <span className="lb-gold-icon">◆</span>
          {e.gold.toLocaleString()}
        </span>
      </td>
    </tr>
  )
}

export default function Leaderboard() {
  const { t } = useI18n()
  const [limit, setLimit] = useState(10)
  const [sort, setSort] = useState<SortOption>('level')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myPosition, setMyPosition] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    progressionApi.getLeaderboard(limit)
      .then(res => {
        setEntries(res.entries)
        setMyPosition(res.my_position)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [limit])

  const sorted = useMemo(() => {
    const copy = [...entries]
    if (sort === 'level') {
      copy.sort((a, b) => b.level - a.level || b.xp - a.xp)
    } else {
      copy.sort((a, b) => b.gold - a.gold)
    }
    return copy.map((e, i) => ({ ...e, rank: i + 1 }))
  }, [entries, sort])

  return (
    <AccountLayout>
      <section className="section">
        <div className="container">
          <h1 className="section-title"><span className="accent">{t('leaderboard.title')}</span></h1>
          <p className="lb-subtitle">{t('leaderboard.subtitle')}</p>

          <div className="lb-filters">
            {SORT_OPTIONS.map(s => (
              <button
                key={s}
                className={`lb-filter-btn${sort === s ? ' lb-filter-btn--active' : ''}`}
                onClick={() => setSort(s)}
              >
                {t(`leaderboard.sort.${s}`)}
              </button>
            ))}
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
            <>
              <div className="lb-table-wrap">
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th className="lb-th lb-th--rank">#</th>
                      <th className="lb-th lb-th--player">{t('leaderboard.col.player')}</th>
                      <th className="lb-th lb-th--level">{t('leaderboard.col.level')}</th>
                      <th className="lb-th lb-th--gold">{t('leaderboard.col.gold')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(e => <LbRow key={e.user_id} e={e} />)}

                    {myPosition && (
                      <>
                        <tr className="lb-separator-row">
                          <td colSpan={4} className="lb-separator-cell">···</td>
                        </tr>
                        <LbRow e={myPosition} isSelf />
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {limit === 10 && (
                <div className="lb-show-more-wrap">
                  <button className="lb-show-more" onClick={() => setLimit(50)}>
                    {t('leaderboard.show_more')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </AccountLayout>
  )
}
