import client from './client'
import type { TeamMember, StaffMember } from '@/types'

export const teamApi = {
  getTeam: () =>
    client.get<{ members: TeamMember[] }>('/api/team').then(r => r.data),

  getStaff: () =>
    client.get<{ staff: StaffMember[] }>('/api/staff').then(r => r.data),
}

export const adminTeamApi = {
  getTeam: () =>
    client.get<{ members: TeamMember[] }>('/api/admin/team').then(r => r.data),

  addMember: (data: Partial<TeamMember>) =>
    client.post<TeamMember>('/api/admin/team', data).then(r => r.data),

  updateMember: (id: number, data: Partial<TeamMember>) =>
    client.put('/api/admin/team', data).then(r => r.data),

  deleteMember: (id: number) =>
    client.delete('/api/admin/team', { data: { id } }).then(r => r.data),

  getStaff: () =>
    client.get<{ staff: StaffMember[] }>('/api/admin/staff').then(r => r.data),

  addStaff: (data: Partial<StaffMember>) =>
    client.post<StaffMember>('/api/admin/staff', data).then(r => r.data),

  updateStaff: (id: number, data: Partial<StaffMember>) =>
    client.put('/api/admin/staff', data).then(r => r.data),

  deleteStaff: (id: number) =>
    client.delete('/api/admin/staff', { data: { id } }).then(r => r.data),
}
