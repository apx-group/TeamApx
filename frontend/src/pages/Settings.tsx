import { useI18n } from '@/contexts/I18nContext'
import AccountLayout from '@/components/layout/AccountLayout'

export default function Settings() {
  const { t } = useI18n()

  return (
    <AccountLayout>
      <section className="section">
        <div className="container">
          <h1 className="section-title"><span className="accent">Einstellungen</span></h1>
          <p className="settings-placeholder">{t('settings.placeholder')}</p>
        </div>
      </section>
    </AccountLayout>
  )
}
