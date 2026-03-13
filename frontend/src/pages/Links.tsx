import { useEffect, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { authApi } from '@/api/auth'
import AccountLayout from '@/templates/layout/AccountLayout'

const SERVICES = [
  {
    id: 'discord',
    nameKey: 'links.service.discord.name',
    descKey: 'links.service.discord.desc',
    iconColor: '#5865F2',
    iconBg: 'rgba(88,101,242,0.15)',
    icon: '/icons/DISCORD.svg',
    oauthPath: '/auth/discord',
  },
  {
    id: 'challengermode',
    nameKey: 'links.service.challengermode.name',
    descKey: 'links.service.challengermode.desc',
    iconColor: '#f5a623',
    iconBg: 'rgba(245,166,35,0.15)',
    icon: '/icons/CM.svg',
    oauthPath: '/auth/challengermode',
  },
  {
    id: 'twitch',
    nameKey: 'links.service.twitch.name',
    descKey: 'links.service.twitch.desc',
    iconColor: '#9146FF',
    iconBg: 'rgba(145,70,255,0.15)',
    icon: '/icons/TWITCH.svg',
    oauthPath: '/auth/twitch',
  },
  {
    id: 'youtube',
    nameKey: 'links.service.youtube.name',
    descKey: 'links.service.youtube.desc',
    iconColor: '#FF0000',
    iconBg: 'rgba(255,0,0,0.15)',
    icon: '/icons/YOUTUBE.svg',
    oauthPath: '/auth/youtube',
  },
] as const

type ServiceId = typeof SERVICES[number]['id']

interface LinkedMap {
  [key: string]: { username: string; service_id: string; avatar_url: string }
}

export default function Links() {
  const { t } = useI18n()
  const [linkedMap, setLinkedMap] = useState<LinkedMap>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [modal, setModal] = useState<ServiceId | null>(null)
  const [disconnecting, setDisconnecting] = useState<ServiceId | null>(null)

  useEffect(() => {
    loadLinks()
    checkOAuthResult()
  }, [])

  async function loadLinks() {
    try {
      const data = await authApi.getLinks()
      const map: LinkedMap = {}
      ;(data.links || []).forEach(l => {
        map[l.service] = { username: l.username, service_id: l.service_id, avatar_url: l.avatar_url }
      })
      setLinkedMap(map)
    } catch {}
  }

  function checkOAuthResult() {
    const params = new URLSearchParams(window.location.search)
    const keys = ['discord', 'cm', 'twitch', 'yt']
    if (keys.some(k => params.has(k))) {
      history.replaceState({}, '', window.location.pathname)
      loadLinks()
    }
  }

  async function handleDisconnect(id: ServiceId) {
    setDisconnecting(id)
    try {
      await authApi.deleteLink(id)
      setLinkedMap(m => {
        const next = { ...m }
        delete next[id]
        return next
      })
    } catch {}
    setDisconnecting(null)
  }

  function handleConnect(id: ServiceId) {
    const svc = SERVICES.find(s => s.id === id)!
    window.location.href = svc.oauthPath
  }

  const filtered = searchQuery
    ? SERVICES.filter(s => (t(s.nameKey) + ' ' + t(s.descKey)).toLowerCase().includes(searchQuery.toLowerCase()))
    : SERVICES

  return (
    <AccountLayout>
      <section className="section links-section">
        <div className="container">
          <h1 className="section-title">
            {t('account.nav.links')}
          </h1>

          <div className="form-field" style={{ maxWidth: 500, marginBottom: '1.5rem' }}>
            <input
              id="links-search"
              type="text"
              placeholder="Suchen…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="links-grid" id="links-grid">
            {filtered.map(svc => {
              const linked = linkedMap[svc.id]
              const connected = !!linked

              return (
                <div key={svc.id} className="link-card">
                  <div className="link-card__icon" style={{ color: svc.iconColor, background: svc.iconBg }}>
                    <img src={svc.icon} alt={t(svc.nameKey)} style={{ width: 28, height: 28 }} />
                  </div>
                  <div className="link-card__body">
                    <div className="link-card__name">{t(svc.nameKey)}</div>
                    <div className="link-card__desc">{connected ? '' : t(svc.descKey)}</div>
                    {connected && (
                      <div className="link-card__user">
                        {linked.avatar_url && <img className="link-card__user-avatar" src={linked.avatar_url} alt="" loading="lazy" />}
                        <span className="link-card__user-name">{linked.username}</span>
                      </div>
                    )}
                  </div>
                  <div className="link-card__action">
                    {connected && <span className="link-card__connected-label">{t('links.connected')}</span>}
                    <button
                      className={`link-btn ${connected ? 'link-btn--disconnect' : 'link-btn--connect'}`}
                      onClick={() => connected ? handleDisconnect(svc.id) : handleConnect(svc.id)}
                      disabled={disconnecting === svc.id}
                    >
                      {connected ? t('links.disconnect') : t('links.connect')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {modal && (
        <div className="links-modal active" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="links-modal__box">
            <button className="links-modal__close" onClick={() => setModal(null)}>&times;</button>
            <h3 id="links-modal-title">{t('links.modal.connect')} {t(SERVICES.find(s => s.id === modal)!.nameKey)}</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={() => handleConnect(modal)}>
                {t('links.modal.oauthPrefix')} {t(SERVICES.find(s => s.id === modal)!.nameKey)}
              </button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
