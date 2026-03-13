# Modal / Overlay — Template Library

Inline-Styles, um globale CSS-Konflikte zu vermeiden.
Pattern entspricht z. B. Badge-Overlay und Logout-Overlay im Codebase.

## State

```tsx
const [modal, setModal] = useState(false)
```

## Trigger Button

```tsx
<button className="btn btn-primary" onClick={() => setModal(true)}>
  Öffnen
</button>
```

## Simple Confirmation Modal

```tsx
{modal && (
  <div
    onClick={e => { if (e.target === e.currentTarget) setModal(false) }}
    style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <div style={{
      background: 'var(--clr-bg-card)',
      border: '1px solid var(--clr-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '2rem',
      maxWidth: 420, width: '90%',
      position: 'relative',
    }}>
      <button
        onClick={() => setModal(false)}
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'none', border: 'none',
          color: 'var(--clr-text-muted)', fontSize: '1.5rem', cursor: 'pointer',
        }}
      >
        &times;
      </button>

      <h3 style={{ marginBottom: '0.75rem' }}>Titel</h3>
      <p style={{ color: 'var(--clr-text-muted)', marginBottom: '1.5rem' }}>
        Beschreibungstext für den Modal-Inhalt.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" onClick={() => setModal(false)}>Abbrechen</button>
        <button className="btn btn-primary" onClick={() => { /* action */ setModal(false) }}>
          Bestätigen
        </button>
      </div>
    </div>
  </div>
)}
```

## Danger / Destructive Confirmation

```tsx
<button
  className="btn btn-outline"
  style={{ borderColor: '#ef4444', color: '#ef4444' }}
  onClick={handleDangerAction}
>
  Löschen
</button>
```

## Modal With Form Inside

```tsx
{modal && (
  <div
    onClick={e => { if (e.target === e.currentTarget) setModal(false) }}
    style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <div style={{
      background: 'var(--clr-bg-card)',
      border: '1px solid var(--clr-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '2rem',
      maxWidth: 480, width: '90%',
      position: 'relative',
    }}>
      <button
        onClick={() => setModal(false)}
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'none', border: 'none',
          color: 'var(--clr-text-muted)', fontSize: '1.5rem', cursor: 'pointer',
        }}
      >
        &times;
      </button>

      <h3 style={{ marginBottom: '1.5rem' }}>Formular-Titel</h3>

      <form onSubmit={handleSubmit} noValidate>
        <div className={`form-field${fieldErrors.name ? ' error' : ''}`}>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <span className="form-error">{fieldErrors.name}</span>
        </div>

        {submitError && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{submitError}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Abbrechen</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Wird gespeichert…' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```
