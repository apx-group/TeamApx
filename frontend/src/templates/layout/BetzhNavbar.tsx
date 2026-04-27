import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import '@/styles/betzh-navbar.css'

export default function BetzhNavbar() {
  const { user, logout } = useAuth()
  const { lang, setLang, t } = useI18n()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarClosing, setSidebarClosing] = useState(false)
  const [showLogoutOverlay, setShowLogoutOverlay] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('info')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sections = ['info', 'features', 'contact']
    const observers = new Map()

    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }

    const observer = new IntersectionObserver(callback, {
      threshold: 0.3,
      rootMargin: '-100px 0px -66% 0px',
    })

    sections.forEach(id => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
        observers.set(id, observer)
      }
    })

    return () => {
      observers.forEach(obs => obs.disconnect())
    }
  }, [])

  function closeSidebar() {
    if (!sidebarOpen) return
    setSidebarClosing(true)
    setTimeout(() => {
      setSidebarOpen(false)
      setSidebarClosing(false)
    }, 240)
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLogoutOverlay(false)
        closeSidebar()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [sidebarOpen])

  function toggleSidebar() {
    if (sidebarOpen) {
      closeSidebar()
    } else {
      setSidebarOpen(true)
    }
  }

  function handleLangToggle() {
    const newLang = lang === 'de' ? 'en' : 'de'
    setLang(newLang)
  }

  async function handleLogout() {
    await logout()
    setShowLogoutOverlay(false)
    navigate('/')
  }

  const betzhNavLinks = [
    { to: '/betzh#info', label: 'Info', id: 'info' },
    { to: '/betzh#features', label: 'Features', id: 'features' },
    { to: '/betzh#contact', label: lang === 'de' ? 'Kontakt' : 'Contact', id: 'contact' },
  ]

  const sidebarNavItems = [
    { to: '/profile', label: t('account.nav.profile') },
    { to: '/settings', label: t('account.nav.settings') },
    { to: '/security', label: t('account.nav.security') },
    { to: '/my-application', label: t('user.myApplication') },
  ]

  return (
    <>
      <nav className={`navbar betzh-navbar${scrolled ? ' scrolled' : ''}`} id="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <span className="logo-text">TEAM<strong>APX</strong></span>
          </Link>

          <ul className={`betzh-nav-menu${menuOpen ? ' active' : ''}`} id="nav-menu">
            {betzhNavLinks.map(link => (
              <li key={link.to}>
                <a
                  href={link.to}
                  className={`nav-link${activeSection === link.id ? ' active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <button className="lang-toggle" onClick={handleLangToggle}>
            {lang === 'de' ? 'EN' : 'DE'}
          </button>

          {user ? (
            <button
              className="nav-profile-toggle"
              onClick={toggleSidebar}
              aria-label="Profil"
            >
              <span className="nav-profile-avatar">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} />
                ) : (
                  <span id="nav-profile-initial" style={{ display: 'flex' }}>
                    {(user.nickname || user.username)[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </span>
              <span className="nav-profile-name">
                {user.nickname || user.username}
              </span>
            </button>
          ) : (
            <Link to="/login" className="nav-link nav-cta">
              {t('user.login')}
            </Link>
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

      {/* Settings Sidebar */}
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
