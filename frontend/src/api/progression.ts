import client from './client'

export interface EquippedItem {
  inventory_id: number
  name: string
  rarity: string
  item_type: string
  asset_key: string
}

export interface ProgressionProfile {
  username: string
  level: number
  xp: number
  currency_balance: number
  rank: string
  equipped_items: EquippedItem[]
}

export interface InventoryItem {
  inventory_id: number
  name: string
  rarity: string
  item_type: string
  asset_key: string
  equipped: boolean
}

export interface MeProgression {
  user_id: string
  level: number
  currency_balance: number
  inventory: InventoryItem[]
}

export interface LeaderboardEntry {
  rank: number
  username: string
  nickname: string
  avatar_url: string
  level: number
  currency_balance: number
  equipped_frame: string
}

export const progressionApi = {
  getProfile: (username: string) =>
    client.get<ProgressionProfile>(`/api/progression/profile?u=${encodeURIComponent(username)}`).then(r => r.data),

  getMe: () =>
    client.get<MeProgression>('/api/progression/me').then(r => r.data),

  getLeaderboard: (limit = 50, offset = 0) =>
    client.get<LeaderboardEntry[]>(`/api/progression/leaderboard?limit=${limit}&offset=${offset}`).then(r => r.data),
}
