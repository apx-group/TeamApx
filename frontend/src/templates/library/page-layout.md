# Page Layout — Template Library

## A) AccountLayout Page (Protected)

Verwendung für: `/profile`, `/security`, `/settings`, `/badges` usw.

```tsx
import { useEffect, useState } from 'react'
import AccountLayout from '@/templates/layout/AccountLayout'
import { useI18n } from '@/contexts/I18nContext'
import { someApi } from '@/api/someApi' // replace with actual api module

interface SomeItem {
  id: number
  name: string
}

export default function MyPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<SomeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    someApi.getAll()
      .then(data => setItems(data))
      .catch(() => setError('Daten konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AccountLayout>
      <section className="section">
        <div className="container">
          <h1 className="section-title">
            <span className="accent">Seitentitel</span>
          </h1>

          {loading && <p className="settings-placeholder">Lädt…</p>}
          {error && <p className="settings-placeholder" style={{ color: '#ef4444' }}>{error}</p>}

          {!loading && !error && (
            <div>
              {/* page content */}
            </div>
          )}
        </div>
      </section>
    </AccountLayout>
  )
}
```

Register in `App.tsx` innerhalb `<ProtectedRoute>`:

```tsx
<Route path="/my-page" element={<MyPage />} />
```

## B) Public Section Page

Verwendung für: `/`, `/rainbow-six`, `/assetto-corsa` usw.

```tsx
export default function MyPublicPage() {
  return (
    <main>
      <section className="section">
        <div className="container">
          <h1 className="section-title">
            <span className="accent">Titel</span>
          </h1>
          <p style={{ color: 'var(--clr-text-muted)' }}>Beschreibungstext.</p>
        </div>
      </section>
    </main>
  )
}
```

## Matching CSS Skeleton

Create: `frontend/src/styles/mypage.css`

```css
.mypage-xyz {
  background: var(--clr-bg-card);
  border: 1px solid var(--clr-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}
```

Import in component:

```tsx
import '@/styles/mypage.css'
```
