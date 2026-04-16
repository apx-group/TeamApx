import client from './client'

export interface TwitchStream {
  user_login: string
  user_name: string
  title: string
  viewer_count: number
  thumbnail_url: string
}

export const getLiveStreams = (): Promise<TwitchStream[]> =>
  client.get<TwitchStream[]>('/api/twitch/live').then(r => r.data ?? [])
