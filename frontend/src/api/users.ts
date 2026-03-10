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

  toggle2fa: (username: string) =>
    client.post(`/api/admin/users/${encodeURIComponent(username)}/toggle-2fa`).then(r => r.data),

  getUserBadges: (username: string) =>
    client.get(`/api/admin/user-badges?username=${encodeURIComponent(username)}`).then(r => r.data),

  updateUserBadge: (username: string, badge_id: number, level: number) =>
    client.post('/api/admin/user-badges', { username, badge_id, level }).then(r => r.data),

  removeUserBadge: (username: string, badge_id: number) =>
    client.delete(`/api/admin/user-badges?username=${encodeURIComponent(username)}&badge_id=${badge_id}`).then(r => r.data),
}
