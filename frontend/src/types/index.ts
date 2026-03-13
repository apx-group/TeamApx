export interface User {
  id: number
  username: string
  nickname: string
  email: string
  avatar_url: string
  banner_url: string
  is_admin: boolean
  is_active: boolean
  created_at: string
  timezone: string
  show_local_time: boolean
  social_links: string[]
}

export interface TeamMember {
  id: number
  name: string
  atk_role: string
  def_role: string
  kills: number
  deaths: number
  rounds: number
  kost_points: number
  is_main_roster: boolean
  paired_with: number
  avatar_url: string
  order: number
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
  name: string
  date: string
  status: 'live' | 'upcoming' | 'past'
  duration: { de: string; en: string }
  description: { de: string; en: string }
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
