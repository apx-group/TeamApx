import client from './client'
import type { User, TrustedDevice } from '@/types'

export const authApi = {
  me: () =>
    client.get<{ user: User | null }>('/api/auth/me').then(r => r.data),

  login: (login: string, password: string) =>
    client.post<{ twofa?: boolean; token?: string }>('/api/auth/login', { login, password }).then(r => r.data),

  login2fa: (token: string, code: string, device_name?: string) =>
    client.post('/api/auth/login-2fa', { token, code, device_name }).then(r => r.data),

  logout: () =>
    client.post('/api/auth/logout').then(r => r.data),

  register: (data: {
    username: string
    nickname?: string
    email: string
    password: string
    confirm_password: string
  }) =>
    client.post<{ pending?: boolean }>('/api/auth/register', data).then(r => r.data),

  verifyEmail: (email: string, code: string) =>
    client.post('/api/auth/verify-email', { email, code }).then(r => r.data),

  getProfile: () =>
    client.get<{ user: User }>('/api/auth/profile').then(r => r.data),

  updateProfile: (formData: FormData) =>
    client.put('/api/auth/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  updateUsername: (username: string) =>
    client.put('/api/auth/profile', { username }).then(r => r.data),

  changeEmail: (email: string) =>
    client.post<{ pending?: boolean }>('/api/auth/change-email', { email }).then(r => r.data),

  verifyEmailChange: (code: string) =>
    client.post<{ email?: string }>('/api/auth/verify-email-change', { code }).then(r => r.data),

  getTrustDevices: () =>
    client.get<{ two_fa_enabled: boolean }>('/api/auth/trust-devices').then(r => r.data),

  setTrustDevices: (two_fa_enabled: boolean) =>
    client.put('/api/auth/trust-devices', { two_fa_enabled }).then(r => r.data),

  getDevices: () =>
    client.get<{ devices: TrustedDevice[] }>('/api/auth/devices').then(r => r.data),

  deactivateAccount: () =>
    client.post('/api/auth/deactivate').then(r => r.data),

  deleteAccount: (username: string, password: string) =>
    client.post('/api/auth/delete', { username, password }).then(r => r.data),

  removeDevice: (token: string) =>
    client.delete(`/api/auth/devices?token=${encodeURIComponent(token)}`).then(r => r.data),

  getMyApplication: () =>
    client.get('/api/auth/my-application').then(r => r.data),

  saveMyApplication: (data: Record<string, string>) =>
    client.put('/api/auth/my-application', data).then(r => r.data),

  getLinks: () =>
    client.get<{ links: { service: string; username: string; service_id: string; avatar_url: string }[] }>('/api/auth/links').then(r => r.data),

  addLink: (service: string, username: string) =>
    client.post('/api/auth/links', { service, username }).then(r => r.data),

  deleteLink: (service: string) =>
    client.delete(`/api/auth/links?service=${encodeURIComponent(service)}`).then(r => r.data),

  updateProfileSettings: (data: { timezone: string; show_local_time: boolean; social_links: string[] }) =>
    client.put('/api/auth/profile-settings', data).then(r => r.data),
}
