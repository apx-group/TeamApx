import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { usersApi } from '@/api/users'
import type { UserSearchResult } from '@/types'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { lang, setLang, t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  const legalCounterpart: Record<string, string> = {
    '/de/impressum': '/en/impressum',
    '/en/impressum': '/de/impressum',
    '/de/datenschutz': '/en/datenschutz',
    '/en/datenschutz': '/de/datenschutz',
  }

  function handleLangToggle() {
    const newLang = lang === 'de' ? 'en' : 'de'
    setLang(newLang)
    const counterpart = legalCounterpart[location.pathname]
    if (counterpart) navigate(counterpart)
  }

  const [menuOpen, setMenuOpen] = useState(false)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const [showLogoutOverlay, setShowLogoutOverlay] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarClosing, setSidebarClosing] = useState(false)

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
        setAdminDropdownOpen(false)
        setShowLogoutOverlay(false)
        closeSidebar()
        closeSearch()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [sidebarOpen])

  function closeSidebar() {
    if (!sidebarOpen) return
    setSidebarClosing(true)
    setTimeout(() => {
      setSidebarOpen(false)
      setSidebarClosing(false)
    }, 240)
  }

  function toggleSidebar() {
    if (sidebarOpen) {
      closeSidebar()
    } else {
      setSidebarOpen(true)
    }
  }

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

  const sidebarNavItems = user
    ? [
        { to: '/settings', label: t('account.nav.settings') },
        { to: '/profile', label: t('account.nav.profile') },
        { to: '/links', label: t('account.nav.links') },
        { to: '/badges', label: t('account.nav.badges') },
        { to: '/security', label: t('account.nav.security') },
        { to: '/my-application', label: t('user.myApplication') },
      ]
    : [
        { to: '/login', label: t('user.login') },
        { to: '/login', label: t('account.nav.settings') },
        { to: '/login', label: t('account.nav.profile') },
        { to: '/login', label: t('account.nav.links') },
        { to: '/login', label: t('account.nav.badges') },
        { to: '/login', label: t('account.nav.security') },
        { to: '/login', label: t('user.myApplication') },
      ]

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`} id="navbar">
        <div className="nav-container">
          {/* Profile button - left side */}
          <button
            className="nav-profile-toggle"
            onClick={toggleSidebar}
            aria-label="Profil"
          >
            <span className="nav-profile-avatar">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} />
              ) : user ? (
                <span id="nav-profile-initial" style={{ display: 'flex' }}>
                  {(user.nickname || user.username)[0]?.toUpperCase() || '?'}
                </span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </span>
            <span className="nav-profile-name">
              {user ? (user.nickname || user.username) : t('user.login')}
            </span>
          </button>

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
          <button className="lang-toggle" onClick={handleLangToggle}>
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

          {/* Admin menu */}
          {user?.is_admin && (
            <div className="admin-menu" id="admin-menu" style={{ display: 'flex' }}>
              <button
                className="admin-menu-toggle"
                onClick={e => {
                  e.stopPropagation()
                  setAdminDropdownOpen(v => !v)
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

      {/* Settings Sidebar Overlay */}
      {(sidebarOpen || sidebarClosing) && (
        <div
          className={`nav-sidebar-backdrop${sidebarClosing ? ' closing' : ''}`}
          onClick={closeSidebar}
        >
          <aside
            className={`nav-sidebar-panel${sidebarClosing ? ' closing' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="nav-sidebar-header">
              <span className="nav-sidebar-avatar">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} />
                ) : user ? (
                  <span className="nav-sidebar-initial">
                    {(user.nickname || user.username)[0]?.toUpperCase() || '?'}
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </span>
              {user && (
                <span className="nav-sidebar-username">{user.nickname || user.username}</span>
              )}
            </div>
            <nav className="nav-sidebar-nav">
              {sidebarNavItems.map((item, i) => (
                <NavLink
                  key={i}
                  to={item.to}
                  className={({ isActive }) => `account-nav-item${isActive && !!user ? ' active' : ''}`}
                  onClick={closeSidebar}
                >
                  {item.label}
                </NavLink>
              ))}
              {user && (
                <button
                  className="account-nav-item account-nav-item--btn"
                  onClick={() => { closeSidebar(); setShowLogoutOverlay(true) }}
                >
                  {t('user.logout')}
                </button>
              )}
            </nav>
          </aside>
        </div>
      )}

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
