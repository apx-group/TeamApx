import { useI18n } from '@/contexts/I18nContext'

export default function BetzhPrivacyPolicy() {
  const { lang } = useI18n()

  return (
    <section className="section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-2xl))' }}>
      <div className="container" style={{ maxWidth: 800 }}>

        {lang === 'de' ? (
          <div style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-lg)', lineHeight: 1.8 }}>
            <h1 className="section-title" style={{ marginBottom: 'var(--space-xs)' }}>
              Datenschutzrichtlinie für{' '}
              <a
                href="https://discord.com/oauth2/authorize?client_id=1374107864154767520&permissions=8&integration_type=0&scope=bot"
                style={{ color: 'var(--clr-accent-light)' }}
              >
                Betzh#0715
              </a>
            </h1>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              <strong style={{ color: 'var(--clr-text)' }}>Letzte Aktualisierung:</strong> 08.08.2026
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              1. Einleitung
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Willkommen bei{' '}
              <a
                href="https://discord.com/oauth2/authorize?client_id=1374107864154767520&permissions=8&integration_type=0&scope=bot"
                style={{ color: 'var(--clr-accent-light)' }}
              >
                Betzh#0715
              </a>
              ! Der Schutz deiner Privatsphäre ist uns sehr wichtig. Diese Datenschutzrichtlinie erklärt,
              welche Informationen wir sammeln, wie wir sie verwenden, und welche Rechte du in Bezug auf deine Daten hast.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              2. Informationen, die wir sammeln
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li><strong style={{ color: 'var(--clr-text)' }}>Benutzerdaten:</strong> Discord-Benutzername, Benutzer-ID, Profilbild.</li>
              <li><strong style={{ color: 'var(--clr-text)' }}>Server-Daten:</strong> Server-ID, Name, Einstellungen.</li>
              <li><strong style={{ color: 'var(--clr-text)' }}>Bot-Interaktionen:</strong> Befehle und Interaktionen zur Verbesserung des Services.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              3. Wie wir die Informationen verwenden
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li><strong style={{ color: 'var(--clr-text)' }}>Dienst verbessern:</strong> Bereitstellung und Weiterentwicklung.</li>
              <li><strong style={{ color: 'var(--clr-text)' }}>Sicherheit:</strong> Fehlerbehebung und Schutzmaßnahmen.</li>
              <li><strong style={{ color: 'var(--clr-text)' }}>Kommunikation:</strong> Wichtige Updates oder Änderungen.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              4. Datenweitergabe
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Keine Weitergabe an Dritte, außer gesetzlich vorgeschrieben.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              5. Speicherung und Sicherheit
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Daten werden nur so lange gespeichert, wie nötig, und technisch geschützt.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              6. Rechte der Benutzer
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Zugriff, Korrektur, Löschung deiner Daten per Anfrage:{' '}
              <a href="mailto:devzerogg@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>devzerogg@gmail.com</a>
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              7. Änderungen
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Wir behalten uns Änderungen vor. Bitte regelmäßig prüfen.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              8. Kontakt
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Fragen?{' '}
              <a href="mailto:devbetzh@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>devbetzh@gmail.com</a>
            </p>
          </div>
        ) : (
          <div style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-lg)', lineHeight: 1.8 }}>
            <h1 className="section-title" style={{ marginBottom: 'var(--space-xs)' }}>
              Privacy Policy for{' '}
              <a
                href="https://discord.com/oauth2/authorize?client_id=1374107864154767520&permissions=8&integration_type=0&scope=bot"
                style={{ color: 'var(--clr-accent-light)' }}
              >
                Betzh#0715
              </a>
            </h1>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              <strong style={{ color: 'var(--clr-text)' }}>Last updated:</strong> Apr 08, 2026
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              1. Introduction
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Welcome to{' '}
              <a
                href="https://discord.com/oauth2/authorize?client_id=1374107864154767520&permissions=8&integration_type=0&scope=bot"
                style={{ color: 'var(--clr-accent-light)' }}
              >
                Betzh#0715
              </a>
              ! Protecting your privacy is very important to us. This Privacy Policy explains what information we collect,
              how we use it, and what rights you have regarding your data.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              2. Information we collect
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li><strong style={{ color: 'var(--clr-text)' }}>User Data:</strong> Discord username, user ID, profile picture.</li>
              <li><strong style={{ color: 'var(--clr-text)' }}>Server Data:</strong> Server ID, name, settings.</li>
              <li><strong style={{ color: 'var(--clr-text)' }}>Bot Interactions:</strong> Commands and interactions to improve the service.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              3. How we use the information
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li><strong style={{ color: 'var(--clr-text)' }}>Service improvement:</strong> Provide and enhance the bot service.</li>
              <li><strong style={{ color: 'var(--clr-text)' }}>Security:</strong> Troubleshooting and protective measures.</li>
              <li><strong style={{ color: 'var(--clr-text)' }}>Communication:</strong> Important updates or changes.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              4. Data sharing
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              No sharing of personal data with third parties unless legally required.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              5. Data storage and security
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Data is stored only as long as necessary and protected with appropriate measures.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              6. User rights
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              You may access, correct, or delete your data. Contact:{' '}
              <a href="mailto:infobetzh@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>infobetzh@gmail.com</a>
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              7. Changes
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              We reserve the right to modify this Privacy Policy at any time. Please check regularly.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              8. Contact
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Questions?{' '}
              <a href="mailto:infobetzh@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>infobetzh@gmail.com</a>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
