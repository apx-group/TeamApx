import client from './client'

export interface LogEntry {
  id: number
  title: string
  body: string
  log_date: string // "YYYY-MM-DD"
}

export const logApi = {
  getEntries: () =>
    client.get<{ entries: LogEntry[] }>('/api/log').then(r => r.data),
}

export const adminLogApi = {
  getEntries: () =>
    client.get<{ entries: LogEntry[] }>('/api/admin/log').then(r => r.data),

  createEntry: (data: Omit<LogEntry, 'id'>) =>
    client.post<{ id: number }>('/api/admin/log', data).then(r => r.data),

  updateEntry: (id: number, data: Omit<LogEntry, 'id'>) =>
    client.put('/api/admin/log', { ...data, id }).then(r => r.data),

  deleteEntry: (id: number) =>
    client.delete('/api/admin/log', { data: { id } }).then(r => r.data),
}
