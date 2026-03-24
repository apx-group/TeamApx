import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { authApi } from '@/api/auth'
import AccountLayout from '@/templates/layout/AccountLayout'
import CustomCheckbox from '@/components/CustomCheckbox'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const BANNER_RATIO = 17 / 6
const MAX_LINKS = 5

const TIMEZONES = [
  { value: 'Etc/GMT+12',                     offset: 'UTC-12',   label: 'UTC-12 — International Date Line West' },
  { value: 'Pacific/Midway',                 offset: 'UTC-11',   label: 'UTC-11 — Midway Island, Samoa' },
  { value: 'Pacific/Honolulu',               offset: 'UTC-10',   label: 'UTC-10 — Hawaii' },
  { value: 'America/Anchorage',              offset: 'UTC-9',    label: 'UTC-9 — Alaska' },
  { value: 'America/Los_Angeles',            offset: 'UTC-8',    label: 'UTC-8 — Pacific Time (US & Canada)' },
  { value: 'America/Tijuana',                offset: 'UTC-8',    label: 'UTC-8 — Tijuana, Baja California' },
  { value: 'America/Denver',                 offset: 'UTC-7',    label: 'UTC-7 — Mountain Time (US & Canada)' },
  { value: 'America/Phoenix',                offset: 'UTC-7',    label: 'UTC-7 — Arizona' },
  { value: 'America/Chicago',                offset: 'UTC-6',    label: 'UTC-6 — Central Time (US & Canada)' },
  { value: 'America/Mexico_City',            offset: 'UTC-6',    label: 'UTC-6 — Guadalajara, Mexico City, Monterrey' },
  { value: 'America/Regina',                 offset: 'UTC-6',    label: 'UTC-6 — Saskatchewan' },
  { value: 'America/New_York',               offset: 'UTC-5',    label: 'UTC-5 — Eastern Time (US & Canada)' },
  { value: 'America/Bogota',                 offset: 'UTC-5',    label: 'UTC-5 — Bogota, Lima, Quito' },
  { value: 'America/Halifax',                offset: 'UTC-4',    label: 'UTC-4 — Atlantic Time (Canada)' },
  { value: 'America/Caracas',                offset: 'UTC-4',    label: 'UTC-4 — Caracas, La Paz' },
  { value: 'America/Santiago',               offset: 'UTC-4',    label: 'UTC-4 — Santiago' },
  { value: 'America/St_Johns',               offset: 'UTC-3:30', label: 'UTC-3:30 — Newfoundland' },
  { value: 'America/Sao_Paulo',              offset: 'UTC-3',    label: 'UTC-3 — Brasilia' },
  { value: 'America/Argentina/Buenos_Aires', offset: 'UTC-3',    label: 'UTC-3 — Buenos Aires, Georgetown' },
  { value: 'America/Montevideo',             offset: 'UTC-3',    label: 'UTC-3 — Montevideo' },
  { value: 'America/Noronha',                offset: 'UTC-2',    label: 'UTC-2 — Mid-Atlantic' },
  { value: 'Atlantic/Azores',                offset: 'UTC-1',    label: 'UTC-1 — Azores' },
  { value: 'Atlantic/Cape_Verde',            offset: 'UTC-1',    label: 'UTC-1 — Cape Verde Islands' },
  { value: 'Europe/London',                  offset: 'UTC+0',    label: 'UTC+0 — Dublin, Edinburgh, Lisbon, London' },
  { value: 'Africa/Casablanca',              offset: 'UTC+0',    label: 'UTC+0 — Casablanca, Monrovia, Reykjavik' },
  { value: 'Europe/Berlin',                  offset: 'UTC+1',    label: 'UTC+1 — Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna' },
  { value: 'Europe/Belgrade',                offset: 'UTC+1',    label: 'UTC+1 — Belgrade, Bratislava, Budapest, Ljubljana, Prague' },
  { value: 'Europe/Brussels',                offset: 'UTC+1',    label: 'UTC+1 — Brussels, Copenhagen, Madrid, Paris' },
  { value: 'Europe/Sarajevo',                offset: 'UTC+1',    label: 'UTC+1 — Sarajevo, Skopje, Warsaw, Zagreb' },
  { value: 'Africa/Lagos',                   offset: 'UTC+1',    label: 'UTC+1 — West Central Africa' },
  { value: 'Europe/Athens',                  offset: 'UTC+2',    label: 'UTC+2 — Athens, Bucharest, Istanbul' },
  { value: 'Europe/Helsinki',                offset: 'UTC+2',    label: 'UTC+2 — Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius' },
  { value: 'Africa/Cairo',                   offset: 'UTC+2',    label: 'UTC+2 — Cairo' },
  { value: 'Africa/Harare',                  offset: 'UTC+2',    label: 'UTC+2 — Harare, Pretoria' },
  { value: 'Asia/Jerusalem',                 offset: 'UTC+2',    label: 'UTC+2 — Jerusalem' },
  { value: 'Europe/Moscow',                  offset: 'UTC+3',    label: 'UTC+3 — Moscow, St. Petersburg, Volgograd' },
  { value: 'Asia/Baghdad',                   offset: 'UTC+3',    label: 'UTC+3 — Baghdad, Kuwait, Riyadh' },
  { value: 'Africa/Nairobi',                 offset: 'UTC+3',    label: 'UTC+3 — Nairobi' },
  { value: 'Asia/Tehran',                    offset: 'UTC+3:30', label: 'UTC+3:30 — Tehran' },
  { value: 'Asia/Muscat',                    offset: 'UTC+4',    label: 'UTC+4 — Abu Dhabi, Muscat' },
  { value: 'Asia/Baku',                      offset: 'UTC+4',    label: 'UTC+4 — Baku, Yerevan' },
  { value: 'Asia/Kabul',                     offset: 'UTC+4:30', label: 'UTC+4:30 — Kabul' },
  { value: 'Asia/Karachi',                   offset: 'UTC+5',    label: 'UTC+5 — Islamabad, Karachi, Tashkent' },
  { value: 'Asia/Yekaterinburg',             offset: 'UTC+5',    label: 'UTC+5 — Yekaterinburg' },
  { value: 'Asia/Kolkata',                   offset: 'UTC+5:30', label: 'UTC+5:30 — Chennai, Kolkata, Mumbai, New Delhi' },
  { value: 'Asia/Kathmandu',                 offset: 'UTC+5:45', label: 'UTC+5:45 — Kathmandu' },
  { value: 'Asia/Dhaka',                     offset: 'UTC+6',    label: 'UTC+6 — Astana, Dhaka' },
  { value: 'Asia/Almaty',                    offset: 'UTC+6',    label: 'UTC+6 — Almaty, Novosibirsk' },
  { value: 'Asia/Rangoon',                   offset: 'UTC+6:30', label: 'UTC+6:30 — Yangon (Rangoon)' },
  { value: 'Asia/Bangkok',                   offset: 'UTC+7',    label: 'UTC+7 — Bangkok, Hanoi, Jakarta' },
  { value: 'Asia/Krasnoyarsk',               offset: 'UTC+7',    label: 'UTC+7 — Krasnoyarsk' },
  { value: 'Asia/Hong_Kong',                 offset: 'UTC+8',    label: 'UTC+8 — Beijing, Hong Kong, Singapore, Taipei' },
  { value: 'Asia/Kuala_Lumpur',              offset: 'UTC+8',    label: 'UTC+8 — Kuala Lumpur, Singapore' },
  { value: 'Australia/Perth',                offset: 'UTC+8',    label: 'UTC+8 — Perth' },
  { value: 'Asia/Tokyo',                     offset: 'UTC+9',    label: 'UTC+9 — Osaka, Sapporo, Tokyo' },
  { value: 'Asia/Seoul',                     offset: 'UTC+9',    label: 'UTC+9 — Seoul' },
  { value: 'Australia/Adelaide',             offset: 'UTC+9:30', label: 'UTC+9:30 — Adelaide' },
  { value: 'Australia/Darwin',               offset: 'UTC+9:30', label: 'UTC+9:30 — Darwin' },
  { value: 'Australia/Sydney',               offset: 'UTC+10',   label: 'UTC+10 — Canberra, Melbourne, Sydney' },
  { value: 'Australia/Brisbane',             offset: 'UTC+10',   label: 'UTC+10 — Brisbane' },
  { value: 'Pacific/Guam',                   offset: 'UTC+10',   label: 'UTC+10 — Guam, Port Moresby' },
  { value: 'Asia/Vladivostok',               offset: 'UTC+10',   label: 'UTC+10 — Vladivostok' },
  { value: 'Asia/Magadan',                   offset: 'UTC+11',   label: 'UTC+11 — Magadan, Solomon Islands' },
  { value: 'Pacific/Auckland',               offset: 'UTC+12',   label: 'UTC+12 — Auckland, Wellington' },
  { value: 'Pacific/Fiji',                   offset: 'UTC+12',   label: 'UTC+12 — Fiji, Marshall Islands' },
  { value: 'Pacific/Tongatapu',              offset: 'UTC+13',   label: "UTC+13 — Nuku'alofa" },
]

