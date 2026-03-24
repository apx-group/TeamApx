package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"
)

type User struct {
	ID            int64    `json:"id"`
	Username      string   `json:"username"`
	Nickname      string   `json:"nickname"`
	Email         string   `json:"email"`
	Password      string   `json:"-"`
	IsAdmin       bool     `json:"is_admin"`
	CreatedAt     string   `json:"created_at"`
	AvatarURL     string   `json:"avatar_url"`
	BannerURL     string   `json:"banner_url"`
	Timezone      string   `json:"timezone"`
	ShowLocalTime bool     `json:"show_local_time"`
	SocialLinks   []string `json:"social_links"`
	Bio           string   `json:"bio"`
}

type TeamMember struct {
	ID           int64  `json:"id"`
	Name         string `json:"name"`
	Username     string `json:"username"`
	AvatarURL    string `json:"avatar_url"`
	Kills        int    `json:"kills"`
	Deaths       int    `json:"deaths"`
	Rounds       int    `json:"rounds"`
	KostPoints   int    `json:"kost_points"`
	AtkRole      string `json:"atk_role"`
	DefRole      string `json:"def_role"`
	IsMainRoster bool   `json:"is_main_roster"`
	PairedWith   *int64 `json:"paired_with"`
	// Rating detail fields
	KillEntry  int `json:"kill_entry"`
	KillTrade  int `json:"kill_trade"`
	KillImpact int `json:"kill_impact"`
	KillLate   int `json:"kill_late"`
	DeathEntry int `json:"death_entry"`
	DeathTrade int `json:"death_trade"`
	DeathLate  int `json:"death_late"`
	Clutch1v1  int `json:"clutch_1v1"`
	Clutch1v2  int `json:"clutch_1v2"`
	Clutch1v3  int `json:"clutch_1v3"`
	Clutch1v4  int `json:"clutch_1v4"`
	Clutch1v5  int `json:"clutch_1v5"`
	ObjPlant   int `json:"obj_plant"`
	ObjDefuse  int `json:"obj_defuse"`
}

type StaffMember struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Role      string `json:"role"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
}

type EmailVerification struct {
	Email     string
	Username  string
	Nickname  string
	Password  string
	Code      string
	ExpiresAt time.Time
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

const sessionDuration = 7 * 24 * time.Hour

func GetStaffMembers(db *sql.DB) ([]StaffMember, error) {
	rows, err := db.Query(`SELECT id, name, role, username FROM apx_staff ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var members []StaffMember
	for rows.Next() {
		var s StaffMember
		if err := rows.Scan(&s.ID, &s.Name, &s.Role, &s.Username); err != nil {
			return nil, err
		}
		members = append(members, s)
	}
	return members, nil
}

func AddStaffMember(db *sql.DB, name, role, username string) (int64, error) {
	var id int64
	err := db.QueryRow(
		"INSERT INTO apx_staff (name, role, username) VALUES ($1, $2, $3) RETURNING id",
		name, role, username,
	).Scan(&id)
	return id, err
}

func UpdateStaffMember(db *sql.DB, id int64, role, username string) error {
	_, err := db.Exec("UPDATE apx_staff SET role=$1, username=$2 WHERE id=$3", role, username, id)
	return err
}

func DeleteStaffMember(db *sql.DB, id int64) error {
	_, err := db.Exec("DELETE FROM apx_staff WHERE id = $1", id)
	return err
}

func DeleteTeamMember(db *sql.DB, id int64) error {
	_, err := db.Exec("DELETE FROM apx_team WHERE id = $1", id)
	return err
}

func CreateUser(db *sql.DB, username, nickname, email, hashedPw string) (int64, error) {
	var id int64
	err := db.QueryRow(
		"INSERT INTO apx_users (username, nickname, email, password) VALUES ($1, $2, $3, $4) RETURNING id",
		username, nickname, email, hashedPw,
	).Scan(&id)
	return id, err
}

