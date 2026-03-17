import { useEffect, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { itemsApi } from '@/api/items'
import type { UserItem } from '@/types'
import AccountLayout from '@/templates/layout/AccountLayout'
import '@/styles/my-items.css'

const TYPE_FILTERS = ['all', 'weapon', 'armor', 'item', 'animal'] as const
type TypeFilter = typeof TYPE_FILTERS[number]

export default function MyItems() {
  const { t } = useI18n()
  const [items, setItems] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<TypeFilter>('all')

  useEffect(() => {
    itemsApi.getMyItems()
      .then(data => setItems(data.items ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const visible = filter === 'all'
    ? items
    : items.filter(i => {
        if (filter === 'weapon') return i.is_weapon
        if (filter === 'armor')  return i.is_armor
        if (filter === 'item')   return i.is_item
        if (filter === 'animal') return i.is_animal
        return true
      })

  function rarityKey(r: string | null) {
    return r ?? 'none'
  }

  return (
    <AccountLayout>
      <section className="myitems-page">
        <div className="myitems-container">
          <div className="myitems-header">
            <h1 className="myitems-title">{t('items.title')}</h1>
            <p className="myitems-subtitle">{t('items.subtitle')}</p>
          </div>

          <div className="myitems-filters">
            {TYPE_FILTERS.map(f => (
              <button
                key={f}
                className={`myitems-filter-btn${filter === f ? ' myitems-filter-btn--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {t(`items.filter.${f}`)}
              </button>
            ))}
          </div>

          {loading && (
            <div className="myitems-loading">
              <div className="myitems-spinner" />
            </div>
          )}

          {!loading && error && (
            <p className="myitems-empty">{t('items.error')}</p>
          )}

          {!loading && !error && visible.length === 0 && (
            <p className="myitems-empty">{t('items.empty')}</p>
          )}

          {!loading && !error && visible.length > 0 && (
            <div className="myitems-grid">
              {visible.map(item => (
                <div key={item.item_id} className={`myitems-card myitems-card--${rarityKey(item.rarity)}`}>
                  {item.image_url
                    ? <img className="myitems-card__img" src={item.image_url} alt={item.name} />
                    : <div className="myitems-card__img-placeholder">{item.name[0]}</div>
                  }
                  <div className="myitems-card__name">{item.name}</div>
                  <span className={`myitems-rarity myitems-rarity--${rarityKey(item.rarity)}`}>
                    {item.rarity ?? t('items.rarity.none')}
                  </span>
                  {item.quantity > 1 && (
                    <span className="myitems-card__qty">{t('items.qty')}{item.quantity}</span>
                  )}
                  {item.perks.length > 0 && (
                    <ul className="myitems-card__perks">
                      {item.perks.map((p, i) => (
                        <li key={i} className="myitems-card__perk">{p}</li>
                      ))}
                    </ul>
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
