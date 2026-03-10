import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { usersApi } from '@/api/users'
import type { UserSearchResult } from '@/types'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { lang, setLang, t } = useI18n()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const [showLogoutOverlay, setShowLogoutOverlay] = useState(false)

  // Search
  const [searchActive, setSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        closeSearch()
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
        setAdminDropdownOpen(false)
        setShowLogoutOverlay(false)
        closeSearch()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function closeSearch() {
    setSearchActive(false)
    setSearchQuery('')
    setSearchResults([])
  }

  async function handleSearchInput(q: string) {
    setSearchQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!q.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await usersApi.search(q)
        setSearchResults((data.users || []).slice(0, 6))
      } catch {
        setSearchResults([])
      }
    }, 250)
  }

  function handleSearchToggle(e: React.MouseEvent) {
    e.stopPropagation()
    const next = !searchActive
    setSearchActive(next)
    if (next) setTimeout(() => inputRef.current?.focus(), 30)
    else closeSearch()
  }

  async function handleLogout() {
    await logout()
    setShowLogoutOverlay(false)
    navigate('/')
  }

  const navLinks = [
    { to: '/#hero', label: t('nav.home') },
    { to: '/#potw', label: t('nav.potw') },
    { to: '/#about', label: t('nav.about') },
    { to: '/#team', label: t('nav.team') },
    { to: '/#events', label: t('nav.events') },
    { to: '/#socials', label: t('nav.socials') },
  ]

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`} id="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <span className="logo-text">TEAM<strong>APX</strong></span>
          </Link>

          <ul className={`nav-menu${menuOpen ? ' active' : ''}`} id="nav-menu">
            {navLinks.map(link => (
              <li key={link.to}>
                <a href={link.to} className="nav-link" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/apply" className="nav-link nav-cta" onClick={() => setMenuOpen(false)}>
                {t('nav.apply')}
              </Link>
            </li>
          </ul>

          {/* Language toggle */}
          <button className="lang-toggle" onClick={() => setLang(lang === 'de' ? 'en' : 'de')}>
            {lang === 'de' ? 'EN' : 'DE'}
          </button>

          {/* Search */}
          <div className={`nav-search${searchActive ? ' active' : ''}`} ref={searchRef}>
            <button className="nav-search-toggle" onClick={handleSearchToggle} aria-label="Suchen">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="nav-search-panel">
              <input
                ref={inputRef}
                className="nav-search-input"
                type="search"
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
                autoComplete="off"
              />
              {searchResults.length > 0 && (
                <div className="nav-search-dropdown visible">
                  {searchResults.map(u => {
                    const name = u.nickname || u.username
                    const handle = u.nickname ? `@${u.username}` : ''
                    return (
                      <Link
                        key={u.username}
                        className="nav-search-item"
                        to={`/user?u=${encodeURIComponent(u.username)}`}
                        onClick={closeSearch}
                      >
                        {u.avatar_url
                          ? <img className="nav-search-item__avatar" src={u.avatar_url} alt="" />
                          : <span className="nav-search-item__initial">{name[0]?.toUpperCase() || '?'}</span>
                        }
                        <span className="nav-search-item__info">
                          <span className="nav-search-item__name">{name}</span>
                          {handle && <span className="nav-search-item__handle">{handle}</span>}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* User menu */}
          <div className="user-menu" id="user-menu">
            <button
              className="user-menu-toggle"
              id="user-menu-toggle"
              aria-label="Menu"
              onClick={e => {
                e.stopPropagation()
                setDropdownOpen(v => !v)
                setAdminDropdownOpen(false)
              }}
            >
              <span className="hamburger-icon">
                <span /><span /><span />
              </span>
            </button>
            <div className={`user-dropdown${dropdownOpen ? ' open' : ''}`} id="user-dropdown">
              {user ? (
                <div className="user-dropdown-auth" style={{ display: 'block' }}>
                  <span className="user-dropdown-name">{user.username}</span>
                  <Link to="/settings" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>{t('user.settings')}</Link>
                  <Link to="/profile" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>{t('user.profile')}</Link>
                  <Link to="/links" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>{t('account.nav.links')}</Link>
                  <Link to="/badges" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>{t('account.nav.badges')}</Link>
                  <Link to="/security" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>{t('account.nav.security')}</Link>
                  <Link to="/my-application" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>{t('user.myApplication')}</Link>
                  <button
                    className="user-dropdown-item"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', color: 'inherit', font: 'inherit' }}
                    onClick={() => { setDropdownOpen(false); setShowLogoutOverlay(true) }}
                  >
                    {t('user.logout')}
                  </button>
                </div>
              ) : (
                <div className="user-dropdown-guest" style={{ display: 'block' }}>
                  <Link to="/settings" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>{t('user.settings')}</Link>
                  <Link to="/login" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>{t('user.login')}</Link>
                </div>
              )}
            </div>
          </div>

          {/* Admin menu */}
          {user?.is_admin && (
            <div className="admin-menu" id="admin-menu" style={{ display: 'flex' }}>
              <button
                className="admin-menu-toggle"
                onClick={e => {
                  e.stopPropagation()
                  setAdminDropdownOpen(v => !v)
                  setDropdownOpen(false)
                }}
                aria-label="Admin Menu"
              >
                {'</>'}
              </button>
              <div className={`admin-dropdown${adminDropdownOpen ? ' open' : ''}`}>
                <Link to="/admin/applications" className="user-dropdown-item" onClick={() => setAdminDropdownOpen(false)}>Bewerbungen</Link>
                <Link to="/admin/team" className="user-dropdown-item" onClick={() => setAdminDropdownOpen(false)}>Team</Link>
                <Link to="/admin/users" className="user-dropdown-item" onClick={() => setAdminDropdownOpen(false)}>Nutzer</Link>
                <Link to="/admin/badges" className="user-dropdown-item" onClick={() => setAdminDropdownOpen(false)}>Badges</Link>
              </div>
            </div>
          )}

          <button
            className={`nav-toggle${menuOpen ? ' active' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menü öffnen"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Logout overlay */}
      {showLogoutOverlay && (
        <div className="logout-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowLogoutOverlay(false) }}>
          <div className="logout-overlay__box">
            <p className="logout-overlay__text">{t('logout.confirm')}</p>
            <div className="logout-overlay__actions">
              <button className="btn btn-outline" onClick={() => setShowLogoutOverlay(false)}>{t('logout.cancel')}</button>
              <button className="btn btn-primary" onClick={handleLogout}>{t('logout.confirm.btn')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
