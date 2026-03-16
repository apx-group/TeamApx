import { useEffect, useState } from 'react'
import { progressionApi, type InventoryItem } from '@/api/progression'
import { useI18n } from '@/contexts/I18nContext'
import AccountLayout from '@/templates/layout/AccountLayout'
import '@/styles/inventory.css'

const TYPE_LABELS: Record<string, string> = {
  cosmetic:  'Kosmetik',
  boost_xp:  'XP Boost',
  boost_coin: 'Coin Boost',
  title:     'Titel',
  frame:     'Rahmen',
}

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common']

export default function Inventory() {
  const { t } = useI18n()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [balance, setBalance] = useState(0)
  const [level, setLevel] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    progressionApi.getMe()
      .then(data => {
        setBalance(data.currency_balance)
        setLevel(data.level)
        const sorted = [...(data.inventory ?? [])].sort((a, b) =>
          RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
        )
        setInventory(sorted)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const types = ['all', ...Array.from(new Set(inventory.map(i => i.item_type)))]
  const visible = filter === 'all' ? inventory : inventory.filter(i => i.item_type === filter)

  return (
    <AccountLayout>
      <section className="inv-page">
        <div className="inv-container">
          <div className="inv-header">
            <div>
              <h1 className="inv-title">{t('inventory.title')}</h1>
              <p className="inv-subtitle">{t('inventory.subtitle')}</p>
            </div>
            <div className="inv-stats">
              <div className="inv-stat">
                <span className="inv-stat-label">{t('inventory.level')}</span>
                <span className="inv-stat-value">{level}</span>
              </div>
              <div className="inv-stat">
                <span className="inv-stat-label">{t('inventory.coins')}</span>
                <span className="inv-stat-value inv-stat-value--coins">
                  <span className="inv-coins-icon">◆</span>
                  {balance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {types.length > 1 && (
            <div className="inv-filters">
              {types.map(type => (
                <button
                  key={type}
                  className={`inv-filter-btn${filter === type ? ' inv-filter-btn--active' : ''}`}
                  onClick={() => setFilter(type)}
                >
                  {type === 'all' ? t('inventory.filter.all') : (TYPE_LABELS[type] ?? type)}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="inv-loading">
              <div className="inv-spinner" />
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="inv-empty">
              <p>{t('inventory.empty')}</p>
            </div>
          )}

          {!loading && visible.length > 0 && (
            <div className="inv-grid">
              {visible.map(item => (
                <div
                  key={item.inventory_id}
                  className={`inv-card inv-card--${item.rarity}${item.equipped ? ' inv-card--equipped' : ''}`}
                >
                  <div className="inv-card__icon">
                    <span className="inv-card__icon-placeholder">{item.name.charAt(0)}</span>
                  </div>
                  <div className="inv-card__body">
                    <span className="inv-card__name">{item.name}</span>
                    <div className="inv-card__meta">
                      <span className={`inv-rarity inv-rarity--${item.rarity}`}>
                        {item.rarity}
                      </span>
                      <span className="inv-type">
                        {TYPE_LABELS[item.item_type] ?? item.item_type}
                      </span>
                    </div>
                  </div>
                  {item.equipped && (
                    <span className="inv-card__equipped-badge">{t('inventory.equipped')}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AccountLayout>
  )
}
