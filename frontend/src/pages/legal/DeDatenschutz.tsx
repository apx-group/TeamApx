export default function DeDatenschutz() {
  return (
    <section className="section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-2xl))' }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="section-title">Datenschutzrichtlinie</h1>

        <div style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-lg)', lineHeight: 1.8 }}>

          <p style={{ marginBottom: 'var(--space-md)' }}>
            Diese Datenschutzrichtlinie erläutert, wie wir auf dieser Website personenbezogene Daten erheben, verwenden, speichern und schützen. Sie gilt für alle Besucher und Nutzer unserer Website.
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            1. Verantwortlicher für die Datenverarbeitung
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Darius Krull<br />
            Hainholzfeld 7<br />
            31171 Nordstemmen
          </p>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            E-Mail: <a href="mailto:team.apx.r6@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>team.apx.r6@gmail.com</a>
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            2. Welche Daten werden erhoben und verarbeitet?
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Beim Besuch und der Nutzung unserer Website werden folgende Kategorien personenbezogener Daten erhoben und verarbeitet:
          </p>
          <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--clr-text)', fontWeight: 600 }}>
            Automatisch erhobene Daten (durch den Webserver):
          </p>
          <ul style={{ marginBottom: 'var(--space-sm)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>IP-Adresse des zugreifenden Endgeräts</li>
            <li>Datum und Uhrzeit des Zugriffs</li>
            <li>Browser und Betriebssystem des Endgeräts</li>
            <li>Angeforderte URL / Seitenpfad</li>
            <li>Referrer-URL (Herkunftseite)</li>
          </ul>
          <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--clr-text)', fontWeight: 600 }}>
            Durch das Bewerbungsformular erhobene Daten:
          </p>
          <ul style={{ marginBottom: 'var(--space-sm)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>Vor- und Nachname</li>
            <li>Discord-ID</li>
            <li>Alter</li>
            <li>Spielerdaten (z. B. Spielername, Statistiken)</li>
          </ul>
          <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--clr-text)', fontWeight: 600 }}>
            Bei Registrierung und Nutzung eines Nutzerkontos:
          </p>
          <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>E-Mail-Adresse</li>
            <li>Verschlüsselt gespeicherte Passwortdaten</li>
            <li>IP-Adresse und Login-Zeitpunkte</li>
            <li>Sicherheitsrelevante Informationen zur Geräteerkennung</li>
            <li>Ggf. Profilbild und Anzeigename</li>
          </ul>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            3. Nutzerkonten und Authentifizierung
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Bei der Erstellung eines Nutzerkontos verarbeiten wir personenbezogene Daten, die zur Authentifizierung und Sicherung des Kontos erforderlich sind. Dazu gehören insbesondere:
          </p>
          <ul style={{ marginBottom: 'var(--space-sm)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>E-Mail-Adresse</li>
            <li>Verschlüsselt gespeicherte Passwortdaten</li>
            <li>IP-Adresse und Login-Zeitpunkte</li>
            <li>Sicherheitsrelevante Informationen zur Geräteerkennung</li>
          </ul>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Diese Daten dienen ausschließlich der Bereitstellung und Sicherung des Nutzerkontos.<br />
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung / Nutzung der Plattform)
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            4. Zwei-Faktor-Authentifizierung (2FA)
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Zur Erhöhung der Kontosicherheit bieten wir eine Zwei-Faktor-Authentifizierung (2FA) an. Hierbei wird bei aktivierter 2FA ein einmaliger Sicherheitscode an die hinterlegte E-Mail-Adresse gesendet. Die E-Mail-Adresse wird zu diesem Zweck verarbeitet; der Code ist zeitlich begrenzt gültig und wird nicht dauerhaft gespeichert.<br />
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse (Kontosicherheit)
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            5. Geräteerkennung
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Zur Erkennung bekannter Geräte und zur Erhöhung der Sicherheit speichern wir bei erfolgreichen Logins bestimmte technische Informationen, insbesondere IP-Adresse und Zeitpunkt des Zugriffs. Diese Informationen werden genutzt, um unbekannte Anmeldeversuche zu erkennen und das Konto zu schützen. Eine Weitergabe dieser Daten an Dritte erfolgt nicht.<br />
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse (Sicherheit)
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            6. Verknüpfung von Drittanbieter-Konten
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Nutzer können ihr Konto freiwillig mit externen Plattformen wie Twitch, Discord oder YouTube/Google verknüpfen. Die Authentifizierung erfolgt über das OAuth-Verfahren der jeweiligen Plattform. Dabei werden nur die zur Verknüpfung notwendigen Informationen übertragen, insbesondere:
          </p>
          <ul style={{ marginBottom: 'var(--space-sm)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>Nutzer-ID der jeweiligen Plattform</li>
            <li>Nutzername</li>
            <li>Ggf. öffentlich sichtbare Profilinformationen (z. B. Profilbild)</li>
          </ul>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Diese Verknüpfung ist freiwillig und kann jederzeit im Nutzerkonto aufgehoben werden. Es gelten zusätzlich die Datenschutzbestimmungen der jeweiligen Anbieter (Twitch: <a href="https://www.twitch.tv/p/de-de/legal/privacy-notice/" style={{ color: 'var(--clr-accent-light)' }} target="_blank" rel="noopener noreferrer">twitch.tv</a>, Discord: <a href="https://discord.com/privacy" style={{ color: 'var(--clr-accent-light)' }} target="_blank" rel="noopener noreferrer">discord.com</a>, YouTube/Google: <a href="https://policies.google.com/privacy" style={{ color: 'var(--clr-accent-light)' }} target="_blank" rel="noopener noreferrer">policies.google.com</a>, Challengermode: <a href="https://challengermode.com/privacy-policy" style={{ color: 'var(--clr-accent-light)' }} target="_blank" rel="noopener noreferrer">challengermode.com</a>).<br />
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            7. Cookies und Session-Daten
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Für die Anmeldung und Nutzung von Nutzerkonten verwenden wir technisch notwendige Session-Cookies. Diese Cookies enthalten keine persönlichen Daten, sondern lediglich eine verschlüsselte Sitzungs-ID, die der Zuordnung der Verbindung zum eingeloggten Konto dient. Die Cookies werden nach dem Abmelden oder nach Ablauf der Sitzung gelöscht. Es werden keine Tracking- oder Werbe-Cookies eingesetzt.<br />
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse (technisch notwendiger Betrieb)
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            8. Zweck der Datenverarbeitung
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Die erhobenen Daten werden für folgende Zwecke verarbeitet:
          </p>
          <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>Betrieb und Sicherung der Website</li>
            <li>Bereitstellung, Verwaltung und Sicherung von Nutzerkonten</li>
            <li>Durchführung der Zwei-Faktor-Authentifizierung</li>
            <li>Erkennung bekannter Geräte zum Schutz vor unbefugtem Zugriff</li>
            <li>Auswertung und Bearbeitung von Bewerbungen auf Mitgliedschaft</li>
            <li>Kontaktaufnahme im Zusammenhang mit eingereichten Bewerbungen</li>
            <li>Verwaltung der Community-Mitglieder</li>
          </ul>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            9. Rechtliche Grundlage der Datenverarbeitung
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Die Datenverarbeitung erfolgt auf folgenden rechtlichen Grundlagen gemäß der Verordnung (EU) 2016/679 (DSGVO):
          </p>
          <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li><strong>Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung:</strong> Für die Verarbeitung im Rahmen der Kontonutzung und Plattformbereitstellung.</li>
            <li><strong>Art. 6 Abs. 1 lit. f DSGVO – Berechtigte Interessen:</strong> Für automatisch erhobene Daten, Geräteerkennung, Session-Cookies und Sicherheitsmaßnahmen.</li>
            <li><strong>Art. 6 Abs. 1 lit. a DSGVO – Einwilligung:</strong> Für die Verknüpfung von Drittanbieter-Konten sowie für freiwillig übermittelte Bewerbungsdaten.</li>
          </ul>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            10. Speicherort und Übermittlung von Daten
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Alle von uns direkt erhobenen personenbezogenen Daten werden auf einem von uns betriebenen Server in Deutschland gespeichert. Bei der freiwilligen Nutzung von Drittanbieter-Verknüpfungen (Twitch, Discord) kann im Rahmen des OAuth-Verfahrens eine Datenübermittlung in Länder außerhalb der Europäischen Union erfolgen, da Twitch und Discord Unternehmen mit Sitz in den USA sind. Diese Übermittlung erfolgt auf Basis der jeweiligen Standardvertragsklauseln (SCCs) gemäß Art. 46 DSGVO.
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            11. Speicherdauer
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck notwendig ist:
          </p>
          <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>Automatisch erhobene Zugriffsprotokoll-Daten werden nach 30 Tagen automatisch gelöscht, sofern sie nicht für die Sicherung der Website benötigt werden.</li>
            <li>Bewerbungsdaten werden für die Dauer der Bearbeitung gespeichert und nach Abschluss innerhalb von 90 Tagen gelöscht, sofern keine Mitgliedschaft begründet wird.</li>
            <li>Kontodaten werden für die Dauer der Kontonutzung gespeichert. Nach Löschung des Kontos werden alle zugehörigen personenbezogenen Daten innerhalb von 30 Tagen entfernt.</li>
            <li>Session-Cookies und Geräteinformationen werden nach Abmeldung bzw. nach Ablauf der konfigurierten Gültigkeit automatisch gelöscht.</li>
          </ul>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            12. Weitergabe an Dritte
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Wir geben personenbezogene Daten grundsätzlich nicht an Dritte weiter, es sei denn, es besteht eine rechtliche Pflicht zur Weitergabe oder Sie haben explizit Ihre Einwilligung erteilt. Die Nutzung von Drittanbieter-Verknüpfungen (Abschnitt 6) erfolgt ausschließlich auf Ihre Initiative hin.
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            13. Ihre Rechte als betroffene Person
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Sie haben gemäß der DSGVO folgende Rechte gegenüber uns als Verantwortlichem:
          </p>
          <ul style={{ marginBottom: 'var(--space-sm)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li><strong>Recht auf Auskunft (Art. 15 DSGVO)</strong> – Sie können erfahren, welche Daten von Ihnen gespeichert sind.</li>
            <li><strong>Recht auf Berichtigung (Art. 16 DSGVO)</strong> – Sie können unrichtige Daten korrigieren lassen.</li>
            <li><strong>Recht auf Löschung (Art. 17 DSGVO)</strong> – Sie können unter bestimmten Voraussetzungen die Löschung Ihrer Daten verlangen.</li>
            <li><strong>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</strong></li>
            <li><strong>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</strong></li>
            <li><strong>Recht auf Widerspruch (Art. 21 DSGVO)</strong> – Sie können der Verarbeitung auf Grundlage berechtigter Interessen widersprechen.</li>
          </ul>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Um eines dieser Rechte wahrzunehmen, kontaktieren Sie uns bitte unter: <a href="mailto:team.apx.r6@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>team.apx.r6@gmail.com</a>
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            14. Beschwerde bei einer Aufsichtsbehörde
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde Beschwerde einzureichen. Die zuständige Behörde für Niedersachsen ist die Landesbeauftragte für den Datenschutz Niedersachsen (LfDI).
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            15. Änderungen dieser Datenschutzrichtlinie
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Wir behalten uns vor, diese Datenschutzrichtlinie jederzeit zu ändern oder zu aktualisieren. Änderungen werden auf dieser Seite veröffentlicht. Die Richtlinie in ihrer aktuellen Fassung gilt ab dem Zeitpunkt ihrer Veröffentlichung.
          </p>

          <p style={{ marginTop: 'var(--space-lg)', fontSize: 'var(--fs-sm)', color: 'var(--clr-text-muted)' }}>
            Diese Datenschutzrichtlinie wurde zuletzt am 06. März 2026 aktualisiert und besteht aus 15 Abschnitten.
          </p>

        </div>
      </div>
    </section>
  )
}
