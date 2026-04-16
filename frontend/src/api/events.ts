import client from './client'
import type { Event, EventParticipant } from '@/types'

export const eventsApi = {
  getEvents: () =>
    client.get<{ events: Event[] }>('/api/events').then(r => r.data),

  getEvent: (id: string) =>
    client.get<{ event: Event; participants: EventParticipant[] }>(`/api/events/${id}`).then(r => r.data),

  join: (id: string) =>
    client.post<{ success: boolean }>(`/api/events/${id}/join`).then(r => r.data),

  leave: (id: string) =>
    client.post<{ success: boolean }>(`/api/events/${id}/leave`).then(r => r.data),
}

export const adminEventsApi = {
  getEvents: () =>
    client.get<{ events: Event[] }>('/api/admin/events').then(r => r.data),

  createEvent: (data: Partial<Event>) =>
    client.post<{ id: string }>('/api/admin/events', data).then(r => r.data),

  updateEvent: (data: Partial<Event>) =>
    client.put<{ success: boolean }>('/api/admin/events', data).then(r => r.data),

  deleteEvent: (id: string) =>
    client.delete<{ success: boolean }>('/api/admin/events', { data: { id } }).then(r => r.data),

  setEventAccess: (username: string, eventAccess: boolean) =>
    client
      .post<{ success: boolean }>(`/api/admin/users/${username}/event-access`, { event_access: eventAccess })
      .then(r => r.data),
}
