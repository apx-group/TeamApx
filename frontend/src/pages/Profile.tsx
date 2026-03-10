import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/api/auth'
import AccountLayout from '@/components/layout/AccountLayout'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const BANNER_RATIO = 17 / 6

export default function Profile() {
  const { user, refetch } = useAuth()
  const [nickname, setNickname] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState('')
  const [croppedAvatar, setCroppedAvatar] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [showAvatarCrop, setShowAvatarCrop] = useState(false)
  const [cropSrc, setCropSrc] = useState('')

  // Banner
  const [bannerUrl, setBannerUrl] = useState('')
  const [croppedBanner, setCroppedBanner] = useState<File | null>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [showBannerCrop, setShowBannerCrop] = useState(false)
  const [bannerCropSrc, setBannerCropSrc] = useState('')

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '')
      setDisplayName(user.nickname || user.username || '')
      setAvatarUrl(user.avatar_url || '')
      setBannerUrl(user.banner_url || '')
    }
  }, [user])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { alert('Profilbild ist größer als 10 MB'); return }
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setShowAvatarCrop(true)
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { alert('Banner ist größer als 10 MB'); return }
    const url = URL.createObjectURL(file)
    setBannerCropSrc(url)
    setShowBannerCrop(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setSuccess(false)

    const fd = new FormData()
    fd.append('username', user.username)
    fd.append('nickname', nickname || user.username)
    if (croppedAvatar) fd.append('avatar', croppedAvatar)
    if (croppedBanner) fd.append('banner', croppedBanner)

    try {
      await authApi.updateProfile(fd)
      setDisplayName(nickname || user.username)
      setSuccess(true)
      await refetch()
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      alert('Profil konnte nicht gespeichert werden')
    } finally {
      setLoading(false)
    }
  }

  const initial = (user?.username || '?').charAt(0).toUpperCase()

  return (
    <AccountLayout>
      <section className="section profile-section">
        <div className="container">
          {/* Banner */}
          <div
            className={`profile-banner-wrapper${!bannerUrl && !croppedBanner ? ' empty' : ''}`}
            id="profile-banner-wrapper"
            onClick={() => bannerInputRef.current?.click()}
            style={{ cursor: 'pointer' }}
          >
            {(bannerUrl || croppedBanner) && (
              <img className="profile-banner-img" src={bannerUrl} alt="Banner" id="profile-banner-img" />
            )}
            <span className="profile-banner-hint">Banner ändern</span>
            <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerChange} />
          </div>

          {/* Avatar */}
          <div className="profile-avatar-wrapper" onClick={() => avatarInputRef.current?.click()} style={{ cursor: 'pointer' }}>
            {avatarUrl
              ? <img className="profile-avatar-img" src={avatarUrl} alt="Avatar" />
              : <span className="profile-avatar-initial">{initial}</span>
            }
            <span className="profile-avatar-hint">Ändern</span>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>

          <h2 className="profile-display-name" id="profile-display-name">{displayName}</h2>

          <form className="profile-form" id="profile-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Nickname</label>
              <input
                type="text"
                name="nickname"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Anzeigename"
              />
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? '...' : 'Speichern'}
            </button>
            {success && <p className="profile-save-success" style={{ display: 'block' }}>Gespeichert!</p>}
          </form>
        </div>
      </section>

      {/* Avatar Crop Overlay */}
      {showAvatarCrop && (
        <CropOverlay
          src={cropSrc}
          aspect={1}
          onSave={(file, url) => {
            setCroppedAvatar(file)
            setAvatarUrl(url)
            setShowAvatarCrop(false)
          }}
          onCancel={() => {
            setShowAvatarCrop(false)
            URL.revokeObjectURL(cropSrc)
            if (avatarInputRef.current) avatarInputRef.current.value = ''
          }}
        />
      )}

      {/* Banner Crop Overlay */}
      {showBannerCrop && (
        <CropOverlay
          src={bannerCropSrc}
          aspect={BANNER_RATIO}
          onSave={(file, url) => {
            setCroppedBanner(file)
            setBannerUrl(url)
            setShowBannerCrop(false)
          }}
          onCancel={() => {
            setShowBannerCrop(false)
            URL.revokeObjectURL(bannerCropSrc)
            if (bannerInputRef.current) bannerInputRef.current.value = ''
          }}
          outputWidth={1360}
        />
      )}
    </AccountLayout>
  )
}