func GetUserByEmail(db *sql.DB, email string) (*User, error) {
	u := &User{}
	err := db.QueryRow(
		"SELECT id, username, email, password, is_admin, created_at FROM apx_users WHERE email = $1 AND is_active = true", email,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Password, &u.IsAdmin, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func GetUserByUsername(db *sql.DB, username string) (*User, error) {
	u := &User{}
	err := db.QueryRow(
		"SELECT id, username, email, password, is_admin, created_at FROM apx_users WHERE username = $1 AND is_active = true", username,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Password, &u.IsAdmin, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func CreateSession(db *sql.DB, userID int64) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	token := hex.EncodeToString(b)
	expiresAt := time.Now().Add(sessionDuration)

	_, err := db.Exec(
		"INSERT INTO apx_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
		token, userID, expiresAt,
	)
	if err != nil {
		return "", fmt.Errorf("insert session: %w", err)
	}
	return token, nil
}

func GetSessionUser(db *sql.DB, token string) (*User, error) {
	u := &User{}
	var socialLinksJSON string
	err := db.QueryRow(`
		SELECT u.id, u.username, u.nickname, u.email, u.is_admin, u.created_at, u.avatar_url, u.banner_url, u.timezone, u.show_local_time, u.social_links, u.bio
		FROM apx_sessions s
		JOIN apx_users u ON u.id = s.user_id
		WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
	`, token).Scan(&u.ID, &u.Username, &u.Nickname, &u.Email, &u.IsAdmin, &u.CreatedAt, &u.AvatarURL, &u.BannerURL, &u.Timezone, &u.ShowLocalTime, &socialLinksJSON, &u.Bio)
	if err != nil {
		return nil, err
	}
	if socialLinksJSON != "" && socialLinksJSON != "[]" {
		_ = json.Unmarshal([]byte(socialLinksJSON), &u.SocialLinks)
	}
	if u.SocialLinks == nil {
		u.SocialLinks = []string{}
	}
	return u, nil
}

func UpdateProfileSettings(db *sql.DB, userID int64, timezone string, showLocalTime bool, socialLinks []string) error {
	linksJSON, err := json.Marshal(socialLinks)
	if err != nil {
		return err
	}
	_, err = db.Exec(
		"UPDATE apx_users SET timezone=$1, show_local_time=$2, social_links=$3 WHERE id=$4",
		timezone, showLocalTime, string(linksJSON), userID,
	)
	return err
}

func UpdateUserProfile(db *sql.DB, userID int64, username, nickname, email, avatarURL, bannerURL, bio string) error {
	_, err := db.Exec(
		"UPDATE apx_users SET username=$1, nickname=$2, email=$3, avatar_url=$4, banner_url=$5, bio=$6 WHERE id=$7",
		username, nickname, email, avatarURL, bannerURL, bio, userID,
	)
	return err
}

func DeactivateUser(db *sql.DB, userID int64) error {
	_, err := db.Exec("UPDATE apx_users SET is_active = false WHERE id = $1", userID)
	if err != nil {
		return err
	}
	_, err = db.Exec("DELETE FROM apx_sessions WHERE user_id = $1", userID)
	return err
}

func DeactivateUserByUsername(db *sql.DB, username string) error {
	var userID int64
	err := db.QueryRow("SELECT id FROM apx_users WHERE username = $1", username).Scan(&userID)
	if err == sql.ErrNoRows {
		return fmt.Errorf("user not found")
	}
	if err != nil {
		return err
	}
	return DeactivateUser(db, userID)
}

func DeleteUserByUsername(db *sql.DB, username string) error {
	res, err := db.Exec("DELETE FROM apx_users WHERE username = $1", username)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

func DeleteSession(db *sql.DB, token string) error {
	_, err := db.Exec("DELETE FROM apx_sessions WHERE token = $1", token)
	return err
}

func CleanExpiredSessions(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM apx_sessions WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

func CreateApplication(db *sql.DB, app ApplicationRecord) (int64, error) {
	var id int64
	err := db.QueryRow(`
		INSERT INTO apx_applications (user_id, name, age, discord, game, rank, attacker_role, defender_role, experience, motivation, availability)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
		app.UserID, app.Name, app.Age, app.Discord, app.Game, app.Rank, app.AttackerRole,
		app.DefenderRole, app.Experience, app.Motivation, app.Availability,
	).Scan(&id)
	return id, err
}

func GetApplications(db *sql.DB) ([]ApplicationRecord, error) {
	rows, err := db.Query(`
		SELECT id, user_id, name, age, discord, game, rank, attacker_role, defender_role,
		       experience, motivation, availability, status, created_at
		FROM apx_applications ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []ApplicationRecord
	for rows.Next() {
		var a ApplicationRecord
		if err := rows.Scan(&a.ID, &a.UserID, &a.Name, &a.Age, &a.Discord, &a.Game, &a.Rank,
			&a.AttackerRole, &a.DefenderRole, &a.Experience, &a.Motivation,
			&a.Availability, &a.Status, &a.CreatedAt); err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, nil
}

func GetApplicationByUserID(db *sql.DB, userID int64) (*ApplicationRecord, error) {
	a := &ApplicationRecord{}
	err := db.QueryRow(`
		SELECT id, user_id, name, age, discord, game, rank, attacker_role, defender_role,
		       experience, motivation, availability, status, created_at
		FROM apx_applications WHERE user_id = $1`, userID,
	).Scan(&a.ID, &a.UserID, &a.Name, &a.Age, &a.Discord, &a.Game, &a.Rank,
		&a.AttackerRole, &a.DefenderRole, &a.Experience, &a.Motivation,
		&a.Availability, &a.Status, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func UpdateApplicationByUserID(db *sql.DB, userID int64, app ApplicationRecord) error {
	_, err := db.Exec(`
		UPDATE apx_applications SET name=$1, age=$2, discord=$3, game=$4, rank=$5, attacker_role=$6,
		       defender_role=$7, experience=$8, motivation=$9, availability=$10
		WHERE user_id=$11`,
		app.Name, app.Age, app.Discord, app.Game, app.Rank, app.AttackerRole,
		app.DefenderRole, app.Experience, app.Motivation, app.Availability, userID,
	)
	return err
}

// ── Team CRUD ──

func GetTeamMembers(db *sql.DB) ([]TeamMember, error) {
	rows, err := db.Query(`SELECT id, name, username, kills, deaths, rounds, kost_points, atk_role, def_role,
		is_main_roster, paired_with,
		kill_entry, kill_trade, kill_impact, kill_late,
		death_entry, death_trade, death_late,
		clutch_1v1, clutch_1v2, clutch_1v3, clutch_1v4, clutch_1v5,
		obj_plant, obj_defuse
		FROM apx_team ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []TeamMember
	for rows.Next() {
		var m TeamMember
		if err := rows.Scan(&m.ID, &m.Name, &m.Username, &m.Kills, &m.Deaths, &m.Rounds, &m.KostPoints, &m.AtkRole, &m.DefRole,
			&m.IsMainRoster, &m.PairedWith,
			&m.KillEntry, &m.KillTrade, &m.KillImpact, &m.KillLate,
			&m.DeathEntry, &m.DeathTrade, &m.DeathLate,
			&m.Clutch1v1, &m.Clutch1v2, &m.Clutch1v3, &m.Clutch1v4, &m.Clutch1v5,
			&m.ObjPlant, &m.ObjDefuse); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

func GetUserAvatarByUsername(db *sql.DB, username string) string {
	if username == "" {
		return ""
	}
	var avatarURL string
	db.QueryRow("SELECT avatar_url FROM apx_users WHERE username = $1", username).Scan(&avatarURL)
	return avatarURL
}

func GetUserNicknameByUsername(db *sql.DB, username string) string {
	if username == "" {
		return ""
	}
	var nickname string
	db.QueryRow("SELECT COALESCE(NULLIF(nickname,''), username) FROM apx_users WHERE username = $1", username).Scan(&nickname)
	return nickname
}

func GetAllUsernames(db *sql.DB) ([]string, error) {
	rows, err := db.Query("SELECT username FROM apx_users ORDER BY username")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var names []string
	for rows.Next() {
		var u string
		if err := rows.Scan(&u); err != nil {
			return nil, err
		}
		names = append(names, u)
	}
	return names, nil
}

func UpdateTeamMember(db *sql.DB, m TeamMember) error {
	_, err := db.Exec(`UPDATE apx_team SET name=$1, kills=$2, deaths=$3, rounds=$4, kost_points=$5, atk_role=$6, def_role=$7,
		is_main_roster=$8, paired_with=$9, username=$10,
		kill_entry=$11, kill_trade=$12, kill_impact=$13, kill_late=$14,
		death_entry=$15, death_trade=$16, death_late=$17,
		clutch_1v1=$18, clutch_1v2=$19, clutch_1v3=$20, clutch_1v4=$21, clutch_1v5=$22,
		obj_plant=$23, obj_defuse=$24
		WHERE id=$25`,
		m.Name, m.Kills, m.Deaths, m.Rounds, m.KostPoints, m.AtkRole, m.DefRole,
		m.IsMainRoster, m.PairedWith, m.Username,
		m.KillEntry, m.KillTrade, m.KillImpact, m.KillLate,
		m.DeathEntry, m.DeathTrade, m.DeathLate,
		m.Clutch1v1, m.Clutch1v2, m.Clutch1v3, m.Clutch1v4, m.Clutch1v5,
		m.ObjPlant, m.ObjDefuse,
		m.ID,
	)
	return err
}

func AddTeamMember(db *sql.DB, name, username, atkRole, defRole string, isMainRoster bool) (int64, error) {
	var id int64
	err := db.QueryRow(
		"INSERT INTO apx_team (name, username, atk_role, def_role, is_main_roster) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		name, username, atkRole, defRole, isMainRoster,
	).Scan(&id)
	return id, err
}

func CountMainRoster(db *sql.DB, excludeID int64) (int, error) {
	var count int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM apx_team WHERE is_main_roster = true AND id != $1", excludeID,
	).Scan(&count)
	return count, err
}

func EnsureTeamPlayers(db *sql.DB) error {
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM apx_team").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	players := []struct {
		Name         string
		AtkRole      string
		DefRole      string
		IsMainRoster bool
	}{
		{"LIXH", "Entry-Frag", "Anti-Entry", true},
		{"AQUA", "Second-Entry", "Support", true},
		{"KLE", "Support", "Anti-Entry", true},
		{"DEVIN", "Intel", "Anti-Entry", true},
		{"SLASH", "Intel", "Support", true},
		{"PROXY", "Second-Entry", "Flex", false},
		{"JEREMY", "Support", "Flex", false},
	}

	for _, p := range players {
		_, err := db.Exec(
			"INSERT INTO apx_team (name, kills, deaths, atk_role, def_role, is_main_roster) VALUES ($1, 0, 0, $2, $3, $4)",
			p.Name, p.AtkRole, p.DefRole, p.IsMainRoster,
		)
		if err != nil {
			return fmt.Errorf("seed player %s: %w", p.Name, err)
		}
	}
	return nil
}

type EmailChangeRequest struct {
	UserID    int64
	NewEmail  string
	Code      string
	ExpiresAt time.Time
}

// ── Linked Accounts ──

type LinkedAccount struct {
	Service    string `json:"service"`
	ServiceID  string `json:"service_id"`
	Username   string `json:"username"`
	AvatarURL  string `json:"avatar_url"`
	ProfileURL string `json:"profile_url"`
}

// ── Discord Data ──

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

func UpsertCMData(db *sql.DB, userID int64, data string) error {
	_, err := db.Exec(`
		UPDATE apx_linked_accounts SET cm_data = $1
		WHERE user_id = $2 AND service = 'challengermode'`,
		data, userID,
	)
	return err
}

func GetCMData(db *sql.DB, userID int64) (string, error) {
	var data string
	err := db.QueryRow(
		"SELECT cm_data FROM apx_linked_accounts WHERE user_id = $1 AND service = 'challengermode'",
		userID,
	).Scan(&data)
	return data, err
}

func UpsertDiscordData(db *sql.DB, userID int64, data string) error {
	_, err := db.Exec(`
		UPDATE apx_linked_accounts SET discord_data = $1
		WHERE user_id = $2 AND service = 'discord'`,
		data, userID,
	)
	return err
}

func GetDiscordData(db *sql.DB, userID int64) (string, error) {
	var data string
	err := db.QueryRow(
		"SELECT discord_data FROM apx_linked_accounts WHERE user_id = $1 AND service = 'discord'",
		userID,
	).Scan(&data)
	return data, err
}

func UpsertLinkedAccount(db *sql.DB, userID int64, service, serviceID, username, avatarURL, profileURL string) error {
	_, err := db.Exec(`
		INSERT INTO apx_linked_accounts (user_id, service, service_id, username, avatar_url, profile_url)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT(user_id, service) DO UPDATE SET
			service_id=excluded.service_id,
			username=excluded.username,
			avatar_url=excluded.avatar_url,
			profile_url=excluded.profile_url`,
		userID, service, serviceID, username, avatarURL, profileURL,
	)
	return err
}

func GetLinkedAccounts(db *sql.DB, userID int64) ([]LinkedAccount, error) {
	rows, err := db.Query(
		"SELECT service, service_id, username, avatar_url, profile_url FROM apx_linked_accounts WHERE user_id = $1", userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []LinkedAccount
	for rows.Next() {
		var a LinkedAccount
		if err := rows.Scan(&a.Service, &a.ServiceID, &a.Username, &a.AvatarURL, &a.ProfileURL); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, nil
}

func DeleteLinkedAccount(db *sql.DB, userID int64, service string) error {
	_, err := db.Exec(
		"DELETE FROM apx_linked_accounts WHERE user_id = $1 AND service = $2", userID, service,
	)
	return err
}

func CreateOAuthState(db *sql.DB, state string, userID int64, codeVerifier string, expiresAt time.Time) error {
	_, err := db.Exec(`
		INSERT INTO apx_oauth_states (state, user_id, code_verifier, expires_at) VALUES ($1, $2, $3, $4)
		ON CONFLICT(state) DO UPDATE SET user_id=$2, code_verifier=$3, expires_at=$4`,
		state, userID, codeVerifier, expiresAt,
	)
	return err
}

type OAuthState struct {
	UserID       int64
	CodeVerifier string
}

func GetAndDeleteOAuthState(db *sql.DB, state string) (*OAuthState, error) {
	var s OAuthState
	err := db.QueryRow(
		"SELECT user_id, code_verifier FROM apx_oauth_states WHERE state = $1 AND expires_at > CURRENT_TIMESTAMP", state,
	).Scan(&s.UserID, &s.CodeVerifier)
	if err != nil {
		return nil, err
	}
	db.Exec("DELETE FROM apx_oauth_states WHERE state = $1", state)
	return &s, nil
}

func CleanExpiredOAuthStates(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM apx_oauth_states WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

func SearchUsers(db *sql.DB, query string) ([]User, error) {
	like := "%" + query + "%"
	rows, err := db.Query(
		`SELECT username, nickname, avatar_url FROM apx_users
		 WHERE username ILIKE $1 OR (nickname != '' AND nickname ILIKE $2)
		 ORDER BY username LIMIT 20`,
		like, like,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.Username, &u.Nickname, &u.AvatarURL); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func CreateEmailVerification(db *sql.DB, email, username, nickname, hashedPw, code string, expiresAt time.Time) error {
	_, err := db.Exec(`
		INSERT INTO apx_email_verifications (email, username, nickname, password, code, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT(email) DO UPDATE SET username=$2, nickname=$3, password=$4, code=$5, expires_at=$6`,
		email, username, nickname, hashedPw, code, expiresAt,
	)
	return err
}

func GetEmailVerification(db *sql.DB, email string) (*EmailVerification, error) {
	v := &EmailVerification{}
	err := db.QueryRow(`
		SELECT email, username, nickname, password, code, expires_at
		FROM apx_email_verifications WHERE email = $1 AND expires_at > CURRENT_TIMESTAMP`,
		email,
	).Scan(&v.Email, &v.Username, &v.Nickname, &v.Password, &v.Code, &v.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return v, nil
}

func DeleteEmailVerification(db *sql.DB, email string) {
	db.Exec("DELETE FROM apx_email_verifications WHERE email = $1", email)
}

func CleanExpiredVerifications(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM apx_email_verifications WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

func CreateEmailChangeRequest(db *sql.DB, userID int64, newEmail, code string, expiresAt time.Time) error {
	_, err := db.Exec(`
		INSERT INTO apx_email_change_requests (user_id, new_email, code, expires_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT(user_id) DO UPDATE SET new_email=$2, code=$3, expires_at=$4`,
		userID, newEmail, code, expiresAt,
	)
	return err
}

func GetEmailChangeRequest(db *sql.DB, userID int64) (*EmailChangeRequest, error) {
	r := &EmailChangeRequest{}
	err := db.QueryRow(`
		SELECT user_id, new_email, code, expires_at
		FROM apx_email_change_requests WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP`,
		userID,
	).Scan(&r.UserID, &r.NewEmail, &r.Code, &r.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func DeleteEmailChangeRequest(db *sql.DB, userID int64) {
	db.Exec("DELETE FROM apx_email_change_requests WHERE user_id = $1", userID)
}

func CleanExpiredEmailChangeRequests(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM apx_email_change_requests WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

// ── 2FA ──

func GetUserTwoFASettings(db *sql.DB, userID int64) (twoFAEnabled, trustDevices bool) {
	twoFAEnabled = true
	trustDevices = true
	db.QueryRow("SELECT two_fa_enabled, trust_devices FROM apx_users WHERE id = $1", userID).Scan(&twoFAEnabled, &trustDevices)
	return
}

func SetUserTrustDevices(db *sql.DB, userID int64, enabled bool) error {
	_, err := db.Exec("UPDATE apx_users SET trust_devices = $1 WHERE id = $2", enabled, userID)
	return err
}

func SetUser2FAEnabled(db *sql.DB, userID int64, enabled bool) error {
	_, err := db.Exec("UPDATE apx_users SET two_fa_enabled = $1 WHERE id = $2", enabled, userID)
	return err
}

func ToggleUser2FA(db *sql.DB, username string) (bool, error) {
	var current bool
	err := db.QueryRow("SELECT two_fa_enabled FROM apx_users WHERE username = $1", username).Scan(&current)
	if err != nil {
		return false, err
	}
	newVal := !current
	_, err = db.Exec("UPDATE apx_users SET two_fa_enabled = $1 WHERE username = $2", newVal, username)
	return newVal, err
}

func CreateLogin2FAPending(db *sql.DB, userID int64, code string) (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)
	_, err := db.Exec(
		"INSERT INTO apx_login_2fa_pending (token, user_id, code, expires_at) VALUES ($1, $2, $3, $4)",
		token, userID, code, time.Now().Add(10*time.Minute),
	)
	return token, err
}

func GetLogin2FAPending(db *sql.DB, token string) (int64, string, error) {
	var userID int64
	var code string
	err := db.QueryRow(
		"SELECT user_id, code FROM apx_login_2fa_pending WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP",
		token,
	).Scan(&userID, &code)
	return userID, code, err
}

func DeleteLogin2FAPending(db *sql.DB, token string) {
	db.Exec("DELETE FROM apx_login_2fa_pending WHERE token = $1", token)
}

type TrustedDevice struct {
	Token      string `json:"token"`
	DeviceName string `json:"device_name"`
	Location   string `json:"location"`
	CreatedAt  string `json:"created_at"`
}

func CreateTrustedDevice(db *sql.DB, userID int64, deviceName, ip, location string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)
	_, err := db.Exec(
		"INSERT INTO apx_trusted_devices (token, user_id, device_name, ip, location, expires_at) VALUES ($1, $2, $3, $4, $5, $6)",
		token, userID, deviceName, ip, location, time.Now().Add(30*24*time.Hour),
	)
	return token, err
}

func GetTrustedDeviceUserID(db *sql.DB, token string) (int64, error) {
	var userID int64
	err := db.QueryRow(
		"SELECT user_id FROM apx_trusted_devices WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP",
		token,
	).Scan(&userID)
	return userID, err
}

func GetTrustedDevices(db *sql.DB, userID int64) ([]TrustedDevice, error) {
	rows, err := db.Query(
		"SELECT token, device_name, location, created_at FROM apx_trusted_devices WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC",
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var devices []TrustedDevice
	for rows.Next() {
		var d TrustedDevice
		if err := rows.Scan(&d.Token, &d.DeviceName, &d.Location, &d.CreatedAt); err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}
	return devices, rows.Err()
}

func DeleteTrustedDevice(db *sql.DB, token string, userID int64) error {
	res, err := db.Exec("DELETE FROM apx_trusted_devices WHERE token = $1 AND user_id = $2", token, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("device not found")
	}
	return nil
}

func DeleteTrustedDevicesByUser(db *sql.DB, userID int64) {
	db.Exec("DELETE FROM apx_trusted_devices WHERE user_id = $1", userID)
}

func CleanExpiredTrustedDevices(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM apx_trusted_devices WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

func CleanExpiredLogin2FAPending(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM apx_login_2fa_pending WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

func UpdateUserEmail(db *sql.DB, userID int64, newEmail string) error {
	_, err := db.Exec("UPDATE apx_users SET email = $1 WHERE id = $2", newEmail, userID)
	return err
}

func CheckUserConflict(db *sql.DB, username, email string) (bool, error) {
	var count int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM apx_users WHERE username = $1 OR email = $2", username, email,
	).Scan(&count)
	return count > 0, err
}

func EnsureAdminUser(db *sql.DB, hashedPw string) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM apx_users WHERE username = 'admin')").Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		_, err = db.Exec("UPDATE apx_users SET password = $1, is_admin = true WHERE username = 'admin'", hashedPw)
		return err
	}
	_, err = db.Exec(
		"INSERT INTO apx_users (username, email, password, is_admin) VALUES ('admin', 'admin@teamapx.local', $1, true)",
		hashedPw,
	)
	return err
}