export default function Profile() {
  const { user, refetch } = useAuth()
  const { t } = useI18n()
  const [nickname, setNickname] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
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

  // Social links
  const [links, setLinks] = useState<string[]>([''])

  // Timezone + left column save
  const [timezone, setTimezone] = useState('')
  const [tzOpen, setTzOpen] = useState(false)
  const tzRef = useRef<HTMLDivElement>(null)
  const [showLocalTime, setShowLocalTime] = useState(false)
  const [leftSaved, setLeftSaved] = useState(false)
  const [leftLoading, setLeftLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '')
      setDisplayName(user.nickname || user.username || '')
      setBio((user as any).bio || '')
      setAvatarUrl(user.avatar_url || '')
      setBannerUrl(user.banner_url || '')
      setTimezone(user.timezone || '')
      setShowLocalTime(!!user.show_local_time)
      setLinks(user.social_links?.length ? user.social_links : [''])
    }
  }, [user])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tzRef.current && !tzRef.current.contains(e.target as Node)) setTzOpen(false)
    }
    if (tzOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [tzOpen])

  function updateLink(i: number, val: string) {
    setLinks(prev => {
      const updated = prev.map((l, idx) => (idx === i ? val : l))
      // Auto-add empty field when the last slot is filled and limit not reached
      if (i === updated.length - 1 && val.trim() !== '' && updated.length < MAX_LINKS) {
        updated.push('')
      }
      return updated
    })
  }

  async function handleSaveLeft() {
    setLeftLoading(true)
    try {
      const cleanLinks = links.filter(l => l.trim() !== '')
      await authApi.updateProfileSettings({
        timezone,
        show_local_time: showLocalTime,
        social_links: cleanLinks,
      })
      await refetch()
      setLeftSaved(true)
      setTimeout(() => setLeftSaved(false), 3000)
    } catch {
      alert(t('profile.saveError'))
    } finally {
      setLeftLoading(false)
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { alert(t('profile.avatarTooLarge')); return }
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setShowAvatarCrop(true)
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { alert(t('profile.bannerTooLarge')); return }
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
    fd.append('bio', bio)
    if (croppedAvatar) fd.append('avatar', croppedAvatar)
    if (croppedBanner) fd.append('banner', croppedBanner)

    try {
      await authApi.updateProfile(fd)
      setDisplayName(nickname || user.username)
      setSuccess(true)
      await refetch()
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      alert(t('profile.saveFailedAlert'))
    } finally {
      setLoading(false)
    }
  }

  const initial = (user?.username || '?').charAt(0).toUpperCase()

  return (
    <AccountLayout>
      <div className="profile-3col">

        {/* LEFT: Social accounts */}
        <div className="profile-col profile-col-left">
          <h3 className="profile-col-title">{t('profile.socialAccounts')}</h3>
          <div className="profile-links-list">
            {links.map((link, i) => (
              <div className="profile-link-row" key={i}>
                <img
                  src="/icons/links.svg"
                  alt=""
                  className="profile-link-icon"
                />
                <input
                  type="url"
                  className="profile-link-input"
                  value={link}
                  onChange={e => updateLink(i, e.target.value)}
                  placeholder={`${t('profile.socialLinkPlaceholder')} ${i + 1}`}
                />
              </div>
            ))}
          </div>

          {/* Timezone */}
          <h3 className="profile-col-title" style={{ marginTop: 'var(--space-lg)' }}>{t('profile.timezone')}</h3>
          <div className="profile-tz-wrap" ref={tzRef}>
            <button
              type="button"
              className="profile-tz-select"
              onClick={() => setTzOpen(o => !o)}
            >
              <span>{timezone ? (TIMEZONES.find(z => z.value === timezone)?.offset ?? timezone) : t('profile.timezoneSelect')}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {tzOpen && (
              <div className="profile-tz-dropdown">
                {TIMEZONES.map(tz => (
                  <button
                    key={tz.value}
                    type="button"
                    className={`profile-tz-option${timezone === tz.value ? ' active' : ''}`}
                    onClick={() => { setTimezone(tz.value); setTzOpen(false) }}
                  >
                    {tz.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="profile-tz-hint">{t('profile.timezoneHint')}</p>
          <CustomCheckbox
            id="profile-show-local-time"
            checked={showLocalTime}
            onChange={setShowLocalTime}
            label={t('profile.showLocalTime')}
          />

          <button
            className="sec-btn-save"
            type="button"
            onClick={handleSaveLeft}
            disabled={leftLoading}
            style={{ marginTop: 'var(--space-md)' }}
          >
            {leftLoading ? '...' : t('profile.btn.save')}
          </button>
          {leftSaved && <p className="profile-save-success" style={{ display: 'block', marginTop: 'var(--space-xs)' }}>{t('profile.saved')}</p>}
        </div>

        {/* CENTER: Banner, Avatar, Nickname, Form */}
        <div className="profile-col profile-col-center">
          <div
            className={`profile-banner-wrapper${!bannerUrl && !croppedBanner ? ' empty' : ''}`}
            onClick={() => bannerInputRef.current?.click()}
            style={{ cursor: 'pointer' }}
          >
            {(bannerUrl || croppedBanner) && (
              <img className="profile-banner-img" src={bannerUrl} alt="Banner" />
            )}
            <span className="profile-banner-hint">{t('profile.banner.change')}</span>
            <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerChange} />
          </div>

          <div className="profile-avatar-wrapper" onClick={() => avatarInputRef.current?.click()} style={{ cursor: 'pointer' }}>
            {avatarUrl
              ? <img className="profile-avatar-img" src={avatarUrl} alt="Avatar" />
              : <span className="profile-avatar-initial">{initial}</span>
            }
            <span className="profile-avatar-hint">{t('profile.avatar.change')}</span>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>

          <h2 className="profile-display-name">{displayName}</h2>

          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label>{t('profile.label.nickname')}</label>
              <input
                type="text"
                name="nickname"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder={t('profile.placeholder.nickname')}
              />
            </div>
            <div className="form-field">
              <label>{t('profile.label.bio')}</label>
              <textarea
                name="bio"
                maxLength={150}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder={t('profile.placeholder.bio')}
                rows={3}
                style={{ resize: 'vertical' }}
              />
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>{bio.length}/150</span>
            </div>
            <button type="submit" className="sec-btn-save" disabled={loading}>
              {loading ? '...' : t('profile.btn.save')}
            </button>
            {success && <p className="profile-save-success" style={{ display: 'block' }}>{t('profile.saved')}</p>}
          </form>
        </div>

        {/* RIGHT: empty */}
        <div className="profile-col profile-col-right" />
      </div>

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
          cancelLabel={t('profile.crop.cancel')}
          saveLabel={t('profile.crop.save')}
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
          cancelLabel={t('profile.crop.cancel')}
          saveLabel={t('profile.crop.save')}
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
  cancelLabel: string
  saveLabel: string
}

function CropOverlay({ src, aspect, onSave, onCancel, outputWidth = 600, cancelLabel, saveLabel }: CropOverlayProps) {
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
          <button className="btn btn-outline" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn btn-primary" onClick={handleSave}>{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}
