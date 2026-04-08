import { useI18n } from '@/contexts/I18nContext'

export default function BetzhTermsOfService() {
  const { lang } = useI18n()

  return (
    <section className="section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-2xl))' }}>
      <div className="container" style={{ maxWidth: 800 }}>

        {lang === 'de' ? (
          <div style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-lg)', lineHeight: 1.8 }}>
            <h1 className="section-title" style={{ marginBottom: 'var(--space-xs)' }}>
              Nutzungsbedingungen für{' '}
              <a
                href="https://discord.com/oauth2/authorize?client_id=1374107864154767520&permissions=8&integration_type=0&scope=bot"
                style={{ color: 'var(--clr-accent-light)' }}
              >
                Betzh#0715
              </a>
            </h1>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              <strong style={{ color: 'var(--clr-text)' }}>Letzte Aktualisierung:</strong> 08.04.2026
            </p>

            <p style={{ marginBottom: 'var(--space-md)' }}>
              Bitte lesen Sie diese Nutzungsbedingungen sorgfältig durch, bevor Sie den Discord-Bot{' '}
              <a
                href="https://discord.com/oauth2/authorize?client_id=1374107864154767520&permissions=8&integration_type=0&scope=bot"
                style={{ color: 'var(--clr-accent-light)' }}
              >
                Betzh#0715
              </a>{' '}
              verwenden. Durch die Nutzung des Bots erklären Sie sich mit diesen Bedingungen einverstanden.
              Wenn Sie diesen Bedingungen nicht zustimmen, dürfen Sie den Bot nicht verwenden.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              1. Nutzung des Bots
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>1.1 Der Bot wird „wie besehen" bereitgestellt, ohne jegliche Garantien oder Gewährleistungen.</li>
              <li>
                1.2 Sie dürfen den Bot nur in Übereinstimmung mit den{' '}
                <a href="https://discord.com/developers/docs/policies-and-agreements/developer-terms-of-service" style={{ color: 'var(--clr-accent-light)' }}>
                  Discord Developer Terms of Service
                </a>{' '}
                und den{' '}
                <a href="https://discord.com/terms" style={{ color: 'var(--clr-accent-light)' }}>
                  Discord Terms of Service
                </a>{' '}
                verwenden.
              </li>
              <li>1.3 Sie erklären sich damit einverstanden, den Bot nicht für illegale Aktivitäten oder zur Verletzung der Rechte anderer zu verwenden.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              2. Datenschutz und Datenverarbeitung
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>2.1 Der Bot speichert oder sammelt keine persönlichen Daten der Benutzer ohne deren ausdrückliche Zustimmung.</li>
              <li>2.2 Alle Daten, die vom Bot verarbeitet werden, werden in Übereinstimmung mit den geltenden Datenschutzgesetzen behandelt.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              3. Verantwortung des Nutzers
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>3.1 Sie sind für Ihre Nutzung des Bots und alle Inhalte, die Sie über den Bot bereitstellen, verantwortlich.</li>
              <li>3.2 Sie dürfen keine Inhalte bereitstellen, die rechtswidrig, beleidigend, diffamierend, obszön oder anderweitig anstößig sind.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              4. Haftungsausschluss
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>4.1 Der Entwickler des Bots haftet nicht für direkte, indirekte, zufällige, besondere oder Folgeschäden, die aus der Nutzung oder der Unfähigkeit zur Nutzung des Bots entstehen.</li>
              <li>4.2 Der Bot wird ohne Mängelgewähr bereitgestellt, und der Entwickler übernimmt keine Verantwortung für die Richtigkeit, Zuverlässigkeit oder Verfügbarkeit des Bots.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              5. Änderungen an den Bedingungen
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>5.1 Der Entwickler behält sich das Recht vor, diese Bedingungen jederzeit zu ändern. Änderungen werden durch die Aktualisierung des Datums am Anfang dieser Bedingungen bekannt gegeben.</li>
              <li>5.2 Ihre fortgesetzte Nutzung des Bots nach Änderungen dieser Bedingungen stellt Ihre Zustimmung zu den neuen Bedingungen dar.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              6. Beendigung
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>6.1 Der Entwickler behält sich das Recht vor, Ihre Nutzung des Bots jederzeit und ohne Vorankündigung zu beenden, wenn Sie gegen diese Bedingungen verstoßen.</li>
              <li>6.2 Sie können die Nutzung des Bots jederzeit einstellen.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              7. Kontaktinformationen
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Für Fragen oder Anliegen bezüglich dieser Bedingungen kontaktieren Sie uns bitte unter{' '}
              <a href="mailto:devbetzh@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>devbetzh@gmail.com</a>.
            </p>
          </div>
        ) : (
          <div style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-lg)', lineHeight: 1.8 }}>
            <h1 className="section-title" style={{ marginBottom: 'var(--space-xs)' }}>
              Terms of Service for{' '}
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

            <p style={{ marginBottom: 'var(--space-md)' }}>
              Please read these Terms of Service carefully before using the Discord bot{' '}
              <a
                href="https://discord.com/oauth2/authorize?client_id=1374107864154767520&permissions=8&integration_type=0&scope=bot"
                style={{ color: 'var(--clr-accent-light)' }}
              >
                Betzh#0715
              </a>
              . By using the bot, you agree to these terms. If you do not agree, you may not use the bot.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              1. Use of the Bot
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>1.1 The bot is provided "as is" without any warranties or guarantees.</li>
              <li>
                1.2 You may only use the bot in accordance with the{' '}
                <a href="https://discord.com/developers/docs/policies-and-agreements/developer-terms-of-service" style={{ color: 'var(--clr-accent-light)' }}>
                  Discord Developer Terms of Service
                </a>{' '}
                and the{' '}
                <a href="https://discord.com/terms" style={{ color: 'var(--clr-accent-light)' }}>
                  Discord Terms of Service
                </a>
                .
              </li>
              <li>1.3 You agree not to use the bot for illegal activities or to infringe on the rights of others.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              2. Privacy and Data Processing
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>2.1 The bot does not store or collect personal data of users without their explicit consent.</li>
              <li>2.2 All data processed by the bot will be handled in accordance with applicable data protection laws.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              3. User Responsibility
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>3.1 You are responsible for your use of the bot and for any content you provide through the bot.</li>
              <li>3.2 You may not provide content that is unlawful, offensive, defamatory, obscene, or otherwise objectionable.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              4. Disclaimer of Liability
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>4.1 The developer of the bot is not liable for direct, indirect, incidental, special, or consequential damages arising from the use or inability to use the bot.</li>
              <li>4.2 The bot is provided without warranty, and the developer assumes no responsibility for the accuracy, reliability, or availability of the bot.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              5. Changes to the Terms
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>5.1 The developer reserves the right to modify these terms at any time. Changes will be indicated by updating the date at the top of these terms.</li>
              <li>5.2 Continued use of the bot after changes to these terms constitutes acceptance of the new terms.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              6. Termination
            </h2>
            <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
              <li>6.1 The developer reserves the right to terminate your use of the bot at any time and without notice if you violate these terms.</li>
              <li>6.2 You may stop using the bot at any time.</li>
            </ul>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              7. Contact Information
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              For questions or concerns regarding these terms, please contact us at{' '}
              <a href="mailto:infobetzh@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>infobetzh@gmail.com</a>.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
