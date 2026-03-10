import AccountLayout from '@/components/layout/AccountLayout'

export default function EnDatenschutz() {
  return (
    <AccountLayout>
      <section className="section legal-section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-xl))' }}>
        <div className="container">
          <h1 className="section-title"><span className="accent">Privacy Policy</span></h1>
          <div style={{ maxWidth: 720, lineHeight: 1.8 }}>
            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)' }}>Privacy Policy</h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              The protection of your personal data is of particular concern to us. We therefore process your data exclusively
              on the basis of the statutory provisions (GDPR).
            </p>
            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>Contact</h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              If you contact us by email, your data will be stored for the purpose of processing the inquiry and in case of
              follow-up questions. We do not share this data without your consent.
            </p>
            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>Your Rights</h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              You generally have the rights to access, rectification, deletion, restriction, data portability and objection
              regarding the data stored by us.
            </p>
            <p>
              Email: <a href="mailto:team.apx.r6@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>team.apx.r6@gmail.com</a>
            </p>
          </div>
        </div>
      </section>
    </AccountLayout>
  )
}
