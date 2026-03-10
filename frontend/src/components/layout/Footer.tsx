import { Link } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'

export default function Footer() {
  const { lang, t } = useI18n()

  const impressumLink = `/${lang}/impressum`
  const datenschutzLink = `/${lang}/datenschutz`

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo-text">TEAM<strong>APX</strong></span>
            <p>{t('footer.copy')}</p>
          </div>
          <div className="footer-links">
            <a href="/#hero">{t('nav.home')}</a>
            <a href="/#about">{t('footer.about')}</a>
            <Link to="/rainbow-six">{t('nav.team')}</Link>
            <a href="/#events">{t('nav.events')}</a>
            <Link to="/apply">{t('footer.apply')}</Link>
            <Link to={impressumLink}>{t('footer.impressum')}</Link>
            <Link to={datenschutzLink}>{t('footer.privacy')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
