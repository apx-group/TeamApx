import AccountLayout from '@/components/layout/AccountLayout'

export default function AssettoCorse() {
  return (
    <AccountLayout>
      <section className="section" style={{ paddingTop: 'calc(var(--nav-height) + var(--space-xl))', minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">ASSETTO CORSA <span className="accent">COMPETIZIONE</span></h1>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-xl)' }}>Soon available</p>
        </div>
      </section>
    </AccountLayout>
  )
}
