export default function EnImpressum() {
  return (
    <section className="section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-2xl))' }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="section-title">Legal Notice</h1>

        <div style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-lg)', lineHeight: 1.8 }}>

          <p style={{ marginBottom: 'var(--space-md)' }}>
            This legal notice applies to all content and services provided on this website, unless they are covered by a separate legal notice.
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            Information pursuant to § 5 DDG
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Darius Krull<br />
            Hainholzfeld 7<br />
            31171 Nordstemmen<br />
            Germany
          </p>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Email: <a href="mailto:info@apx-team.com" style={{ color: 'var(--clr-accent-light)' }}>info@apx-team.com</a>
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            Editorial Responsibility
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Responsible for content pursuant to § 18 para. 2 MStV:<br />
            Darius Krull<br />
            Hainholzfeld 7<br />
            31171 Nordstemmen
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            Links to External Websites
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            This website contains links to external third-party websites over whose content we have no influence. The operators of the linked pages are solely responsible for their content. The linked pages were checked for legal violations at the time of linking; no illegal content was detected. Permanent monitoring of the linked pages is not reasonable without concrete evidence of legal violations. If we become aware of any legal violations, such links will be removed immediately.
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            Copyright
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            The content and works provided on this website are protected by German copyright law. Reproduction, editing, translation, distribution, performance, broadcast, transmission, or storage on data storage media require the express consent of the respective author. Individual prints and copies are only permitted for personal, non-commercial use, provided that all copyright, trademark, and other proprietary notices in this document are retained. Publication of this website on other web pages without permission is not allowed.
          </p>

        </div>
      </div>
    </section>
  )
}
