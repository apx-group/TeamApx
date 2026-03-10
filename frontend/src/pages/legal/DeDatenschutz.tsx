import AccountLayout from '@/components/layout/AccountLayout'

export default function DeDatenschutz() {
  return (
    <AccountLayout>
      <section className="section legal-section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-xl))' }}>
        <div className="container">
          <h1 className="section-title"><span className="accent">Datenschutz</span></h1>
          <div style={{ maxWidth: 720, lineHeight: 1.8, color: 'var(--clr-text)' }}>
            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)' }}>Datenschutzerklärung</h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir verarbeiten Ihre Daten daher
              ausschließlich auf Grundlage der gesetzlichen Bestimmungen (DSGVO, TKG 2003).
            </p>
            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>Kontakt</h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Wenn Sie per E-Mail Kontakt mit uns aufnehmen, werden Ihre angegebenen Daten zwecks Bearbeitung der Anfrage
              und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
            </p>
            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>Ihre Rechte</h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Ihnen stehen bezüglich Ihrer bei uns gespeicherten Daten grundsätzlich die Rechte auf Auskunft, Berichtigung,
              Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch zu. Wenn Sie glauben, dass die Verarbeitung Ihrer
              Daten gegen das Datenschutzrecht verstößt oder Ihre datenschutzrechtlichen Ansprüche sonst in einer Weise verletzt
              worden sind, können Sie sich bei der zuständigen Aufsichtsbehörde beschweren.
            </p>
            <p>
              E-Mail: <a href="mailto:team.apx.r6@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>team.apx.r6@gmail.com</a>
            </p>
          </div>
        </div>
      </section>
    </AccountLayout>
  )
}
