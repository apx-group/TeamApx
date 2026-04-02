import { useState, useEffect, useRef } from 'react'
import '@/styles/organization.css'

interface MemberInfo {
  username?: string
  roles: string[]
}

const MEMBERS: Record<string, MemberInfo> = {
  Linus: {
    username: 'xbn',
    roles: ['CEO - Chief Executive Officer', 'Rainbow Six Team-Owner', 'Discord Server Admin', 'Manager'],
  },
  Dionysus: {
    username: 'Dionysus',
    roles: ['CDO - Chief Design Officer', 'Landgraf Racing Team-Owner'],
  },
  'Hops.APX': {
    username: 'Hops.APX',
    roles: ['CLO - Chief Legal Officer'],
  },
  Cr1sPy: {
    roles: ['CFO - Chief Financial Officer', 'Designer', 'Legal Counsel'],
  },
  Jerry: {
    roles: ['Moderator', 'Discord Server Admin'],
  },
  Huwo: {
    roles: ['Discord Server Admin'],
  },
  Crawley: {
    roles: ['Event Manager', 'Discord Server Admin'],
  },
}

function useTypewriter(key: string, segments: string[], speed = 22): string[] {
  const allText = segments.join('\0')
  const [state, setState] = useState({ key, typed: 0 })

  // Derived-state reset: when key changes, reset typed synchronously
  const typed = state.key === key ? state.typed : 0

  useEffect(() => {
    if (typed < allText.length) {
      const t = setTimeout(() => setState({ key, typed: typed + 1 }), speed)
      return () => clearTimeout(t)
    }
  }, [key, typed, allText.length, speed])

  const offsets = segments.reduce<number[]>((acc, _seg, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1]! + segments[i - 1]!.length + 1)
    return acc
  }, [])

  return segments.map((seg, i) =>
    seg.slice(0, Math.max(0, Math.min(typed - offsets[i]!, seg.length)))
  )
}

function MemberImg({ src, name }: { src: string; name: string }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return <span className="org-card__initial">{name.charAt(0).toUpperCase()}</span>
  }
  return <img src={src} alt={name} className="org-card__img" onError={() => setErr(true)} />
}

function MemberCard({
  name,
  role,
  avatarUrl = '',
  onClick,
  selected,
}: {
  name: string
  role: string
  avatarUrl?: string
  onClick?: () => void
  selected?: boolean
}) {
  return (
    <div
      className={`org-card${selected ? ' org-card--selected' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      <div className="org-card__avatar">
        <MemberImg src={avatarUrl} name={name} />
      </div>
      <span className="org-card__name">{name}</span>
      <span className="org-card__role">{role}</span>
    </div>
  )
}

function DetailCard({ name, info }: { name: string; info: MemberInfo }) {
  const segments = [name, ...info.roles]
  const displayed = useTypewriter(name, segments)

  return (
    <div className="org-detail">
      <div className="org-detail__header">
        <span className="org-detail__title">{displayed[0]}</span>
        {info.username && (
          <a
            href={`/user?u=${info.username}`}
            className="org-detail__link"
            target="_blank"
            rel="noreferrer"
          >
            <img src="/icons/link.svg" alt="Profil" className="org-detail__link-icon" />
          </a>
        )}
      </div>
      <hr className="org-detail__divider" />
      <div className="org-detail__roles">
        {info.roles.map((_, i) => (
          <span key={i} className="org-detail__role">{displayed[1 + i]}</span>
        ))}
      </div>
    </div>
  )
}

export default function Organization() {
  const [mgmtOpen, setMgmtOpen] = useState(true)
  const [discordOpen, setDiscordOpen] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const layoutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) {
        setSelected(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (name: string) => setSelected(s => (s === name ? null : name))

  return (
    <section className="org-page">
      <div className="org-page__header">
        <h1 className="section-title"><span className="accent">Organisation</span></h1>
      </div>
      <div className="org-layout" ref={layoutRef}>
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
            <MemberCard
              name="Linus"
              role="CEO"
              onClick={() => toggle('Linus')}
              selected={selected === 'Linus'}
            />

            <div className="org-connector" />

            {/* ── Two branches from CEO ── */}
            <div className="org-row">

              {/* ── Discord ── */}
              <div className="org-col org-col--branch">
                <div className="org-vert-line" />
                <button
                  className={`org-branch-card${discordOpen ? '' : ' org-branch-card--collapsed'}`}
                  onClick={() => setDiscordOpen(o => !o)}
                >
                  <span className="org-branch-card__label">Discord</span>
                </button>
                {discordOpen && (
                  <>
                    <div className="org-connector" />
                    <div className="org-row">
                      <div className="org-col">
                        <div className="org-vert-line" />
                        <MemberCard
                          name="Jerry"
                          role="Moderator"
                          onClick={() => toggle('Jerry')}
                          selected={selected === 'Jerry'}
                        />
                      </div>
                      <div className="org-col">
                        <div className="org-vert-line" />
                        <MemberCard
                          name="Huwo"
                          role="Admin"
                          onClick={() => toggle('Huwo')}
                          selected={selected === 'Huwo'}
                        />
                      </div>
                      <div className="org-col">
                        <div className="org-vert-line" />
                        <MemberCard
                          name="Crawley"
                          role="Event Manager"
                          onClick={() => toggle('Crawley')}
                          selected={selected === 'Crawley'}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ── Staff ── */}
              <div className="org-col org-col--branch">
                <div className="org-vert-line" />
                <button
                  className={`org-branch-card${mgmtOpen ? '' : ' org-branch-card--collapsed'}`}
                  onClick={() => setMgmtOpen(o => !o)}
                >
                  <span className="org-branch-card__label">Staff</span>
                </button>
                {mgmtOpen && (
                  <>
                    <div className="org-connector" />
                    <div className="org-row">
                      <div className="org-col">
                        <div className="org-vert-line" />
                        <MemberCard
                          name="Dionysus"
                          role="CDO"
                          onClick={() => toggle('Dionysus')}
                          selected={selected === 'Dionysus'}
                        />
                      </div>
                      <div className="org-col">
                        <div className="org-vert-line" />
                        <MemberCard
                          name="Hops.APX"
                          role="CLO"
                          onClick={() => toggle('Hops.APX')}
                          selected={selected === 'Hops.APX'}
                        />
                      </div>
                      <div className="org-col">
                        <div className="org-vert-line" />
                        <MemberCard
                          name="Cr1sPy"
                          role="CFO"
                          onClick={() => toggle('Cr1sPy')}
                          selected={selected === 'Cr1sPy'}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>

          </div>
        </div>

        {selected && MEMBERS[selected] && (
          <DetailCard name={selected} info={MEMBERS[selected]} />
        )}
      </div>
    </section>
  )
}
