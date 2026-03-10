import { useEffect, useRef, useState } from 'react'
import { adminBadgesApi } from '@/api/badges'
import type { AdminBadge } from '@/types'
import AccountLayout from '@/components/layout/AccountLayout'

export default function AdminBadges() {
  const [badges, setBadges] = useState<AdminBadge[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<AdminBadge> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)

  const [showCrop, setShowCrop] = useState(false)
  const [cropSrc, setCropSrc] = useState('')
  const [cropPreviewUrl, setCropPreviewUrl] = useState('')

  // Assign badge
  const [assignUsername, setAssignUsername] = useState('')
  const [assignBadgeId, setAssignBadgeId] = useState(0)
  const [assignLevel, setAssignLevel] = useState(1)
  const [assignSuccess, setAssignSuccess] = useState(false)
  const [assignError, setAssignError] = useState('')

  useEffect(() => { loadBadges() }, [])

  async function loadBadges() {
    try {
      const d = await adminBadgesApi.getBadges()
      setBadges(d.badges || [])
    } catch {
      setError('Zugriff verweigert.')
    }
  }

  function setField(field: string, value: string | boolean | number) {
    setEditing(b => b ? { ...b, [field]: value } : b)
  }

  async function saveBadge() {
    if (!editing) return
    try {
      let result: AdminBadge
      if (isNew) {
        result = await adminBadgesApi.createBadge(editing)
      } else {
        result = await adminBadgesApi.updateBadge(editing.id!, editing)
      }
      if (imageFile && result.id) {
        await adminBadgesApi.uploadImage(result.id, imageFile)
      }
      setEditing(null)
      setImageFile(null)
      setCropPreviewUrl('')
      loadBadges()
    } catch { alert('Fehler beim Speichern') }
  }

  async function deleteBadge(id: number) {
    if (!confirm('Badge löschen?')) return
    await adminBadgesApi.deleteBadge(id)
    loadBadges()
  }

  async function handleToggleAvailable(badge: AdminBadge) {
    try {
      await adminBadgesApi.updateBadge(badge.id, { ...badge, available: !badge.available })
      loadBadges()
    } catch { alert('Fehler beim Umschalten') }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Bild zu groß (max 10 MB)'); return }
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setShowCrop(true)
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setAssignError('')
    setAssignSuccess(false)
    try {
      await adminBadgesApi.assignBadge(assignUsername, assignBadgeId, assignLevel)
      setAssignSuccess(true)
      setTimeout(() => setAssignSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setAssignError(msg || 'Fehler beim Zuweisen.')
    }
  }

  return (
    <AccountLayout>
      <section className="section admin-section">
        <div className="container">
          <h1 className="section-title"><span className="accent">Badges</span> verwalten</h1>

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
              + Neu
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
                  {b.available ? 'Aktiv' : 'Inaktiv'}
                </span>
                <button
                  style={{ background: 'none', border: `1px solid ${b.available ? 'var(--clr-text-muted)' : 'var(--clr-accent)'}`, color: b.available ? 'var(--clr-text-muted)' : 'var(--clr-accent)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: 'var(--fs-sm)' }}
                  onClick={() => handleToggleAvailable(b)}
                >
                  {b.available ? 'Deaktivieren' : 'Aktivieren'}
                </button>
                <button className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: 'var(--fs-sm)' }} onClick={() => {
                  setEditing({ ...b })
                  setIsNew(false)
                  setImageFile(null)
                  setCropPreviewUrl(b.image_url || '')
                }}>Bearbeiten</button>
                <button style={{ background: 'none', border: '1px solid #e05c5c', color: '#e05c5c', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: 'var(--fs-sm)' }} onClick={() => deleteBadge(b.id)}>Löschen</button>
              </div>
            ))}
          </div>

          {/* Assign badge */}
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Badge zuweisen</h2>
            <form onSubmit={handleAssign} style={{ maxWidth: 400 }}>
              <div className="form-field">
                <label>Benutzername</label>
                <input type="text" value={assignUsername} onChange={e => setAssignUsername(e.target.value)} placeholder="Benutzername" required />
              </div>
              <div className="form-field">
                <label>Badge</label>
                <select value={assignBadgeId} onChange={e => setAssignBadgeId(Number(e.target.value))} required>
                  <option value={0}>Badge auswählen</option>
                  {badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Level</label>
                <input type="number" min={0} value={assignLevel} onChange={e => setAssignLevel(Number(e.target.value))} />
              </div>
              {assignError && <p style={{ color: '#e05c5c', marginBottom: '0.5rem' }}>{assignError}</p>}
              {assignSuccess && <p style={{ color: 'green', marginBottom: '0.5rem' }}>Badge zugewiesen!</p>}
              <button type="submit" className="btn btn-primary">Zuweisen</button>
            </form>
          </div>
        </div>
      </section>

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 480, width: '90%', maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{isNew ? 'Badge erstellen' : 'Badge bearbeiten'}</h3>

            {[
              { field: 'name', label: 'Name' },
              { field: 'description', label: 'Beschreibung' },
              { field: 'info', label: 'Info' },
              { field: 'category', label: 'Kategorie' },
            ].map(({ field, label }) => (
              <div key={field} className="form-field" style={{ marginBottom: '0.75rem' }}>
                <label>{label}</label>
                <input type="text" value={(editing as Record<string, unknown>)[field] as string ?? ''} onChange={e => setField(field, e.target.value)} />
              </div>
            ))}

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>Max Level: <strong>{editing.max_level ?? 0}</strong></label>
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
                Verfügbar
              </label>
            </div>

            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label>Bild hochladen</label>
              <input ref={imgInputRef} type="file" accept="image/*" onChange={handleImageSelect} />
              {cropPreviewUrl && <img src={cropPreviewUrl} alt="Vorschau" style={{ width: 80, height: 80, objectFit: 'contain', marginTop: '0.5rem', borderRadius: 4 }} />}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={saveBadge}>Speichern</button>
              <button className="btn btn-outline" onClick={() => { setEditing(null); setImageFile(null); setCropPreviewUrl('') }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {showCrop && (
        <BadgeCropOverlay
          src={cropSrc}
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
  onSave: (file: File, previewUrl: string) => void
  onCancel: () => void
}

function BadgeCropOverlay({ src, onSave, onCancel }: CropOverlayProps) {
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

  useEffect(() => { if (imgLoaded) initFrame() }, [imgLoaded])

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
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'badge.jpg', { type: 'image/jpeg' })
      onSave(file, URL.createObjectURL(file))
    }, 'image/jpeg', 0.92)
  }

  return (
    <div style={{ display: 'flex', position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '90vw', maxWidth: 500 }}>
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 350, background: '#111', overflow: 'hidden', borderRadius: 8 }}>
          <img ref={imgRef} src={src} alt="crop" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} onLoad={() => setImgLoaded(true)} />
          <div onMouseDown={onMouseDown} style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.w, height: frame.h, border: '2px solid var(--clr-accent)', cursor: 'move', boxSizing: 'border-box', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={onCancel}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleSave}>Zuschneiden & Speichern</button>
        </div>
      </div>
    </div>
  )
}
