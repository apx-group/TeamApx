# Form Fields — Template Library

CSS-Klassen:
- `frontend/src/styles/apply.css` (form-field)
- `frontend/src/styles/auth.css` (auth-form Variante)

Pattern: `fieldErrors` State + `.error` Klasse + `.form-error` Span

## State Boilerplate

```tsx
const [form, setForm] = useState({ email: '', message: '', role: '', agree: false })
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
const [submitError, setSubmitError] = useState('')
const [loading, setLoading] = useState(false)

function validate() {
  const errs: Record<string, string> = {}
  if (!form.email) errs.email = 'E-Mail ist erforderlich.'
  if (!form.message) errs.message = 'Nachricht ist erforderlich.'
  setFieldErrors(errs)
  return Object.keys(errs).length === 0
}

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (!validate()) return
  setLoading(true)
  setSubmitError('')
  try {
    // await someApi.submit(form)
  } catch {
    setSubmitError('Ein Fehler ist aufgetreten.')
  } finally {
    setLoading(false)
  }
}
```

## Text Input

```tsx
<div className={`form-field${fieldErrors.email ? ' error' : ''}`}>
  <label htmlFor="email">E-Mail</label>
  <input
    id="email"
    type="email"
    placeholder="name@example.com"
    value={form.email}
    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
  />
  <span className="form-error">{fieldErrors.email}</span>
</div>
```

## Password Input

```tsx
<div className={`form-field${fieldErrors.password ? ' error' : ''}`}>
  <label htmlFor="password">Passwort</label>
  <input
    id="password"
    type="password"
    placeholder="••••••••"
    value={form.password}
    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
  />
  <span className="form-error">{fieldErrors.password}</span>
</div>
```

## Textarea

```tsx
<div className={`form-field${fieldErrors.message ? ' error' : ''}`}>
  <label htmlFor="message">Nachricht</label>
  <textarea
    id="message"
    placeholder="Schreibe hier …"
    rows={4}
    value={form.message}
    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
  />
  <span className="form-error">{fieldErrors.message}</span>
</div>
```

## Native Select

```tsx
<div className={`form-field${fieldErrors.role ? ' error' : ''}`}>
  <label htmlFor="role">Rolle</label>
  <select
    id="role"
    value={form.role}
    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
  >
    <option value="">– Bitte wählen –</option>
    <option value="entry">Entry</option>
    <option value="igl">IGL</option>
  </select>
  <span className="form-error">{fieldErrors.role}</span>
</div>
```

## Custom Checkbox (Component)

Siehe: `frontend/src/components/CustomCheckbox.tsx`

```tsx
<CustomCheckbox
  id="agree"
  checked={form.agree}
  onChange={checked => setForm(f => ({ ...f, agree: checked }))}
  label="Ich stimme den Nutzungsbedingungen zu"
/>
```

## Form-Level Error + Submit

```tsx
{submitError && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{submitError}</p>}

<button className="btn btn-primary btn-submit" type="submit" disabled={loading}>
  {loading ? 'Wird gesendet…' : 'Absenden'}
</button>
```

## Full Form Wrapper

```tsx
<form onSubmit={handleSubmit} noValidate>
  {/* fields */}
  {submitError && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{submitError}</p>}
  <button className="btn btn-primary btn-submit" type="submit" disabled={loading}>
    {loading ? 'Wird gesendet…' : 'Absenden'}
  </button>
</form>
```
