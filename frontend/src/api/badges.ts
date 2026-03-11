import client from './client'
import type { Badge, AdminBadge } from '@/types'

export const badgesApi = {
  getMyBadges: () =>
    client.get<{ badges: Badge[] }>('/api/badges').then(r => r.data),
}

export const adminBadgesApi = {
  getBadges: () =>
    client.get<{ badges: AdminBadge[] }>('/api/admin/badges').then(r => r.data),

  createBadge: (data: Partial<AdminBadge>) =>
    client.post<AdminBadge>('/api/admin/badges', data).then(r => r.data),

  updateBadge: (id: number, data: Partial<AdminBadge>) =>
    client.put('/api/admin/badges', { ...data, id }).then(r => r.data),

  deleteBadge: (id: number) =>
    client.delete('/api/admin/badges', { data: { id } }).then(r => r.data),

  uploadImage: (id: number, file: File) => {
    const fd = new FormData()
    fd.append('image', file)
    return client.post(`/api/admin/badges/image?id=${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  assignBadge: (username: string, badge_id: number, level: number) =>
    client.post('/api/admin/user-badges', { username, badge_id, level }).then(r => r.data),
}

export const adminApplyApi = {
  getApplications: () =>
    client.get('/api/admin/applications').then(r => r.data),

  updateApplication: (id: number, status: string) =>
    client.put(`/api/admin/applications/${id}`, { status }).then(r => r.data),
}

export const applyApi = {
  submit: (data: Record<string, string | number>) =>
    client.post('/api/apply', data).then(r => r.data),
}
