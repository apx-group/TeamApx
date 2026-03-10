import AccountLayout from '@/components/layout/AccountLayout'

export default function EnImpressum() {
  return (
    <AccountLayout>
      <section className="section legal-section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-xl))' }}>
        <div className="container">
          <h1 className="section-title"><span className="accent">Imprint</span></h1>
          <div style={{ maxWidth: 720, lineHeight: 1.8 }}>
            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)' }}>
              Information according to § 5 TMG
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Darius Krull<br />
              Hainholzfeld 7<br />
              31171 Nordstemmen<br />
              Germany
            </p>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              Email: <a href="mailto:team.apx.r6@gmail.com" style={{ color: 'var(--clr-accent-light)' }}>team.apx.r6@gmail.com</a>
            </p>
            <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              Liability for Content
            </h2>
            <p style={{ marginBottom: 'var(--space-md)' }}>
              The contents of our website have been created with the utmost care. However, we cannot guarantee the contents'
              accuracy, completeness or topicality. According to statutory provisions, we are furthermore responsible for our
              own content on these web pages.
            </p>
          </div>
        </div>
      </section>
    </AccountLayout>
  )
}
