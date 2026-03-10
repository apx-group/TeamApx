import client from './client'
import type { UserSearchResult, User } from '@/types'

export const usersApi = {
  search: (q: string) =>
    client.get<{ users: UserSearchResult[] }>(`/api/users/search?q=${encodeURIComponent(q)}`).then(r => r.data),

  getPublicProfile: (username: string) =>
    client.get<{ user: User }>(`/api/user?u=${encodeURIComponent(username)}`).then(r => r.data),
}

export const adminUsersApi = {
  getUsers: () =>
    client.get<{ users: string[] }>('/api/admin/users').then(r => r.data),

  getUserDetail: (username: string) =>
    client.get(`/api/admin/users/${encodeURIComponent(username)}`).then(r => r.data),

  deactivateUser: (username: string) =>
    client.post(`/api/admin/users/${encodeURIComponent(username)}/deactivate`).then(r => r.data),

  activateUser: (username: string) =>
    client.post(`/api/admin/users/${encodeURIComponent(username)}/activate`).then(r => r.data),

  deleteUser: (username: string) =>
    client.delete(`/api/admin/users/${encodeURIComponent(username)}`).then(r => r.data),

  getNickname: (username: string) =>
    client.get<{ nickname: string }>(`/api/admin/user/nickname?u=${encodeURIComponent(username)}`).then(r => r.data),

  verifyMaster: (password: string) =>
    client.post('/api/admin/verify-master', { password }).then(r => r.data),
}
