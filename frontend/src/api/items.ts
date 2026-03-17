import client from './client'
import type { Item, UserItem } from '@/types'

export const itemsApi = {
  getMyItems: () =>
    client.get<{ items: UserItem[] }>('/api/items/my').then(r => r.data),
}

export const adminItemsApi = {
  getItems: () =>
    client.get<{ items: Item[] }>('/api/admin/items').then(r => r.data),

  createItem: (data: {
    name: string
    rarity: string
    image_url: string
    is_weapon: boolean
    is_armor: boolean
    is_item: boolean
    is_animal: boolean
    perks: string[]
  }) =>
    client.post<{ item: Item }>('/api/admin/items', data).then(r => r.data),

  deleteItem: (itemId: string) =>
    client.delete('/api/admin/items', { data: { item_id: itemId } }).then(r => r.data),

  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('image', file)
    return client
      .post<{ image_url: string }>('/api/admin/items/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data)
  },
}
