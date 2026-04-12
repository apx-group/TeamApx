import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { adminBadgesApi } from '@/api/badges'
import { usersApi, adminUsersApi } from '@/api/users'
import type { AdminBadge } from '@/types'
import AccountLayout from '@/templates/layout/AccountLayout'

export default function AdminBadges() {
  const { t } = useI18n()
  const [badges, setBadges] = useState<AdminBadge[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<AdminBadge> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)

  const [showCrop, setShowCrop] = useState(false)
  const [cropSrc, setCropSrc] = useState('')
  const [cropPreviewUrl, setCropPreviewUrl] = useState('')

  // Manage badge (assign / remove)
  const [assignUsername, setAssignUsername] = useState('')
  const [assignSearchQuery, setAssignSearchQuery] = useState('')
  const [assignSearchResults, setAssignSearchResults] = useState<Array<{ username: string; nickname: string; avatar_url: string }>>([])
  const assignSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [assignBadgeId, setAssignBadgeId] = useState(0)
  const [assignLevel, setAssignLevel] = useState(1)
  const [assignSuccess, setAssignSuccess] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [assignDeleteSuccess, setAssignDeleteSuccess] = useState(false)
  const [assignDeleteError, setAssignDeleteError] = useState('')

  async function loadBadges() {
    try {
      const d = await adminBadgesApi.getBadges()
      setBadges(d.badges || [])
    } catch {
      setError(t('admin.accessDenied'))
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBadges()
  }, [])

  function setField(field: string, value: string | boolean | number) {
    setEditing(b => b ? { ...b, [field]: value } : b)
  }

  async function saveBadge() {
    if (!editing) return
    try {
      let badgeId: number
      if (isNew) {
        const result = await adminBadgesApi.createBadge(editing)
        badgeId = (result as { id: number }).id
      } else {
        badgeId = editing.id!
      }

      let finalData = { ...editing, id: badgeId }
      if (imageFile) {
        const up = await adminBadgesApi.uploadImage(badgeId, imageFile) as { image_url: string }
        finalData = { ...finalData, image_url: up.image_url }
      }

      await adminBadgesApi.updateBadge(badgeId, finalData)

      setEditing(null)
      setImageFile(null)
      setCropPreviewUrl('')
      loadBadges()
    } catch { alert(t('admin.saveError')) }
  }

  async function deleteBadge(id: number) {
    if (!confirm(t('admin.badges.confirmDelete'))) return
    await adminBadgesApi.deleteBadge(id)
    loadBadges()
  }

  async function handleToggleAvailable(badge: AdminBadge) {
    try {
      await adminBadgesApi.updateBadge(badge.id, { ...badge, available: !badge.available })
      loadBadges()
    } catch { alert(t('admin.badges.toggleError')) }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert(t('admin.badges.tooBig')); return }
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setShowCrop(true)
  }

  function handleAssignSearch(q: string) {
    setAssignSearchQuery(q)
    setAssignUsername('')
    if (assignSearchTimer.current) clearTimeout(assignSearchTimer.current)
    if (!q.trim()) { setAssignSearchResults([]); return }
    assignSearchTimer.current = setTimeout(() => runAssignSearch(q), 250)
  }

  async function runAssignSearch(q: string) {
    try {
      const data = await usersApi.search(q)
      setAssignSearchResults(data.users || [])
    } catch {
      // no-op
    }
  }

  async function handleAssign() {
    setAssignError('')
    setAssignSuccess(false)
    try {
      await adminBadgesApi.assignBadge(assignUsername, assignBadgeId, assignLevel)
      setAssignSuccess(true)
      setTimeout(() => setAssignSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setAssignError(msg || t('admin.badges.assign.error'))
    }
  }

  async function handleDelete() {
    if (!assignUsername || !assignBadgeId) return
    if (!confirm(t('admin.badges.manage.delete.confirm'))) return
    setAssignDeleteError('')
    setAssignDeleteSuccess(false)
    try {
      await adminUsersApi.removeUserBadge(assignUsername, assignBadgeId)
      setAssignDeleteSuccess(true)
      setTimeout(() => setAssignDeleteSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setAssignDeleteError(msg || t('admin.badges.manage.delete.error'))
    }
  }

  const selectedBadge = badges.find(b => b.id === assignBadgeId)

  const badgeFields = [
    { field: 'name', label: 'Name' },
    { field: 'description', label: t('admin.badges.field.description') },
    { field: 'info', label: t('admin.badges.field.info') },
    { field: 'category', label: t('admin.badges.field.category') },
  ]

  return (
    <AccountLayout>
      <section className="section admin-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">{t('admin.badges.title')}</span></h1>

          {error && <p style={{ color: '#e05c5c' }}>{error}</p>}

          {/* Badge list */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Badges</h2>
            <button className="btn btn-primary" onClick={() => {
              setEditing({ name: '', description: '', info: '', category: '', available: true, max_level: 0 })
              setIsNew(true)
              setImageFile(null)
              setCropPreviewUrl('')
              if (imgInputRef.current) imgInputRef.current.value = ''
            }}>
              {t('admin.badges.new')}
            </button>
          </div>

          <div className="admin-badges-list">
            {badges.map(b => (
              <div key={b.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                {b.image_url && <img src={b.image_url} alt={b.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }} />}
                <span style={{ flex: 1, fontWeight: 600 }}>{b.name}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>{b.category}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>Lvl {b.max_level}</span>
                <span style={{ color: b.available ? 'var(--clr-accent)' : 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>
                  {b.available ? t('admin.badges.active') : t('admin.badges.inactive')}
                </span>
                <button
                  style={{ background: 'none', border: `1px solid ${b.available ? 'var(--clr-text-muted)' : 'var(--clr-accent)'}`, color: b.available ? 'var(--clr-text-muted)' : 'var(--clr-accent)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: 'var(--fs-sm)' }}
                  onClick={() => handleToggleAvailable(b)}
                >
                  {b.available ? t('admin.deactivate') : t('admin.activate')}
                </button>
                <button className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: 'var(--fs-sm)' }} onClick={() => {
                  setEditing({ ...b })
                  setIsNew(false)
                  setImageFile(null)
                  setCropPreviewUrl(b.image_url || '')
                }}>{t('admin.edit')}</button>
                <button style={{ background: 'none', border: '1px solid #e05c5c', color: '#e05c5c', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: 'var(--fs-sm)' }} onClick={() => deleteBadge(b.id)}>{t('admin.delete')}</button>
              </div>
            ))}
          </div>

          {/* Manage badge */}
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>{t('admin.badges.manage.title')}</h2>

            {/* Username search */}
            <div className="form-field" style={{ maxWidth: 400, position: 'relative' }}>
              <label>{t('admin.badges.assign.username')}</label>
              <input
                type="text"
                value={assignSearchQuery}
                onChange={e => handleAssignSearch(e.target.value)}
                placeholder={t('admin.badges.assign.username')}
              />
              {assignSearchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-sm)', zIndex: 10 }}>
                  {assignSearchResults.map(u => (
                    <button
                      key={u.username}
                      type="button"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onClick={() => {
                        setAssignUsername(u.username)
                        setAssignSearchQuery(u.nickname || u.username)
                        setAssignSearchResults([])
                      }}
                    >
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt={u.username} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--clr-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{(u.nickname || u.username).charAt(0).toUpperCase()}</div>
                      }
                      <span style={{ fontSize: 'var(--fs-sm)' }}>{u.nickname || u.username}</span>
                      {u.nickname && <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.75rem' }}>@{u.username}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Badge select */}
            <div className="form-field" style={{ maxWidth: 400 }}>
              <label>Badge</label>
              <select value={assignBadgeId} onChange={e => {
                const id = Number(e.target.value)
                setAssignBadgeId(id)
                const b = badges.find(b => b.id === id)
                if (b && b.max_level === 0) setAssignLevel(0)
                else setAssignLevel(1)
              }}>
                <option value={0}>{t('admin.badges.assign.select')}</option>
                {badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Level — only for badges with max_level > 0 */}
            {selectedBadge && selectedBadge.max_level > 0 && (
              <div className="form-field" style={{ maxWidth: 400 }}>
                <label>{t('admin.badges.assign.level')}</label>
                <input
                  type="number"
                  min={1}
                  max={selectedBadge.max_level}
                  value={assignLevel}
                  onChange={e => setAssignLevel(Number(e.target.value))}
                />
              </div>
            )}

            {assignError && <p style={{ color: '#e05c5c', marginBottom: '0.5rem' }}>{assignError}</p>}
            {assignSuccess && <p style={{ color: 'green', marginBottom: '0.5rem' }}>{t('admin.badges.assign.success')}</p>}
            {assignDeleteError && <p style={{ color: '#e05c5c', marginBottom: '0.5rem' }}>{assignDeleteError}</p>}
            {assignDeleteSuccess && <p style={{ color: 'green', marginBottom: '0.5rem' }}>{t('admin.badges.manage.delete.success')}</p>}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAssign}
                disabled={!assignUsername || !assignBadgeId}
              >
                {t('admin.assign')}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderColor: '#e05c5c', color: '#e05c5c' }}
                onClick={handleDelete}
                disabled={!assignUsername || !assignBadgeId}
              >
                {t('admin.delete')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 480, width: '90%', maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{isNew ? t('admin.badges.modal.create') : t('admin.badges.modal.edit')}</h3>

            {badgeFields.map(({ field, label }) => (
              <div key={field} className="form-field" style={{ marginBottom: '0.75rem' }}>
                <label>{label}</label>
                <input type="text" value={(editing as Record<string, unknown>)[field] as string ?? ''} onChange={e => setField(field, e.target.value)} />
              </div>
            ))}

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('admin.badges.field.maxLevel')}: <strong>{editing.max_level ?? 0}</strong></label>
              <input
                type="range"
                min={0}
                max={15}
                value={editing.max_level ?? 0}
                onChange={e => setField('max_level', Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!editing.available} onChange={e => setField('available', e.target.checked)} />
                {t('admin.badges.field.available')}
              </label>
            </div>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>{t('admin.badges.field.image')}</label>
              <input ref={imgInputRef} type="file" accept="image/*" onChange={handleImageSelect} />
              {cropPreviewUrl && <img src={cropPreviewUrl} alt={t('admin.badges.field.preview')} style={{ width: 80, height: 80, objectFit: 'contain', marginTop: '0.5rem', borderRadius: 4 }} />}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={saveBadge}>{t('admin.save')}</button>
              <button className="btn btn-outline" onClick={() => { setEditing(null); setImageFile(null); setCropPreviewUrl('') }}>{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showCrop && (
        <BadgeCropOverlay
          src={cropSrc}
          cancelLabel={t('admin.cancel')}
          saveLabel={t('admin.crop.save')}
          onSave={(file, url) => {
            setImageFile(file)
            setCropPreviewUrl(url)
            setShowCrop(false)
            URL.revokeObjectURL(cropSrc)
          }}
          onCancel={() => {
            setShowCrop(false)
            URL.revokeObjectURL(cropSrc)
            if (imgInputRef.current) imgInputRef.current.value = ''
          }}
        />
      )}
    </AccountLayout>
  )
}

interface CropOverlayProps {
  src: string
  cancelLabel: string
  saveLabel: string
  onSave: (file: File, previewUrl: string) => void
  onCancel: () => void
}

function BadgeCropOverlay({ src, cancelLabel, saveLabel, onSave, onCancel }: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [frame, setFrame] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, fx: 0, fy: 0 })
  const [imgLoaded, setImgLoaded] = useState(false)

  function getRendered() {
    const img = imgRef.current, con = containerRef.current
    if (!img || !con) return { rw: 0, rh: 0, ox: 0, oy: 0 }
    const cw = con.clientWidth, ch = con.clientHeight
    const ir = img.naturalWidth / img.naturalHeight
    const cr = cw / ch
    let rw: number, rh: number, ox: number, oy: number
    if (ir > cr) { rw = cw; rh = cw / ir; ox = 0; oy = (ch - rh) / 2 }
    else { rh = ch; rw = ch * ir; ox = (cw - rw) / 2; oy = 0 }
    return { rw, rh, ox, oy }
  }

  function initFrame() {
    const { rw, rh, ox, oy } = getRendered()
    const size = Math.min(rw, rh)
    setFrame({ x: ox + (rw - size) / 2, y: oy + (rh - size) / 2, w: size, h: size })
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (imgLoaded) initFrame()
  }, [imgLoaded])

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, fx: frame.x, fy: frame.y }
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging) return
      const { rw, rh, ox, oy } = getRendered()
      const dx = e.clientX - dragStart.current.mx, dy = e.clientY - dragStart.current.my
      setFrame(f => ({ ...f, x: Math.max(ox, Math.min(ox + rw - f.w, dragStart.current.fx + dx)), y: Math.max(oy, Math.min(oy + rh - f.h, dragStart.current.fy + dy)) }))
    }
    function onUp() { setDragging(false) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [dragging])

  function handleSave() {
    const img = imgRef.current
    if (!img) return
    const { rw, ox, oy } = getRendered()
    const scale = img.naturalWidth / rw
    const srcX = Math.round((frame.x - ox) * scale), srcY = Math.round((frame.y - oy) * scale)
    const srcW = Math.round(frame.w * scale), srcH = Math.round(frame.h * scale)
    const outSize = Math.min(srcW, 512)
    const canvas = document.createElement('canvas')
    canvas.width = outSize; canvas.height = outSize
    canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outSize, outSize)
    const tryWebP = (cb: (blob: Blob | null) => void) => {
      canvas.toBlob(b => {
        if (b && b.size > 0) { cb(b); return }
        canvas.toBlob(cb, 'image/jpeg', 0.92)
      }, 'image/webp', 0.92)
    }
    tryWebP(blob => {
      if (!blob) return
      const isWebP = blob.type === 'image/webp'
      const file = new File([blob], isWebP ? 'badge.webp' : 'badge.jpg', { type: blob.type })
      onSave(file, URL.createObjectURL(file))
    })
  }

  return (
    <div style={{ display: 'flex', position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '90vw', maxWidth: 500 }}>
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 350, background: '#111', overflow: 'hidden', borderRadius: 8 }}>
          <img ref={imgRef} src={src} alt="crop" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} onLoad={() => setImgLoaded(true)} />
          <div onMouseDown={onMouseDown} style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.w, height: frame.h, border: '2px solid var(--clr-accent)', cursor: 'move', boxSizing: 'border-box', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn btn-primary" onClick={handleSave}>{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}
