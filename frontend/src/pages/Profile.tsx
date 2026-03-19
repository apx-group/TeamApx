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
  { value: 'Etc/GMT+12',                        label: '(GMT-12:00) International Date Line West' },
  { value: 'Pacific/Midway',                    label: '(GMT-11:00) Midway Island, Samoa' },
  { value: 'Pacific/Honolulu',                  label: '(GMT-10:00) Hawaii' },
  { value: 'America/Anchorage',                 label: '(GMT-09:00) Alaska' },
  { value: 'America/Los_Angeles',               label: '(GMT-08:00) Pacific Time (US & Canada)' },
  { value: 'America/Tijuana',                   label: '(GMT-08:00) Tijuana, Baja California' },
  { value: 'America/Phoenix',                   label: '(GMT-07:00) Arizona' },
  { value: 'America/Chihuahua',                 label: '(GMT-07:00) Chihuahua, La Paz, Mazatlan' },
  { value: 'America/Denver',                    label: '(GMT-07:00) Mountain Time (US & Canada)' },
  { value: 'America/Managua',                   label: '(GMT-06:00) Central America' },
  { value: 'America/Chicago',                   label: '(GMT-06:00) Central Time (US & Canada)' },
  { value: 'America/Mexico_City',               label: '(GMT-06:00) Guadalajara, Mexico City, Monterrey' },
  { value: 'America/Regina',                    label: '(GMT-06:00) Saskatchewan' },
  { value: 'America/Bogota',                    label: '(GMT-05:00) Bogota, Lima, Quito, Rio Branco' },
  { value: 'America/New_York',                  label: '(GMT-05:00) Eastern Time (US & Canada)' },
  { value: 'America/Indiana/Indianapolis',      label: '(GMT-05:00) Indiana (East)' },
  { value: 'America/Halifax',                   label: '(GMT-04:00) Atlantic Time (Canada)' },
  { value: 'America/Caracas',                   label: '(GMT-04:00) Caracas, La Paz' },
  { value: 'America/Manaus',                    label: '(GMT-04:00) Manaus' },
  { value: 'America/Santiago',                  label: '(GMT-04:00) Santiago' },
  { value: 'America/St_Johns',                  label: '(GMT-03:30) Newfoundland' },
  { value: 'America/Sao_Paulo',                 label: '(GMT-03:00) Brasilia' },
  { value: 'America/Argentina/Buenos_Aires',    label: '(GMT-03:00) Buenos Aires, Georgetown' },
  { value: 'America/Godthab',                   label: '(GMT-03:00) Greenland' },
  { value: 'America/Montevideo',                label: '(GMT-03:00) Montevideo' },
  { value: 'America/Noronha',                   label: '(GMT-02:00) Mid-Atlantic' },
  { value: 'Atlantic/Azores',                   label: '(GMT-01:00) Azores' },
  { value: 'Atlantic/Cape_Verde',               label: '(GMT-01:00) Cape Verde Is.' },
  { value: 'Africa/Casablanca',                 label: '(GMT+00:00) Casablanca, Monrovia, Reykjavik' },
  { value: 'Europe/London',                     label: '(GMT+00:00) Dublin, Edinburgh, Lisbon, London' },
  { value: 'Europe/Berlin',                     label: '(GMT+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna' },
  { value: 'Europe/Belgrade',                   label: '(GMT+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague' },
  { value: 'Europe/Brussels',                   label: '(GMT+01:00) Brussels, Copenhagen, Madrid, Paris' },
  { value: 'Europe/Sarajevo',                   label: '(GMT+01:00) Sarajevo, Skopje, Warsaw, Zagreb' },
  { value: 'Africa/Lagos',                      label: '(GMT+01:00) West Central Africa' },
  { value: 'Asia/Amman',                        label: '(GMT+02:00) Amman' },
  { value: 'Europe/Athens',                     label: '(GMT+02:00) Athens, Bucharest, Istanbul' },
  { value: 'Asia/Beirut',                       label: '(GMT+02:00) Beirut' },
  { value: 'Africa/Cairo',                      label: '(GMT+02:00) Cairo' },
  { value: 'Africa/Harare',                     label: '(GMT+02:00) Harare, Pretoria' },
  { value: 'Europe/Helsinki',                   label: '(GMT+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius' },
  { value: 'Asia/Jerusalem',                    label: '(GMT+02:00) Jerusalem' },
  { value: 'Europe/Minsk',                      label: '(GMT+02:00) Minsk' },
  { value: 'Africa/Windhoek',                   label: '(GMT+02:00) Windhoek' },
  { value: 'Asia/Baghdad',                      label: '(GMT+03:00) Baghdad, Kuwait, Riyadh' },
  { value: 'Europe/Moscow',                     label: '(GMT+03:00) Moscow, St. Petersburg, Volgograd' },
  { value: 'Africa/Nairobi',                    label: '(GMT+03:00) Nairobi' },
  { value: 'Asia/Tbilisi',                      label: '(GMT+03:00) Tbilisi' },
  { value: 'Asia/Tehran',                       label: '(GMT+03:30) Tehran' },
  { value: 'Asia/Muscat',                       label: '(GMT+04:00) Abu Dhabi, Muscat' },
  { value: 'Asia/Baku',                         label: '(GMT+04:00) Baku' },
  { value: 'Asia/Yerevan',                      label: '(GMT+04:00) Yerevan' },
  { value: 'Asia/Kabul',                        label: '(GMT+04:30) Kabul' },
  { value: 'Asia/Yekaterinburg',                label: '(GMT+05:00) Yekaterinburg' },
  { value: 'Asia/Karachi',                      label: '(GMT+05:00) Islamabad, Karachi, Tashkent' },
  { value: 'Asia/Kolkata',                      label: '(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi' },
  { value: 'Asia/Kathmandu',                    label: '(GMT+05:45) Kathmandu' },
  { value: 'Asia/Almaty',                       label: '(GMT+06:00) Almaty, Novosibirsk' },
  { value: 'Asia/Dhaka',                        label: '(GMT+06:00) Astana, Dhaka' },
  { value: 'Asia/Rangoon',                      label: '(GMT+06:30) Yangon (Rangoon)' },
  { value: 'Asia/Bangkok',                      label: '(GMT+07:00) Bangkok, Hanoi, Jakarta' },
  { value: 'Asia/Krasnoyarsk',                  label: '(GMT+07:00) Krasnoyarsk' },
  { value: 'Asia/Hong_Kong',                    label: '(GMT+08:00) Beijing, Chongqing, Hong Kong, Urumqi' },
  { value: 'Asia/Kuala_Lumpur',                 label: '(GMT+08:00) Kuala Lumpur, Singapore' },
  { value: 'Asia/Irkutsk',                      label: '(GMT+08:00) Irkutsk, Ulaanbaatar' },
  { value: 'Australia/Perth',                   label: '(GMT+08:00) Perth' },
  { value: 'Asia/Taipei',                       label: '(GMT+08:00) Taipei' },
  { value: 'Asia/Tokyo',                        label: '(GMT+09:00) Osaka, Sapporo, Tokyo' },
  { value: 'Asia/Seoul',                        label: '(GMT+09:00) Seoul' },
  { value: 'Asia/Yakutsk',                      label: '(GMT+09:00) Yakutsk' },
  { value: 'Australia/Adelaide',                label: '(GMT+09:30) Adelaide' },
  { value: 'Australia/Darwin',                  label: '(GMT+09:30) Darwin' },
  { value: 'Australia/Brisbane',                label: '(GMT+10:00) Brisbane' },
  { value: 'Australia/Sydney',                  label: '(GMT+10:00) Canberra, Melbourne, Sydney' },
  { value: 'Australia/Hobart',                  label: '(GMT+10:00) Hobart' },
  { value: 'Pacific/Guam',                      label: '(GMT+10:00) Guam, Port Moresby' },
  { value: 'Asia/Vladivostok',                  label: '(GMT+10:00) Vladivostok' },
  { value: 'Asia/Magadan',                      label: '(GMT+11:00) Magadan, Solomon Is., New Caledonia' },
  { value: 'Pacific/Auckland',                  label: '(GMT+12:00) Auckland, Wellington' },
  { value: 'Pacific/Fiji',                      label: '(GMT+12:00) Fiji, Kamchatka, Marshall Is.' },
  { value: 'Pacific/Tongatapu',                 label: "(GMT+13:00) Nuku'alofa" },
  { value: 'Pacific/Fakaofo',                   label: '(GMT+13:00) Tokelau Is.' },
]

export default function Profile() {
  const { user, refetch } = useAuth()
  const { t } = useI18n()
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

  // Social links
  const [links, setLinks] = useState<string[]>([''])

  // Timezone + left column save
  const [timezone, setTimezone] = useState('')
  const [showLocalTime, setShowLocalTime] = useState(false)
  const [leftSaved, setLeftSaved] = useState(false)
  const [leftLoading, setLeftLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '')
      setDisplayName(user.nickname || user.username || '')
      setAvatarUrl(user.avatar_url || '')
      setBannerUrl(user.banner_url || '')
      setTimezone(user.timezone || '')
      setShowLocalTime(!!user.show_local_time)
      setLinks(user.social_links?.length ? user.social_links : [''])
    }
  }, [user])

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
          <select
            className="profile-tz-select"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
          >
            <option value="" disabled>{t('profile.timezoneSelect')}</option>
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>

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
