import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'

const DISCORD_INVITE_URL =
  'https://discord.com/oauth2/authorize?client_id=1374107864154767520&scope=bot+applications.commands&permissions=8'

export default function Betzh() {
  const { lang } = useI18n()
  const [showInviteOverlay, setShowInviteOverlay] = useState(false)

  const isDE = lang === 'de'

  return (
    <>
      {/* Hero */}
      <section
        className="hero"
        id="hero"
        style={{
          background: 'var(--clr-bg)',
          minHeight: '80vh',
          height: 'auto',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(190, 160, 93, 0.12) 0%, transparent 65%), radial-gradient(ellipse at 80% 20%, rgba(212, 187, 126, 0.06) 0%, transparent 50%)',
            zIndex: 0,
          }}
        />
        <div className="hero-content">
          <h1
            className="hero-title"
            onClick={() => setShowInviteOverlay(true)}
            style={{
              color: 'var(--clr-accent-light)',
              cursor: 'pointer',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            BETZH#0715
          </h1>
          <p className="hero-subtitle">
            {isDE ? 'Discord Bot' : 'Discord Bot'}
          </p>
          <div className="hero-actions">
            <a href="#info" className="btn btn-primary">
              {isDE ? 'Mehr erfahren' : 'Learn more'}
            </a>
            <a href="#contact" className="btn btn-outline">
              {isDE ? 'Kontakt' : 'Contact'}
            </a>
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="section" id="info">
        <div className="container" style={{ maxWidth: 800 }}>
          <h2 className="section-title">
            {isDE ? <>Über <span className="accent">Betzh</span></> : <>About <span className="accent">Betzh</span></>}
          </h2>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-lg)', lineHeight: 1.8, textAlign: 'center' }}>
            {isDE
              ? 'Betzh#0715 ist ein vielseitiger Discord-Bot, der deinen Server mit nützlichen Funktionen bereichert. Von interaktiven Befehlen bis hin zu automatisierten Abläufen — Betzh macht deine Community noch besser. Egal ob du einen kleinen Freundeskreis oder eine große Community betreibst, Betzh passt sich deinen Bedürfnissen an und bietet dir die Werkzeuge, die du für einen erfolgreichen Server brauchst.'
              : 'Betzh#0715 is a versatile Discord bot designed to enhance your server with powerful features. From interactive commands to automated workflows, Betzh takes your community to the next level. Whether you run a small friend group or a large community, Betzh adapts to your needs and provides you with the tools required for a successful server.'}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features" style={{ background: 'var(--clr-surface)' }}>
        <div className="container">
          <h2 className="section-title">
            {isDE ? <>Top <span className="accent">Features</span></> : <>Top <span className="accent">Features</span></>}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--space-lg)',
              marginTop: 'var(--space-lg)',
            }}
          >
            {[
              {
                icon: '🛡️',
                title: isDE ? 'Moderation' : 'Moderation',
                desc: isDE
                  ? 'Automatische Server-Moderation mit konfigurierbaren Regeln und Filtern, um deine Community sicher zu halten.'
                  : 'Automated server moderation with configurable rules and filters to keep your community safe.',
              },
              {
                icon: '⚡',
                title: isDE ? 'Custom Commands' : 'Custom Commands',
                desc: isDE
                  ? 'Erstelle personalisierte Befehle, um deinen Server einzigartig und interaktiv für alle Mitglieder zu gestalten.'
                  : 'Create personalized commands to make your server unique and interactive for all members.',
              },
              {
                icon: '📊',
                title: isDE ? 'Statistiken' : 'Statistics',
                desc: isDE
                  ? 'Verfolge Nutzeraktivitäten, Nachrichtenzähler und Engagement-Metriken für deinen Discord-Server.'
                  : 'Track user activity, message counts, and engagement metrics for your Discord server.',
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  background: 'var(--clr-bg-card)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-sm)',
                }}
              >
                <span style={{ fontSize: '2rem' }}>{f.icon}</span>
                <h3
                  style={{
                    color: 'var(--clr-text)',
                    fontSize: 'var(--fs-xl)',
                    fontWeight: 700,
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ color: 'var(--clr-text-muted)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="section" id="contact">
        <div className="container" style={{ maxWidth: 700 }}>
          <h2 className="section-title" style={{ color: 'var(--clr-accent-light)' }}>
            {isDE ? 'Kontakt' : 'Contact'}
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                background: 'var(--clr-bg-card)',
                border: '1px solid var(--clr-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-lg)',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
              }}
            >
              <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isDE ? 'Maintainer' : 'Maintainer'}
              </p>
              <Link to="/user?u=xbn" style={{ color: 'var(--clr-text)', fontSize: 'var(--fs-lg)', fontWeight: 600, textDecoration: 'none' }}>
                xbn
              </Link>

              <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'var(--space-sm)' }}>
                {isDE ? 'E-Mail' : 'Email'}
              </p>
              <a
                href="mailto:devbetzh@gmail.com"
                style={{ color: 'var(--clr-accent-light)', fontSize: 'var(--fs-lg)' }}
              >
                devbetzh@gmail.com
              </a>

              <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'var(--space-sm)' }}>
                Discord
              </p>
              <a
                href="https://discord.gg/PQg5hqr4K5"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ display: 'inline-block', width: 'fit-content' }}
              >
                {isDE ? 'Server beitreten' : 'Join Server'}
              </a>
            </div>

            <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-base)', marginTop: 'var(--space-md)' }}>
              <Link to="/betzh/privacy-policy" style={{ color: 'var(--clr-accent-light)' }}>
                {isDE ? 'Datenschutzrichtlinie' : 'Privacy Policy'}
              </Link>
              {' · '}
              <Link to="/betzh/terms-of-service" style={{ color: 'var(--clr-accent-light)' }}>
                {isDE ? 'Nutzungsbedingungen' : 'Terms Of Service'}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Invite Overlay */}
      {showInviteOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowInviteOverlay(false)}
        >
          <div
            style={{
              background: 'var(--clr-bg-card)',
              border: '1px solid var(--clr-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              maxWidth: 480,
              width: '90%',
              animation: 'modalIn 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: 'var(--clr-text)', marginBottom: 'var(--space-md)', textAlign: 'center' }}>
              {isDE ? 'Betzh#0715 einladen' : 'Invite Betzh#0715'}
            </h2>
            <p
              style={{
                color: 'var(--clr-text-muted)',
                marginBottom: 'var(--space-lg)',
                textAlign: 'center',
                fontSize: 'var(--fs-base)',
              }}
            >
              {isDE
                ? 'Klicke auf "Einladen", um Betzh#0715 zu deinem Discord-Server hinzuzufügen.'
                : 'Click "Invite" to add Betzh#0715 to your Discord server.'}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'space-between' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowInviteOverlay(false)}
                style={{ flex: 1 }}
              >
                {isDE ? 'Abbrechen' : 'Cancel'}
              </button>
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isDE ? 'Einladen' : 'Invite'}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