// Simple crop overlay using canvas
interface CropOverlayProps {
  src: string
  aspect: number
  onSave: (file: File, previewUrl: string) => void
  onCancel: () => void
  outputWidth?: number
}

function CropOverlay({ src, aspect, onSave, onCancel, outputWidth = 600 }: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, fx: 0, fy: 0 })
  const [imgLoaded, setImgLoaded] = useState(false)

  function getRendered(): { rw: number; rh: number; ox: number; oy: number } {
    const img = imgRef.current
    const con = containerRef.current
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
    if (aspect === 1) {
      const size = Math.min(rw, rh)
      setFrame({ x: ox + (rw - size) / 2, y: oy + (rh - size) / 2, w: size, h: size })
    } else {
      let fw: number, fh: number
      if (rw / rh > aspect) { fh = rh; fw = fh * aspect }
      else { fw = rw; fh = fw / aspect }
      setFrame({ x: ox + (rw - fw) / 2, y: oy + (rh - fh) / 2, w: fw, h: fh })
    }
  }

  useEffect(() => {
    if (imgLoaded) initFrame()
  }, [imgLoaded])

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, fx: frame.x, fy: frame.y }
  }

  function onTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    const t = e.touches[0]
    setDragging(true)
    dragStart.current = { mx: t.clientX, my: t.clientY, fx: frame.x, fy: frame.y }
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging) return
      const { rw, rh, ox, oy } = getRendered()
      const dx = e.clientX - dragStart.current.mx
      const dy = e.clientY - dragStart.current.my
      setFrame(f => ({
        ...f,
        x: Math.max(ox, Math.min(ox + rw - f.w, dragStart.current.fx + dx)),
        y: Math.max(oy, Math.min(oy + rh - f.h, dragStart.current.fy + dy)),
      }))
    }
    function onUp() { setDragging(false) }
    function onTouchMove(e: TouchEvent) {
      if (!dragging) return
      e.preventDefault()
      const t = e.touches[0]
      const { rw, rh, ox, oy } = getRendered()
      const dx = t.clientX - dragStart.current.mx
      const dy = t.clientY - dragStart.current.my
      setFrame(f => ({
        ...f,
        x: Math.max(ox, Math.min(ox + rw - f.w, dragStart.current.fx + dx)),
        y: Math.max(oy, Math.min(oy + rh - f.h, dragStart.current.fy + dy)),
      }))
    }
    function onTouchEnd() { setDragging(false) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [dragging])

  function handleSave() {
    const img = imgRef.current
    if (!img) return
    const { rw, ox, oy } = getRendered()
    const scale = img.naturalWidth / rw
    const srcX = Math.round((frame.x - ox) * scale)
    const srcY = Math.round((frame.y - oy) * scale)
    const srcW = Math.round(frame.w * scale)
    const srcH = Math.round(frame.h * scale)
    const outW = Math.min(srcW, outputWidth)
    const outH = Math.round(outW / (srcW / srcH))
    const canvas = document.createElement('canvas')
    canvas.width = outW; canvas.height = outH
    canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], aspect === 1 ? 'avatar.jpg' : 'banner.jpg', { type: 'image/jpeg' })
      const previewUrl = URL.createObjectURL(file)
      onSave(file, previewUrl)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="crop-overlay" style={{ display: 'flex', position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '90vw', maxWidth: 700 }}>
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 400, background: '#111', overflow: 'hidden', borderRadius: 8 }}>
          <img
            ref={imgRef}
            src={src}
            alt="crop"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            onLoad={() => setImgLoaded(true)}
          />
          <div
            ref={frameRef}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            style={{
              position: 'absolute',
              left: frame.x,
              top: frame.y,
              width: frame.w,
              height: frame.h,
              border: '2px solid var(--clr-accent)',
              cursor: 'move',
              boxSizing: 'border-box',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={onCancel}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleSave}>Zuschneiden & Speichern</button>
        </div>
      </div>
    </div>
  )
}
