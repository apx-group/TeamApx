import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { useNavigate } from 'react-router-dom'

export default function Sidebar() {
  const { logout } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [showOverlay, setShowOverlay] = useState(false)

  async function handleLogout() {
    await logout()
    setShowOverlay(false)
    navigate('/')
  }

  return (
    <>
      <aside className="account-sidebar">
        <nav className="account-nav">
          <NavLink to="/settings" className={({ isActive }) => `account-nav-item${isActive ? ' active' : ''}`}>
            {t('account.nav.settings')}
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `account-nav-item${isActive ? ' active' : ''}`}>
            {t('account.nav.profile')}
          </NavLink>
          <NavLink to="/links" className={({ isActive }) => `account-nav-item${isActive ? ' active' : ''}`}>
            {t('account.nav.links')}
          </NavLink>
          <NavLink to="/badges" className={({ isActive }) => `account-nav-item${isActive ? ' active' : ''}`}>
            {t('account.nav.badges')}
          </NavLink>
          <NavLink to="/security" className={({ isActive }) => `account-nav-item${isActive ? ' active' : ''}`}>
            {t('account.nav.security')}
          </NavLink>
          <NavLink to="/my-application" className={({ isActive }) => `account-nav-item${isActive ? ' active' : ''}`}>
            {t('user.myApplication')}
          </NavLink>
          <button
            className="account-nav-item account-nav-item--btn"
            onClick={() => setShowOverlay(true)}
          >
            {t('user.logout')}
          </button>
        </nav>
      </aside>

      {showOverlay && (
        <div className="logout-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowOverlay(false) }}>
          <div className="logout-overlay__box">
            <p className="logout-overlay__text">{t('logout.confirm')}</p>
            <div className="logout-overlay__actions">
              <button className="btn btn-outline" onClick={() => setShowOverlay(false)}>{t('logout.cancel')}</button>
              <button className="btn btn-primary" onClick={handleLogout}>{t('logout.confirm.btn')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
