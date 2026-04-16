import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'

const API = '/dashboard/api/stats'
const DOMAIN = 'apx-team.com'

interface TooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)',
      borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.85rem',
      fontSize: '0.8125rem', color: 'var(--clr-text)',
    }}>
      <div style={{ color: 'var(--clr-text-muted)', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--clr-accent-light)' }}>{payload[0].value} views</div>
    </div>
  )
}

// ── Page details (expandable) ─────────────────────────────────────────────────
function PageDetails({ pages }: { pages: StatItem[] }) {
  const max = pages[0]?.count || 1
  return (
    <div className="dash-page-details">
      <div className="dash-page-details-header"><span>Page</span><span>Views</span></div>
      {pages.length === 0
        ? <span className="dash-list-empty">No data yet</span>
        : pages.map((p, i) => (
          <div key={i} className="dash-page-details-row">
            <span className="dash-page-details-rank">#{i + 1}</span>
            <span className="dash-page-details-url">
              <span className="dash-page-details-domain">{DOMAIN}</span>
              <span className="dash-page-details-path">{p.path}</span>
            </span>
            <div className="dash-page-details-bar-wrap">
              <div className="dash-page-details-bar" style={{ width: `${(p.count / max) * 100}%` }} />
            </div>
            <span className="dash-page-details-count">{p.count.toLocaleString()}</span>
          </div>
        ))
      }
    </div>
  )
}

interface StatItem {
  count: number
  [key: string]: string | number
}

// ── Top list ──────────────────────────────────────────────────────────────────
function TopList({ title, items, labelKey }: { title: string; items: StatItem[]; labelKey: string }) {
  const max = items[0]?.count || 1
  return (
    <div className="dash-section-card" style={{ marginBottom: 0 }}>
      <div className="dash-section-header">
        <span className="dash-section-title">{title}</span>
        <span className="dash-section-meta">Top {items.length}</span>
      </div>
      {items.length === 0
        ? <span className="dash-list-empty">No data yet</span>
        : items.map((item, i) => (
          <div key={i} className="dash-list-item">
            <span className="dash-list-rank">#{i + 1}</span>
            <span className="dash-list-label">{item[labelKey]}</span>
            <div className="dash-list-bar-wrap">
              <div className="dash-list-bar" style={{ width: `${(item.count / max) * 80}px` }} />
            </div>
            <span className="dash-list-count">{item.count}</span>
          </div>
        ))
      }
    </div>
  )
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export default function Dashboard() {
  interface UptimeData {
    last_status: boolean
    uptime_percent_24h: number
    last_response_time: number
  }

  interface PageviewEntry {
    date: string
    count: number
  }

  const [uptime, setUptime]           = useState<UptimeData | null>(null)
  const [pageviews, setPageviews]     = useState<PageviewEntry[]>([])
  const [topPages, setTopPages]       = useState<StatItem[]>([])
  const [topCommands, setTopCommands] = useState<StatItem[]>([])
  const [userCount, setUserCount]     = useState(0)
  const [loading, setLoading]         = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/uptime`).then(r => r.json()),
      fetch(`${API}/pageviews-daily`).then(r => r.json()),
      fetch(`${API}/top-pages`).then(r => r.json()),
      fetch(`${API}/top-commands`).then(r => r.json()),
      fetch(`${API}/users-count`).then(r => r.json()),
    ])
      .then(([up, pv, pages, cmds, users]) => {
        setUptime(up)
        setPageviews(pv.data || [])
        setTopPages(pages.data || [])
        setTopCommands(cmds.data || [])
        setUserCount(users.count || 0)
        setLoading(false)
      })
      .catch(err => { console.error(err); setLoading(false) })
  }, [])

  const chartData = pageviews.map(d => ({ ...d, date: d.date.slice(5) }))
  const online    = uptime?.last_status ?? false

  if (loading) {
    return (
      <div className="container">
        <div className="dash-loading">Loading stats…</div>
      </div>
    )
  }

  return (
    <div className="container dashboard-page">
      <div className="page-header">
        <h1 className="page-title">APX <span>Stats</span></h1>
        <p className="page-subtitle">Live overview of website &amp; bot activity</p>
      </div>

      {/* ── Uptime + User stat cards ── */}
      <div className="dash-stats-grid">
        <div className="dash-stat-card">
          <span className="dash-stat-label">Website Status</span>
          <div className={`dash-status-row ${online ? 'online' : 'offline'}`}>
            <span className={`dash-status-dot ${online ? 'online' : 'offline'}`} />
            {online ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="dash-stat-card">
          <span className="dash-stat-label">Uptime (24h)</span>
          <span className="dash-stat-value accent">{uptime?.uptime_percent_24h ?? '—'}%</span>
        </div>
        <div className="dash-stat-card">
          <span className="dash-stat-label">Response Time</span>
          <span className="dash-stat-value">
            {uptime?.last_response_time ?? '—'}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--clr-text-muted)', marginLeft: '0.25rem' }}>ms</span>
          </span>
        </div>
        <div className="dash-stat-card">
          <span className="dash-stat-label">Total Users</span>
          <span className="dash-stat-value accent">{userCount.toLocaleString()}</span>
          <span className="dash-stat-sub">Registered on apx-team.com</span>
        </div>
      </div>

      {/* ── Pageviews chart ── */}
      <div className="dash-section-card">
        <div className="dash-section-header">
          <span className="dash-section-title">Pageviews</span>
          <span className="dash-section-meta">Last 30 days</span>
          <button className="dash-details-toggle" onClick={() => setShowDetails(v => !v)}>
            {showDetails ? 'Hide Details' : 'Details'}
          </button>
        </div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#bea05d" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#bea05d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8888a0' }} axisLine={false} tickLine={false} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8888a0' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#2a2a3a' }} />
              <Area type="monotone" dataKey="count" stroke="#bea05d" strokeWidth={2}
                fill="url(#dashGrad)" dot={false} activeDot={{ r: 4, fill: '#d4bb7e', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {showDetails && <PageDetails pages={topPages} />}
      </div>

      {/* ── Top Pages + Top Commands ── */}
      <div className="dash-lists-grid">
        <TopList title="Top Pages"    items={topPages}    labelKey="path" />
        <TopList title="Top Commands" items={topCommands} labelKey="command" />
      </div>
    </div>
  )
}
