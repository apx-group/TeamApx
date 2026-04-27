package main

import (
	"encoding/json"
	"time"
)

type User struct {
	ID            int64    `json:"id"`
	Username      string   `json:"username"`
	Nickname      string   `json:"nickname"`
	Email         string   `json:"email"`
	Password      string   `json:"password"`
	IsAdmin       bool     `json:"is_admin"`
	IsActive      bool     `json:"is_active"`
	TwoFAEnabled  bool     `json:"two_fa_enabled"`
	TrustDevices  bool     `json:"trust_devices"`
	EventAccess   bool     `json:"event_access"`
	CreatedAt     string   `json:"created_at"`
	AvatarURL     string   `json:"avatar_url"`
	BannerURL     string   `json:"banner_url"`
	Timezone      string   `json:"timezone"`
	ShowLocalTime bool     `json:"show_local_time"`
	SocialLinks   SocialLinksField `json:"social_links"`
	Bio           string   `json:"bio"`
}

type SocialLinksField []string

func (s *SocialLinksField) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		*s = []string{}
		return nil
	}
	if data[0] == '"' {
		var str string
		if err := json.Unmarshal(data, &str); err != nil {
			return err
		}
		if str == "" {
			*s = []string{}
		} else {
			if err := json.Unmarshal([]byte(str), s); err != nil {
				*s = []string{}
			}
		}
		return nil
	}
	var arr []string
	return json.Unmarshal(data, &arr)
}

type TeamMember struct {
	ID           int64  `json:"id"`
	Name         string `json:"name"`
	Username     string `json:"username"`
	AvatarURL    string `json:"avatar_url"`
	AtkRole      string `json:"atk_role"`
	DefRole      string `json:"def_role"`
	IsMainRoster bool   `json:"is_main_roster"`
	PairedWith   *int64 `json:"paired_with"`
	EventAccess  bool   `json:"event_access"`
	KillEntry    int    `json:"kill_entry"`
	KillTrade    int    `json:"kill_trade"`
	KillImpact   int    `json:"kill_impact"`
	KillLate     int    `json:"kill_late"`
	DeathEntry   int    `json:"death_entry"`
	DeathTrade   int    `json:"death_trade"`
	DeathLate    int    `json:"death_late"`
	Clutch1v1    int    `json:"clutch_1v1"`
	Clutch1v2    int    `json:"clutch_1v2"`
	Clutch1v3    int    `json:"clutch_1v3"`
	Clutch1v4    int    `json:"clutch_1v4"`
	Clutch1v5    int    `json:"clutch_1v5"`
	ObjPlant     int    `json:"obj_plant"`
	ObjDefuse    int    `json:"obj_defuse"`
}

type StaffMember struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Role      string `json:"role"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
}

type EmailVerification struct {
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	Nickname  string    `json:"nickname"`
	Password  string    `json:"password"`
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
}

type ApplicationRecord struct {
	ID           int64  `json:"id"`
	UserID       int64  `json:"user_id"`
	Name         string `json:"name"`
	Age          int    `json:"age"`
	Discord      string `json:"discord"`
	Game         string `json:"game"`
	Rank         string `json:"rank"`
	AttackerRole string `json:"attacker_role"`
	DefenderRole string `json:"defender_role"`
	Experience   string `json:"experience"`
	Motivation   string `json:"motivation"`
	Availability string `json:"availability"`
	Status       string `json:"status"`
	CreatedAt    string `json:"created_at"`
}

type EmailChangeRequest struct {
	UserID    int64     `json:"user_id"`
	NewEmail  string    `json:"new_email"`
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
}

type LinkedAccount struct {
	Service    string `json:"service"`
	ServiceID  string `json:"service_id"`
	Username   string `json:"username"`
	AvatarURL  string `json:"avatar_url"`
	ProfileURL string `json:"profile_url"`
}

type DiscordRole struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type DiscordData struct {
	DiscordUsername   string        `json:"discord_username"`
	ApxCommunityGuild bool          `json:"apx_community_guild"`
	Roles             []DiscordRole `json:"roles"`
	Rank              string        `json:"rank"`
}

type OAuthState struct {
	UserID       int64
	CodeVerifier string
}

type TrustedDevice struct {
	Token      string `json:"token"`
	DeviceName string `json:"device_name"`
	Location   string `json:"location"`
	CreatedAt  string `json:"created_at"`
}

type BotUser struct {
	UserID          string  `json:"user_id"`
	GuildID         string  `json:"guild_id"`
	ApxID           *string `json:"apx_id"`
	XP              int     `json:"xp"`
	Level           int     `json:"level"`
	Gold            int     `json:"gold"`
	TotalEarned     int     `json:"total_earned"`
	RankRoleID      *string `json:"rank_role_id"`
	DiscordUsername string  `json:"discord_username"`
}

type ProgressionUser struct {
	UserID          int64  `json:"user_id"`
	DiscordID       string `json:"discord_id"`
	Level           int    `json:"level"`
	XP              int    `json:"xp"`
	CurrencyBalance int    `json:"currency_balance"`
	DiscordRank     string `json:"discord_rank"`
}

type CreateEventInput struct {
	Name            string `json:"name"`
	Status          string `json:"status"`
	Date            string `json:"date"`
	DurationDE      string `json:"duration_de"`
	DurationEN      string `json:"duration_en"`
	DescriptionDE   string `json:"description_de"`
	DescriptionEN   string `json:"description_en"`
	MaxParticipants int    `json:"max_participants"`
}
