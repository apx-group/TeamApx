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
  rank: string
  inventory: InventoryItem[]
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string         // website username — may be empty
  nickname: string         // website nickname — may be empty
  avatar_url: string       // website avatar  — may be empty
  discord_username: string // bot-stored display name
  level: number
  xp: number
  gold: number
  prog_rank: string
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  my_position: LeaderboardEntry | null
}

export const progressionApi = {
  getProfile: (username: string) =>
    client.get<ProgressionProfile>(`/api/progression/profile?u=${encodeURIComponent(username)}`).then(r => r.data),

  getMe: () =>
    client.get<MeProgression>('/api/progression/me').then(r => r.data),

  getLeaderboard: (limit = 10) =>
    client.get<LeaderboardResponse>(`/api/progression/leaderboard?limit=${limit}`).then(r => r.data),
}
