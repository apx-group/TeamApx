# Buttons — Template Library

CSS-Klassen: `frontend/src/styles/style.css`

## Primary Button

```tsx
<button className="btn btn-primary">Speichern</button>
```

## Large Base Button

```tsx
<button className="btn btn-primary btn-large">Jetzt bewerben</button>
```

## Outline Button

```tsx
<button className="btn btn-outline">Abbrechen</button>
```

## Outline Large

```tsx
<button className="btn btn-outline btn-large">Mehr erfahren</button>
```

## Disabled

```tsx
<button className="btn btn-primary" disabled>Gespeichert</button>
```

## Loading State

```tsx
const [loading, setLoading] = useState(false)

<button
  className="btn btn-primary"
  disabled={loading}
  onClick={handleSubmit}
>
  {loading ? 'Wird gespeichert…' : 'Speichern'}
</button>
```

## Icon Left (inline SVG)

```tsx
<button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
  Speichern
</button>
```

## Danger / Destructive

```tsx
<button
  className="btn btn-outline"
  style={{ borderColor: '#ef4444', color: '#ef4444' }}
  onClick={handleDelete}
>
  Account löschen
</button>
```
