import { useState } from 'react'
import '@/styles/organization.css'

function MemberImg({ src, name }: { src: string; name: string }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return <span className="org-card__initial">{name.charAt(0).toUpperCase()}</span>
  }
  return <img src={src} alt={name} className="org-card__img" onError={() => setErr(true)} />
}

function MemberCard({ name, role, avatarUrl = '' }: { name: string; role: string; avatarUrl?: string }) {
  return (
    <div className="org-card">
      <div className="org-card__avatar">
        <MemberImg src={avatarUrl} name={name} />
      </div>
      <span className="org-card__name">{name}</span>
      <span className="org-card__role">{role}</span>
    </div>
  )
}

export default function Organization() {
  const [mgmtOpen, setMgmtOpen] = useState(true)

  return (
    <section className="org-page">
      <div className="org-page__header">
        <h1 className="section-title"><span className="accent">Organisation</span></h1>
      </div>
      <div className="org-scroll">
        <div className="org-tree">

          {/* ── Root ── */}
          <div className="org-root-card org-root-card--wide">
            <div className="org-root-card__logo">APX</div>
            <span className="org-root-card__name">TEAM APX</span>
            <span className="org-root-card__sub">E-Sports Organization</span>
          </div>

          <div className="org-connector" />

          {/* ── CEO ── */}
          <MemberCard name="Linus" role="CEO" />

          <div className="org-connector" />

          {/* ── Management (toggleable) ── */}
          <button
            className={`org-branch-card${mgmtOpen ? '' : ' org-branch-card--collapsed'}`}
            onClick={() => setMgmtOpen(o => !o)}
          >
            <span className="org-branch-card__label">Management</span>
            <span className={`org-branch-card__arrow${mgmtOpen ? ' org-branch-card__arrow--open' : ''}`}>▼</span>
          </button>

          {mgmtOpen && (
            <>
              <div className="org-connector" />
              <div className="org-row">
                <div className="org-col">
                  <div className="org-vert-line" />
                  <MemberCard name="Dionysus" role="Head of Design" />
                </div>
                <div className="org-col">
                  <div className="org-vert-line" />
                  <MemberCard name="Hops.APX" role="Head of Legal Team" />
                </div>
                <div className="org-col">
                  <div className="org-vert-line" />
                  <MemberCard name="Cr1sPy" role="Designer | Legal Counsel" />
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </section>
  )
}
