export interface User {
  id: number
  username: string
  nickname: string
  email: string
  avatar_url: string
  banner_url: string
  is_admin: boolean
  is_active: boolean
  event_access: boolean
  created_at: string
  timezone: string
  show_local_time: boolean
  social_links: string[]
}

export interface TeamMember {
  id: number
  name: string
  username: string
  atk_role: string
  def_role: string
  is_main_roster: boolean
  paired_with: number
  avatar_url: string
  order: number
  event_access: boolean
}

export interface StaffMember {
  id: number
  name: string
  role: string
  username: string
  avatar_url: string
  order: number
}

export interface Badge {
  id: number
  name: string
  description: string
  info: string
  image_url: string
  category: string
  available: boolean
  max_level: number
  level: number
  owned: boolean
}

export interface AdminBadge {
  id: number
  name: string
  description: string
  info: string
  image_url: string
  category: string
  available: boolean
  max_level: number
}

export interface LinkedAccount {
  service: string
  username: string
  service_id: string
  avatar_url: string
}

export interface Application {
  id: number
  user_id: number
  username: string
  name: string
  age: string
  discord: string
  game: string
  rank: string
  attacker_role: string
  defender_role: string
  experience: string
  motivation: string
  availability: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export interface Event {
  id: string
  name: string
  date: string
  status: 'live' | 'upcoming' | 'past'
  duration_de: string
  duration_en: string
  description_de: string
  description_en: string
  max_participants: number
  participant_count: number
  is_joined: boolean
  created_at: string
}

export interface EventParticipant {
  user_id: number
  username: string
  nickname: string
  avatar_url: string
  joined_at: string
}

export interface UserSearchResult {
  username: string
  nickname: string
  avatar_url: string
}

export interface TrustedDevice {
  id: number
  device_name: string
  last_used: string
}

export interface Item {
  item_id: string
  seq_id: number
  name: string
  rarity: string | null
  image_url: string | null
  is_weapon: boolean
  is_armor: boolean
  is_item: boolean
  is_animal: boolean
  perks: string[]
  created_at: string
}

export interface UserItem extends Item {
  quantity: number
  acquired_at: string
}
