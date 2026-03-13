# API Module — Template Library

Pattern entspricht: `frontend/src/api/*.ts`

Alle API-Calls laufen über die Axios-Instanz `api/client.ts`. Nie `fetch`/`axios` direkt in Komponenten.

## Type Definitions

```ts
export interface MyItem {
  id: number
  name: string
  created_at: string
}
```

## API Module

```ts
import client from '@/api/client'

export const myItemApi = {
  getAll(): Promise<MyItem[]> {
    return client.get('/api/my-items').then(r => r.data)
  },

  getOne(id: number): Promise<MyItem> {
    return client.get(`/api/my-items/${id}`).then(r => r.data)
  },

  create(payload: { name: string }): Promise<MyItem> {
    return client.post('/api/my-items', payload).then(r => r.data)
  },

  update(id: number, payload: Partial<{ name: string }>): Promise<MyItem> {
    return client.put(`/api/my-items/${id}`, payload).then(r => r.data)
  },

  remove(id: number): Promise<void> {
    return client.delete(`/api/my-items/${id}`).then(() => undefined)
  },
}
```

## File Upload (Multipart)

```ts
export const myUploadApi = {
  uploadImage(file: File): Promise<{ url: string }> {
    const fd = new FormData()
    fd.append('image', file)
    return client.post('/api/admin/my-resource/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}
```

## Usage in Component

```tsx
import { myItemApi } from '@/api/myItemApi'

const [items, setItems] = useState<MyItem[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  myItemApi.getAll()
    .then(setItems)
    .catch(() => setError('Fehler beim Laden.'))
    .finally(() => setLoading(false))
}, [])

async function handleCreate() {
  try {
    const created = await myItemApi.create({ name: form.name })
    setItems(prev => [...prev, created])
  } catch {
    setSubmitError('Erstellen fehlgeschlagen.')
  }
}

async function handleDelete(id: number) {
  try {
    await myItemApi.remove(id)
    setItems(prev => prev.filter(i => i.id !== id))
  } catch {
    setError('Löschen fehlgeschlagen.')
  }
}
```
