import AccountLayout from '@/components/layout/AccountLayout'

export default function DeImpressum() {
  return (
    <AccountLayout>
      <section className="section legal-section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-xl))' }}>
        <div className="container">
          <h1 className="section-title"><span className="accent">Impressum</span></h1>

          <div style={{ maxWidth: 720, lineHeight: 1.8, color: 'var(--clr-text)' }}>
            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)' }}>
              Angaben gemäß § 5 TMG
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Darius Krull<br />
              Hainholzfeld 7<br />
              31171 Nordstemmen<br />
              Germany
            </p>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              E-Mail: <a href="mailto:team.apx.r6@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>team.apx.r6@gmail.com</a>
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              Inhaltliche Verantwortung
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:<br />
              Darius Krull<br />
              Hainholzfeld 7<br />
              31171 Nordstemmen
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              Verlinkungen auf externe Websites
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Diese Website enthält Links auf externe Websites dritter Parteien, auf deren Inhalte wir keinen Einfluss haben.
              Für die Inhalte der verlinkten Seiten sind ausschließlich die Betreiber der jeweiligen Seiten verantwortlich.
              Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf Rechtsverstöße überprüft; rechtswidrige Inhalte
              waren nicht erkennbar. Eine dauernde Überwachung der verlinkten Seiten ist ohne konkrete Anhaltspunkte für
              Rechtsverletzungen nicht zumutbar. Bei Kenntnis von Rechtsverletzungen wird diese Verlinkung unverzüglich entfernt werden.
            </p>

            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              Urheberrecht
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Die durch uns auf dieser Website bereitgestellten Inhalte und Werke sind durch das deutsche Urheberrecht geschützt.
              Die Reproduktion, Bearbeitung, Übersetzung, Verbreitung, Vorführung, Vorspielung, Sendung, Übertragung, Nachspielung
              oder Speicherung auf Datenspeichermedien bedürfen der ausdrücklichen Zustimmung des jeweiligen Urhebers. Einzelne
              Abzüge und Kopien sind nur für persönlichen, nicht gewerblichen Gebrauch erlaubt, vorausgesetzt, dass alle Hinweise
              auf Urheberrecht, Marke und sonstige Rechte in diesem Dokument beibehalten bleiben. Eine Veröffentlichung dieser
              Website auf eigenen Webpages ohne Genehmigung ist nicht erlaubt.
            </p>
          </div>
        </div>
      </section>
    </AccountLayout>
  )
}
