import { useEffect, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { adminItemsApi } from '@/api/items'
import type { Item } from '@/types'
import AccountLayout from '@/templates/layout/AccountLayout'
import '@/styles/admin-items.css'

const RARITIES = ['E-Rank', 'D-Rank', 'C-Rank', 'B-Rank', 'A-Rank', 'S-Rank']

export default function AdminItems() {
  const { t } = useI18n()
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [newName, setNewName] = useState('')
  const [newRarity, setNewRarity] = useState('')
  const [newIsWeapon, setNewIsWeapon] = useState(false)
  const [newIsArmor, setNewIsArmor] = useState(false)
  const [newIsItem, setNewIsItem] = useState(false)
  const [newIsAnimal, setNewIsAnimal] = useState(false)
  const [newPerks, setNewPerks] = useState<string[]>([])
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [newImagePreview, setNewImagePreview] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    try {
      const d = await adminItemsApi.getItems()
      setItems(d.items || [])
    } catch {
      setError(t('admin.accessDenied'))
    }
  }

  function openCreate() {
    setNewName('')
    setNewRarity('')
    setNewIsWeapon(false)
    setNewIsArmor(false)
    setNewIsItem(false)
    setNewIsAnimal(false)
    setNewPerks([])
    setNewImageFile(null)
    setNewImagePreview('')
    setFormError('')
    setCreating(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { setFormError(t('admin.items.field.name') + ' required'); return }
    setSaving(true)
    setFormError('')
    try {
      let imageUrl = ''
      if (newImageFile) {
        const up = await adminItemsApi.uploadImage(newImageFile)
        imageUrl = up.image_url
      }
      await adminItemsApi.createItem({
        name: newName.trim(),
        rarity: newRarity,
        image_url: imageUrl,
        is_weapon: newIsWeapon,
        is_armor: newIsArmor,
        is_item: newIsItem,
        is_animal: newIsAnimal,
        perks: newPerks.filter(p => p.trim() !== ''),
      })
      setCreating(false)
      loadItems()
    } catch {
      setFormError(t('admin.items.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm(t('admin.items.confirmDelete'))) return
    try {
      await adminItemsApi.deleteItem(itemId)
      loadItems()
    } catch {
      alert(t('admin.items.deleteError'))
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewImageFile(file)
    setNewImagePreview(URL.createObjectURL(file))
  }

  function addPerk() {
    setNewPerks(p => [...p, ''])
  }

  function updatePerk(i: number, val: string) {
    setNewPerks(p => p.map((x, idx) => idx === i ? val : x))
  }

  function removePerk(i: number) {
    setNewPerks(p => p.filter((_, idx) => idx !== i))
  }

  function getRarityClass(r: string | null) {
    return r ? `rarity--${r}` : 'rarity--none'
  }

  function getTypeLabel(item: Item) {
    const parts: string[] = []
    if (item.is_weapon) parts.push(t('admin.items.field.weapon'))
    if (item.is_armor) parts.push(t('admin.items.field.armor'))
    if (item.is_item) parts.push(t('admin.items.field.item'))
    if (item.is_animal) parts.push(t('admin.items.field.animal'))
    return parts.join(', ') || '—'
  }

  return (
    <AccountLayout>
      <section className="section admin-section">
        <div className="container">
          <h1 className="section-title">
            <span className="accent">{t('admin.items.title')}</span>
          </h1>

          {error && <p className="admin-items-error">{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={openCreate}>
              {t('admin.items.new')}
            </button>
          </div>

          <div className="admin-items-list">
            {items.map(item => (
              <div key={item.item_id} className="admin-items-row">
                {item.image_url
                  ? <img className="admin-items-row__img" src={item.image_url} alt={item.name} />
                  : <div className="admin-items-row__img-placeholder">{item.name[0]}</div>
                }
                <span className="admin-items-row__seq">#{item.seq_id}</span>
                <span className="admin-items-row__name">{item.name}</span>
                <span className={`admin-items-row__rarity ${getRarityClass(item.rarity)}`}>
                  {item.rarity ?? t('items.rarity.none')}
                </span>
                <span className="admin-items-row__types">{getTypeLabel(item)}</span>
                <button
                  className="admin-action-btn danger"
                  onClick={() => handleDelete(item.item_id)}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {creating && (
        <div className="admin-items-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCreating(false) }}>
          <div className="admin-items-modal">
            <h3>{t('admin.items.modal.create')}</h3>

            {formError && <p className="admin-items-error">{formError}</p>}

            <form onSubmit={handleCreate}>
              <div className="admin-items-field">
                <label>{t('admin.items.field.name')}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="admin-items-field">
                <label>{t('admin.items.field.rarity')}</label>
                <select value={newRarity} onChange={e => setNewRarity(e.target.value)}>
                  <option value="">{t('admin.items.field.rarity.none')}</option>
                  {RARITIES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="admin-items-field">
                <label>{t('admin.items.field.types')}</label>
                <div className="admin-items-checkboxes">
                  <label>
                    <input type="checkbox" checked={newIsWeapon} onChange={e => setNewIsWeapon(e.target.checked)} />
                    {t('admin.items.field.weapon')}
                  </label>
                  <label>
                    <input type="checkbox" checked={newIsArmor} onChange={e => setNewIsArmor(e.target.checked)} />
                    {t('admin.items.field.armor')}
                  </label>
                  <label>
                    <input type="checkbox" checked={newIsItem} onChange={e => setNewIsItem(e.target.checked)} />
                    {t('admin.items.field.item')}
                  </label>
                  <label>
                    <input type="checkbox" checked={newIsAnimal} onChange={e => setNewIsAnimal(e.target.checked)} />
                    {t('admin.items.field.animal')}
                  </label>
                </div>
              </div>

              <div className="admin-items-field">
                <label>{t('admin.items.field.perks')}</label>
                <div className="admin-items-perks">
                  {newPerks.map((perk, i) => (
                    <div key={i} className="admin-items-perk-row">
                      <input
                        type="text"
                        value={perk}
                        placeholder={t('admin.items.field.perk.placeholder')}
                        onChange={e => updatePerk(i, e.target.value)}
                      />
                      <button type="button" className="admin-items-perk-remove" onClick={() => removePerk(i)}>✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn-outline" style={{ fontSize: 'var(--fs-sm)', padding: '0.3rem 0.7rem' }} onClick={addPerk}>
                  {t('admin.items.field.perk.add')}
                </button>
              </div>

              <div className="admin-items-field">
                <label>{t('admin.items.field.image')}</label>
                <input type="file" accept="image/*" onChange={handleImageSelect} />
                {newImagePreview && (
                  <img className="admin-items-preview" src={newImagePreview} alt={t('admin.items.field.preview')} />
                )}
              </div>

              <div className="admin-items-modal-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '...' : t('admin.save')}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setCreating(false)}>
                  {t('admin.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
