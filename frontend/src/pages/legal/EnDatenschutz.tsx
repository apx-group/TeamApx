export default function EnDatenschutz() {
  return (
    <section className="section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-2xl))' }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="section-title">Privacy Policy</h1>

        <div style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-lg)', lineHeight: 1.8 }}>

          <p style={{ marginBottom: 'var(--space-md)' }}>
            This privacy policy explains how we collect, use, store, and protect personal data on this website. It applies to all visitors and users of our website.
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            1. Data Controller
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Darius Krull<br />
            Hainholzfeld 7<br />
            31171 Nordstemmen
          </p>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            Email: <a href="mailto:info@apx-team.com" style={{ color: 'var(--clr-accent-light)' }}>info@apx-team.com</a>
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            2. What Data Do We Collect and Process?
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            When visiting and using our website, the following categories of personal data are collected and processed:
          </p>
          <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--clr-text)', fontWeight: 600 }}>
            Automatically collected data (by the web server):
          </p>
          <ul style={{ marginBottom: 'var(--space-sm)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>IP address of the accessing device</li>
            <li>Date and time of access</li>
            <li>Browser and operating system of the device</li>
            <li>Requested URL / page path</li>
            <li>Referrer URL (originating page)</li>
          </ul>
          <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--clr-text)', fontWeight: 600 }}>
            Data collected through the application form:
          </p>
          <ul style={{ marginBottom: 'var(--space-sm)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>First and last name</li>
            <li>Discord ID</li>
            <li>Age</li>
            <li>Player data (e.g. player name, statistics)</li>
          </ul>
          <p style={{ marginBottom: 'var(--space-xs)', color: 'var(--clr-text)', fontWeight: 600 }}>
            Data collected upon registration and use of a user account:
          </p>
          <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>Email address</li>
            <li>Encrypted password data</li>
            <li>IP address and login timestamps</li>
            <li>Security-relevant information for device recognition</li>
            <li>Profile picture and display name (optional)</li>
          </ul>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            3. User Accounts and Authentication
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            When creating a user account, we process personal data required for authentication and account security. This includes in particular:
          </p>
          <ul style={{ marginBottom: 'var(--space-sm)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>Email address</li>
            <li>Encrypted password data</li>
            <li>IP address and login timestamps</li>
            <li>Security-relevant information for device recognition</li>
          </ul>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            This data is used exclusively for providing and securing the user account.<br />
            <strong>Legal basis:</strong> Art. 6(1)(b) GDPR (performance of a contract / use of the platform)
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            4. Two-Factor Authentication (2FA)
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            To enhance account security, we offer two-factor authentication (2FA). When 2FA is enabled, a one-time security code is sent to the registered email address. The email address is processed for this purpose; the code is valid for a limited time and is not stored permanently.<br />
            <strong>Legal basis:</strong> Art. 6(1)(f) GDPR – legitimate interest (account security)
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            5. Device Recognition
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            To recognise known devices and improve security, we store certain technical information upon successful logins, in particular IP address and time of access. This information is used to detect unfamiliar login attempts and protect the account. This data is not shared with third parties.<br />
            <strong>Legal basis:</strong> Art. 6(1)(f) GDPR – legitimate interest (security)
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            6. Linking Third-Party Accounts
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Users may voluntarily link their account to external platforms such as Twitch, Discord, or YouTube/Google. Authentication is carried out via the OAuth protocol of the respective platform. Only the information necessary for the link is transmitted, in particular:
          </p>
          <ul style={{ marginBottom: 'var(--space-sm)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>User ID of the respective platform</li>
            <li>Username</li>
            <li>Publicly visible profile information (e.g. profile picture), where applicable</li>
          </ul>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            This link is voluntary and can be removed at any time in the user account. The privacy policies of the respective providers also apply (Twitch: <a href="https://www.twitch.tv/p/de-de/legal/privacy-notice/" style={{ color: 'var(--clr-accent-light)' }} target="_blank" rel="noopener noreferrer">twitch.tv</a>, Discord: <a href="https://discord.com/privacy" style={{ color: 'var(--clr-accent-light)' }} target="_blank" rel="noopener noreferrer">discord.com</a>, YouTube/Google: <a href="https://policies.google.com/privacy" style={{ color: 'var(--clr-accent-light)' }} target="_blank" rel="noopener noreferrer">policies.google.com</a>, Challengermode: <a href="https://challengermode.com/privacy-policy" style={{ color: 'var(--clr-accent-light)' }} target="_blank" rel="noopener noreferrer">challengermode.com</a>).<br />
            <strong>Legal basis:</strong> Art. 6(1)(a) GDPR (consent)
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            7. Cookies and Session Data
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            For the login and use of user accounts, we use technically necessary session cookies. These cookies contain no personal data, only an encrypted session ID used to associate the connection with the logged-in account. Cookies are deleted upon logout or after the session expires. No tracking or advertising cookies are used.<br />
            <strong>Legal basis:</strong> Art. 6(1)(f) GDPR – legitimate interest (technically necessary operation)
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            8. Purpose of Data Processing
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            The collected data is processed for the following purposes:
          </p>
          <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>Operation and security of the website</li>
            <li>Provision, management, and security of user accounts</li>
            <li>Conducting two-factor authentication</li>
            <li>Recognition of known devices to protect against unauthorised access</li>
            <li>Evaluation and processing of membership applications</li>
            <li>Contacting applicants in connection with submitted applications</li>
            <li>Management of community members</li>
          </ul>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            9. Legal Basis for Data Processing
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Data processing is based on the following legal grounds pursuant to Regulation (EU) 2016/679 (GDPR):
          </p>
          <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li><strong>Art. 6(1)(b) GDPR – Performance of a contract:</strong> For processing carried out in the context of account use and platform provision.</li>
            <li><strong>Art. 6(1)(f) GDPR – Legitimate interests:</strong> For automatically collected data, device recognition, session cookies, and security measures.</li>
            <li><strong>Art. 6(1)(a) GDPR – Consent:</strong> For linking third-party accounts and voluntarily submitted application data.</li>
          </ul>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            10. Storage Location and Data Transfer
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            All personal data we collect directly is stored on a server operated by us in Germany. When voluntarily using third-party account links (Twitch, Discord), data may be transferred to countries outside the European Union as part of the OAuth process, since Twitch and Discord are companies based in the USA. Such transfers are carried out on the basis of Standard Contractual Clauses (SCCs) pursuant to Art. 46 GDPR.
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            11. Storage Duration
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            We store personal data only as long as necessary for the respective purpose:
          </p>
          <ul style={{ marginBottom: 'var(--space-md)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li>Automatically collected access log data is deleted after 30 days, unless required for website security.</li>
            <li>Application data is stored for the duration of the application process and deleted within 90 days of completion, unless membership is established.</li>
            <li>Account data is stored for the duration of account use. Upon account deletion, all associated personal data is removed within 30 days.</li>
            <li>Session cookies and device information are automatically deleted upon logout or after the configured validity period expires.</li>
          </ul>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            12. Disclosure to Third Parties
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            We do not generally disclose personal data to third parties unless there is a legal obligation to do so or you have given your explicit consent. The use of third-party account links (Section 6) is initiated exclusively at your request.
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            13. Your Rights as a Data Subject
          </h2>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Under the GDPR, you have the following rights with regard to us as the data controller:
          </p>
          <ul style={{ marginBottom: 'var(--space-sm)', paddingLeft: '1.5rem', listStyle: 'disc' }}>
            <li><strong>Right of access (Art. 15 GDPR)</strong> – You can find out what data about you is stored.</li>
            <li><strong>Right to rectification (Art. 16 GDPR)</strong> – You can have incorrect data corrected.</li>
            <li><strong>Right to erasure (Art. 17 GDPR)</strong> – Under certain conditions, you can request the deletion of your data.</li>
            <li><strong>Right to restriction of processing (Art. 18 GDPR)</strong></li>
            <li><strong>Right to data portability (Art. 20 GDPR)</strong></li>
            <li><strong>Right to object (Art. 21 GDPR)</strong> – You can object to processing based on legitimate interests.</li>
          </ul>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            To exercise any of these rights, please contact us at: <a href="mailto:info@apx-team.com" style={{ color: 'var(--clr-accent-light)' }}>info@apx-team.com</a>
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            14. Complaint to a Supervisory Authority
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            You have the right to lodge a complaint with a data protection supervisory authority. The competent authority for Lower Saxony is the State Commissioner for Data Protection of Lower Saxony (LfDI).
          </p>

          <h2 style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-xl)', marginBottom: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            15. Changes to This Privacy Policy
          </h2>
          <p style={{ marginBottom: 'var(--space-md)' }}>
            We reserve the right to change or update this privacy policy at any time. Changes will be published on this page. The policy in its current version applies from the time of its publication.
          </p>

          <p style={{ marginTop: 'var(--space-lg)', fontSize: 'var(--fs-sm)', color: 'var(--clr-text-muted)' }}>
            This privacy policy was last updated on March 6, 2026 and consists of 15 sections.
          </p>

        </div>
      </div>
    </section>
  )
}
