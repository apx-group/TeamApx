package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

type User struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	Password  string `json:"-"`
	IsAdmin   bool   `json:"is_admin"`
	CreatedAt string `json:"created_at"`
	AvatarURL string `json:"avatar_url"`
	BannerURL string `json:"banner_url"`
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
	PairedWith   *int64 `json:"paired_with"` // ID des Spielers, den dieser Spieler supportet (nullable)
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

// InitUserDB öffnet die User-Datenbank (users, sessions, applications).
func InitUserDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open user db: %w", err)
	}
	db.SetMaxOpenConns(1)

	MigrateUserProfileColumns(db)
	MigrateUserNicknameColumn(db)
	MigrateUsersActiveColumn(db)
	MigrateEmailVerificationsTable(db)
	MigrateEmailChangeRequestsTable(db)
	MigrateLinkedAccountsTable(db)
	MigrateOAuthStatesTable(db)
	MigrateTwoFAColumns(db)
	MigrateTrustedDevicesTable(db)
	MigrateLogin2FAPendingTable(db)

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			username   TEXT    NOT NULL UNIQUE,
			nickname   TEXT    NOT NULL DEFAULT '',
			email      TEXT    NOT NULL UNIQUE,
			password   TEXT    NOT NULL,
			is_admin   BOOLEAN NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			avatar_url TEXT    NOT NULL DEFAULT '',
			banner_url TEXT    NOT NULL DEFAULT ''
		);
		CREATE TABLE IF NOT EXISTS sessions (
			token      TEXT PRIMARY KEY,
			user_id    INTEGER NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
		CREATE TABLE IF NOT EXISTS applications (
			id            INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id       INTEGER NOT NULL,
			name          TEXT    NOT NULL,
			age           INTEGER NOT NULL,
			discord       TEXT    NOT NULL,
			game          TEXT    NOT NULL,
			rank          TEXT    DEFAULT '',
			attacker_role TEXT    DEFAULT '',
			defender_role TEXT    DEFAULT '',
			experience    TEXT    NOT NULL,
			motivation    TEXT    NOT NULL,
			availability  TEXT    DEFAULT '',
			status        TEXT    NOT NULL DEFAULT 'pending',
			created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
	`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("create user tables: %w", err)
	}
	return db, nil
}

// InitDataDB öffnet die Daten-Datenbank (team/Spielerstatistiken).
func InitDataDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open data db: %w", err)
	}
	db.SetMaxOpenConns(1)

	// Migrate old team table (single "role" → atk_role + def_role)
	MigrateTeamTable(db)
	// Add rounds + kost_points columns if missing
	MigrateTeamNewColumns(db)
	// Add rating detail columns if missing
	MigrateTeamRatingColumns(db)
	// Add is_main_roster column; seed defaults for known players if newly added
	if MigrateTeamMainRosterColumn(db) {
		MigrateMainRosterPlayers(db)
	}
	// Add paired_with column (nullable FK to team.id)
	MigrateTeamPairedWithColumn(db)
	// Add username column to team and staff tables
	MigrateTeamUsernameColumn(db)
	MigrateStaffUsernameColumn(db)

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS team (
			id            INTEGER PRIMARY KEY AUTOINCREMENT,
			name          TEXT    NOT NULL,
			username      TEXT    NOT NULL DEFAULT '',
			kills         INTEGER NOT NULL DEFAULT 0,
			deaths        INTEGER NOT NULL DEFAULT 0,
			rounds        INTEGER NOT NULL DEFAULT 0,
			kost_points   INTEGER NOT NULL DEFAULT 0,
			atk_role      TEXT    NOT NULL DEFAULT '',
			def_role      TEXT    NOT NULL DEFAULT '',
			kill_entry    INTEGER NOT NULL DEFAULT 0,
			kill_trade    INTEGER NOT NULL DEFAULT 0,
			kill_impact   INTEGER NOT NULL DEFAULT 0,
			kill_late     INTEGER NOT NULL DEFAULT 0,
			death_entry   INTEGER NOT NULL DEFAULT 0,
			death_trade   INTEGER NOT NULL DEFAULT 0,
			death_late    INTEGER NOT NULL DEFAULT 0,
			clutch_1v1    INTEGER NOT NULL DEFAULT 0,
			clutch_1v2    INTEGER NOT NULL DEFAULT 0,
			clutch_1v3    INTEGER NOT NULL DEFAULT 0,
			clutch_1v4    INTEGER NOT NULL DEFAULT 0,
			clutch_1v5    INTEGER NOT NULL DEFAULT 0,
			obj_plant     INTEGER NOT NULL DEFAULT 0,
			obj_defuse    INTEGER NOT NULL DEFAULT 0
		);
		CREATE TABLE IF NOT EXISTS staff (
			id       INTEGER PRIMARY KEY AUTOINCREMENT,
			name     TEXT    NOT NULL,
			role     TEXT    NOT NULL DEFAULT '',
			username TEXT    NOT NULL DEFAULT ''
		);
	`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("create data tables: %w", err)
	}
	return db, nil
}

func GetStaffMembers(db *sql.DB) ([]StaffMember, error) {
	rows, err := db.Query(`SELECT id, name, role, username FROM staff ORDER BY id`)
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
	res, err := db.Exec("INSERT INTO staff (name, role, username) VALUES (?, ?, ?)", name, role, username)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func UpdateStaffMember(db *sql.DB, id int64, role, username string) error {
	_, err := db.Exec("UPDATE staff SET role=?, username=? WHERE id=?", role, username, id)
	return err
}

func DeleteStaffMember(db *sql.DB, id int64) error {
	_, err := db.Exec("DELETE FROM staff WHERE id = ?", id)
	return err
}

func DeleteTeamMember(db *sql.DB, id int64) error {
	_, err := db.Exec("DELETE FROM team WHERE id = ?", id)
	return err
}

func CreateUser(db *sql.DB, username, nickname, email, hashedPw string) (int64, error) {
	res, err := db.Exec(
		"INSERT INTO users (username, nickname, email, password) VALUES (?, ?, ?, ?)",
		username, nickname, email, hashedPw,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetUserByEmail(db *sql.DB, email string) (*User, error) {
	u := &User{}
	err := db.QueryRow(
		"SELECT id, username, email, password, is_admin, created_at FROM users WHERE email = ? AND is_active = 1", email,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Password, &u.IsAdmin, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func GetUserByUsername(db *sql.DB, username string) (*User, error) {
	u := &User{}
	err := db.QueryRow(
		"SELECT id, username, email, password, is_admin, created_at FROM users WHERE username = ? AND is_active = 1", username,
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
		"INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
		token, userID, expiresAt,
	)
	if err != nil {
		return "", fmt.Errorf("insert session: %w", err)
	}
	return token, nil
}

func GetSessionUser(db *sql.DB, token string) (*User, error) {
	u := &User{}
	err := db.QueryRow(`
		SELECT u.id, u.username, u.nickname, u.email, u.is_admin, u.created_at, u.avatar_url, u.banner_url
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1
	`, token).Scan(&u.ID, &u.Username, &u.Nickname, &u.Email, &u.IsAdmin, &u.CreatedAt, &u.AvatarURL, &u.BannerURL)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func UpdateUserProfile(db *sql.DB, userID int64, username, nickname, email, avatarURL, bannerURL string) error {
	_, err := db.Exec(
		"UPDATE users SET username=?, nickname=?, email=?, avatar_url=?, banner_url=? WHERE id=?",
		username, nickname, email, avatarURL, bannerURL, userID,
	)
	return err
}

func MigrateUserProfileColumns(db *sql.DB) {
	db.Exec("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''")
	db.Exec("ALTER TABLE users ADD COLUMN banner_url TEXT NOT NULL DEFAULT ''")
}

func MigrateUserNicknameColumn(db *sql.DB) {
	db.Exec("ALTER TABLE users ADD COLUMN nickname TEXT NOT NULL DEFAULT ''")
}

func MigrateUsersActiveColumn(db *sql.DB) {
	db.Exec("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1")
}

func DeactivateUser(db *sql.DB, userID int64) error {
	_, err := db.Exec("UPDATE users SET is_active = 0 WHERE id = ?", userID)
	if err != nil {
		return err
	}
	_, err = db.Exec("DELETE FROM sessions WHERE user_id = ?", userID)
	return err
}

func DeactivateUserByUsername(db *sql.DB, username string) error {
	var userID int64
	err := db.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&userID)
	if err == sql.ErrNoRows {
		return fmt.Errorf("user not found")
	}
	if err != nil {
		return err
	}
	return DeactivateUser(db, userID)
}

func DeleteUserByUsername(db *sql.DB, username string) error {
	res, err := db.Exec("DELETE FROM users WHERE username = ?", username)
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
	_, err := db.Exec("DELETE FROM sessions WHERE token = ?", token)
	return err
}

func CleanExpiredSessions(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

func CreateApplication(db *sql.DB, app ApplicationRecord) (int64, error) {
	res, err := db.Exec(`
		INSERT INTO applications (user_id, name, age, discord, game, rank, attacker_role, defender_role, experience, motivation, availability)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		app.UserID, app.Name, app.Age, app.Discord, app.Game, app.Rank, app.AttackerRole,
		app.DefenderRole, app.Experience, app.Motivation, app.Availability,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetApplications(db *sql.DB) ([]ApplicationRecord, error) {
	rows, err := db.Query(`
		SELECT id, user_id, name, age, discord, game, rank, attacker_role, defender_role,
		       experience, motivation, availability, status, created_at
		FROM applications ORDER BY created_at DESC`)
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
		FROM applications WHERE user_id = ?`, userID,
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
		UPDATE applications SET name=?, age=?, discord=?, game=?, rank=?, attacker_role=?,
		       defender_role=?, experience=?, motivation=?, availability=?
		WHERE user_id=?`,
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
		FROM team ORDER BY id`)
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
	db.QueryRow("SELECT avatar_url FROM users WHERE username = ?", username).Scan(&avatarURL)
	return avatarURL
}

func GetUserNicknameByUsername(db *sql.DB, username string) string {
	if username == "" {
		return ""
	}
	var nickname string
	db.QueryRow("SELECT COALESCE(NULLIF(nickname,''), username) FROM users WHERE username = ?", username).Scan(&nickname)
	return nickname
}

func GetAllUsernames(db *sql.DB) ([]string, error) {
	rows, err := db.Query("SELECT username FROM users ORDER BY username")
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
	_, err := db.Exec(`UPDATE team SET name=?, kills=?, deaths=?, rounds=?, kost_points=?, atk_role=?, def_role=?,
		is_main_roster=?, paired_with=?, username=?,
		kill_entry=?, kill_trade=?, kill_impact=?, kill_late=?,
		death_entry=?, death_trade=?, death_late=?,
		clutch_1v1=?, clutch_1v2=?, clutch_1v3=?, clutch_1v4=?, clutch_1v5=?,
		obj_plant=?, obj_defuse=?
		WHERE id=?`,
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
	res, err := db.Exec(
		"INSERT INTO team (name, username, atk_role, def_role, is_main_roster) VALUES (?, ?, ?, ?, ?)",
		name, username, atkRole, defRole, isMainRoster,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func CountMainRoster(db *sql.DB, excludeID int64) (int, error) {
	var count int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM team WHERE is_main_roster = 1 AND id != ?", excludeID,
	).Scan(&count)
	return count, err
}

func MigrateTeamTable(db *sql.DB) error {
	// If old single-column "role" schema exists, drop and recreate
	var hasOldRole int
	err := db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('team') WHERE name='role'").Scan(&hasOldRole)
	if err != nil || hasOldRole == 0 {
		return nil
	}
	_, err = db.Exec("DROP TABLE team")
	return err
}

func MigrateTeamNewColumns(db *sql.DB) {
	// Silently add columns; errors are expected if they already exist
	db.Exec("ALTER TABLE team ADD COLUMN rounds INTEGER NOT NULL DEFAULT 0")
	db.Exec("ALTER TABLE team ADD COLUMN kost_points INTEGER NOT NULL DEFAULT 0")
}

func MigrateTeamRatingColumns(db *sql.DB) {
	cols := []string{
		"kill_entry", "kill_trade", "kill_impact", "kill_late",
		"death_entry", "death_trade", "death_late",
		"clutch_1v1", "clutch_1v2", "clutch_1v3", "clutch_1v4", "clutch_1v5",
		"obj_plant", "obj_defuse",
	}
	for _, c := range cols {
		db.Exec("ALTER TABLE team ADD COLUMN " + c + " INTEGER NOT NULL DEFAULT 0")
	}
}

// MigrateTeamMainRosterColumn adds the is_main_roster column.
// Returns true if the column was just added (first time).
func MigrateTeamMainRosterColumn(db *sql.DB) bool {
	_, err := db.Exec("ALTER TABLE team ADD COLUMN is_main_roster BOOLEAN NOT NULL DEFAULT 0")
	return err == nil
}

func MigrateTeamPairedWithColumn(db *sql.DB) {
	db.Exec("ALTER TABLE team ADD COLUMN paired_with INTEGER DEFAULT NULL REFERENCES team(id)")
}

func MigrateTeamUsernameColumn(db *sql.DB) {
	db.Exec("ALTER TABLE team ADD COLUMN username TEXT NOT NULL DEFAULT ''")
}

func MigrateStaffUsernameColumn(db *sql.DB) {
	db.Exec("ALTER TABLE staff ADD COLUMN username TEXT NOT NULL DEFAULT ''")
}

// MigrateMainRosterPlayers sets is_main_roster=1 for the known main roster.
// Only called when the column was just added, so existing admin-set values are never overwritten.
func MigrateMainRosterPlayers(db *sql.DB) {
	for _, name := range []string{"LIXH", "AQUA", "KLE", "DEVIN", "SLASH"} {
		db.Exec("UPDATE team SET is_main_roster = 1 WHERE name = ?", name)
	}
}

func EnsureTeamPlayers(db *sql.DB) error {
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM team").Scan(&count); err != nil {
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
			"INSERT INTO team (name, kills, deaths, atk_role, def_role, is_main_roster) VALUES (?, 0, 0, ?, ?, ?)",
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
	Service   string `json:"service"`
	ServiceID string `json:"service_id"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
}

func MigrateLinkedAccountsTable(db *sql.DB) {
	db.Exec(`CREATE TABLE IF NOT EXISTS linked_accounts (
		user_id    INTEGER NOT NULL,
		service    TEXT    NOT NULL,
		service_id TEXT    NOT NULL DEFAULT '',
		username   TEXT    NOT NULL DEFAULT '',
		avatar_url TEXT    NOT NULL DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (user_id, service),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	)`)
	// Migration für bestehende Tabellen ohne avatar_url
	db.Exec("ALTER TABLE linked_accounts ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''")
}

func MigrateOAuthStatesTable(db *sql.DB) {
	db.Exec(`CREATE TABLE IF NOT EXISTS oauth_states (
		state          TEXT PRIMARY KEY,
		user_id        INTEGER NOT NULL,
		code_verifier  TEXT    NOT NULL DEFAULT '',
		expires_at     DATETIME NOT NULL,
		created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
	)`)
	// Migration für bestehende Tabellen ohne code_verifier
	db.Exec("ALTER TABLE oauth_states ADD COLUMN code_verifier TEXT NOT NULL DEFAULT ''")
}

func UpsertLinkedAccount(db *sql.DB, userID int64, service, serviceID, username, avatarURL string) error {
	_, err := db.Exec(`
		INSERT INTO linked_accounts (user_id, service, service_id, username, avatar_url)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(user_id, service) DO UPDATE SET
			service_id=excluded.service_id,
			username=excluded.username,
			avatar_url=excluded.avatar_url`,
		userID, service, serviceID, username, avatarURL,
	)
	return err
}

func GetLinkedAccounts(db *sql.DB, userID int64) ([]LinkedAccount, error) {
	rows, err := db.Query(
		"SELECT service, service_id, username, avatar_url FROM linked_accounts WHERE user_id = ?", userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []LinkedAccount
	for rows.Next() {
		var a LinkedAccount
		if err := rows.Scan(&a.Service, &a.ServiceID, &a.Username, &a.AvatarURL); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, nil
}

func DeleteLinkedAccount(db *sql.DB, userID int64, service string) error {
	_, err := db.Exec(
		"DELETE FROM linked_accounts WHERE user_id = ? AND service = ?", userID, service,
	)
	return err
}

func CreateOAuthState(db *sql.DB, state string, userID int64, codeVerifier string, expiresAt time.Time) error {
	_, err := db.Exec(
		"INSERT OR REPLACE INTO oauth_states (state, user_id, code_verifier, expires_at) VALUES (?, ?, ?, ?)",
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
		"SELECT user_id, code_verifier FROM oauth_states WHERE state = ? AND expires_at > CURRENT_TIMESTAMP", state,
	).Scan(&s.UserID, &s.CodeVerifier)
	if err != nil {
		return nil, err
	}
	db.Exec("DELETE FROM oauth_states WHERE state = ?", state)
	return &s, nil
}

func CleanExpiredOAuthStates(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM oauth_states WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

func SearchUsers(db *sql.DB, query string) ([]User, error) {
	like := "%" + query + "%"
	rows, err := db.Query(
		`SELECT username, nickname, avatar_url FROM users
		 WHERE username LIKE ? OR (nickname != '' AND nickname LIKE ?)
		 ORDER BY username COLLATE NOCASE LIMIT 20`,
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

func MigrateEmailVerificationsTable(db *sql.DB) {
	db.Exec(`CREATE TABLE IF NOT EXISTS email_verifications (
		email      TEXT PRIMARY KEY,
		username   TEXT NOT NULL,
		nickname   TEXT NOT NULL DEFAULT '',
		password   TEXT NOT NULL,
		code       TEXT NOT NULL,
		expires_at DATETIME NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`)
}

func CreateEmailVerification(db *sql.DB, email, username, nickname, hashedPw, code string, expiresAt time.Time) error {
	_, err := db.Exec(`
		INSERT OR REPLACE INTO email_verifications (email, username, nickname, password, code, expires_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		email, username, nickname, hashedPw, code, expiresAt,
	)
	return err
}

func GetEmailVerification(db *sql.DB, email string) (*EmailVerification, error) {
	v := &EmailVerification{}
	err := db.QueryRow(`
		SELECT email, username, nickname, password, code, expires_at
		FROM email_verifications WHERE email = ? AND expires_at > CURRENT_TIMESTAMP`,
		email,
	).Scan(&v.Email, &v.Username, &v.Nickname, &v.Password, &v.Code, &v.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return v, nil
}

func DeleteEmailVerification(db *sql.DB, email string) {
	db.Exec("DELETE FROM email_verifications WHERE email = ?", email)
}

func CleanExpiredVerifications(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM email_verifications WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

func MigrateEmailChangeRequestsTable(db *sql.DB) {
	db.Exec(`CREATE TABLE IF NOT EXISTS email_change_requests (
		user_id    INTEGER PRIMARY KEY,
		new_email  TEXT NOT NULL,
		code       TEXT NOT NULL,
		expires_at DATETIME NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`)
}

func CreateEmailChangeRequest(db *sql.DB, userID int64, newEmail, code string, expiresAt time.Time) error {
	_, err := db.Exec(`
		INSERT OR REPLACE INTO email_change_requests (user_id, new_email, code, expires_at)
		VALUES (?, ?, ?, ?)`,
		userID, newEmail, code, expiresAt,
	)
	return err
}

func GetEmailChangeRequest(db *sql.DB, userID int64) (*EmailChangeRequest, error) {
	r := &EmailChangeRequest{}
	err := db.QueryRow(`
		SELECT user_id, new_email, code, expires_at
		FROM email_change_requests WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP`,
		userID,
	).Scan(&r.UserID, &r.NewEmail, &r.Code, &r.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func DeleteEmailChangeRequest(db *sql.DB, userID int64) {
	db.Exec("DELETE FROM email_change_requests WHERE user_id = ?", userID)
}

func CleanExpiredEmailChangeRequests(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM email_change_requests WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

// ── 2FA ──

func MigrateTwoFAColumns(db *sql.DB) {
	db.Exec("ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN NOT NULL DEFAULT 1")
	db.Exec("ALTER TABLE users ADD COLUMN trust_devices BOOLEAN NOT NULL DEFAULT 1")
}

func MigrateTrustedDevicesTable(db *sql.DB) {
	db.Exec(`CREATE TABLE IF NOT EXISTS trusted_devices (
		token       TEXT PRIMARY KEY,
		user_id     INTEGER NOT NULL,
		device_name TEXT NOT NULL DEFAULT '',
		ip          TEXT NOT NULL DEFAULT '',
		location    TEXT NOT NULL DEFAULT '',
		expires_at  DATETIME NOT NULL,
		created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	)`)
	// Migrations für bestehende Tabellen
	db.Exec("ALTER TABLE trusted_devices ADD COLUMN device_name TEXT NOT NULL DEFAULT ''")
	db.Exec("ALTER TABLE trusted_devices ADD COLUMN ip TEXT NOT NULL DEFAULT ''")
	db.Exec("ALTER TABLE trusted_devices ADD COLUMN location TEXT NOT NULL DEFAULT ''")
}

func MigrateLogin2FAPendingTable(db *sql.DB) {
	db.Exec(`CREATE TABLE IF NOT EXISTS login_2fa_pending (
		token      TEXT PRIMARY KEY,
		user_id    INTEGER NOT NULL,
		code       TEXT NOT NULL,
		expires_at DATETIME NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`)
}

func GetUserTwoFASettings(db *sql.DB, userID int64) (twoFAEnabled, trustDevices bool) {
	twoFAEnabled = true
	trustDevices = true
	db.QueryRow("SELECT two_fa_enabled, trust_devices FROM users WHERE id = ?", userID).Scan(&twoFAEnabled, &trustDevices)
	return
}

func SetUserTrustDevices(db *sql.DB, userID int64, enabled bool) error {
	_, err := db.Exec("UPDATE users SET trust_devices = ? WHERE id = ?", enabled, userID)
	return err
}

func SetUser2FAEnabled(db *sql.DB, userID int64, enabled bool) error {
	_, err := db.Exec("UPDATE users SET two_fa_enabled = ? WHERE id = ?", enabled, userID)
	return err
}

func ToggleUser2FA(db *sql.DB, username string) (bool, error) {
	var current bool
	err := db.QueryRow("SELECT two_fa_enabled FROM users WHERE username = ?", username).Scan(&current)
	if err != nil {
		return false, err
	}
	newVal := !current
	_, err = db.Exec("UPDATE users SET two_fa_enabled = ? WHERE username = ?", newVal, username)
	return newVal, err
}

func CreateLogin2FAPending(db *sql.DB, userID int64, code string) (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)
	_, err := db.Exec(
		"INSERT INTO login_2fa_pending (token, user_id, code, expires_at) VALUES (?, ?, ?, ?)",
		token, userID, code, time.Now().Add(10*time.Minute),
	)
	return token, err
}

func GetLogin2FAPending(db *sql.DB, token string) (int64, string, error) {
	var userID int64
	var code string
	err := db.QueryRow(
		"SELECT user_id, code FROM login_2fa_pending WHERE token = ? AND expires_at > CURRENT_TIMESTAMP",
		token,
	).Scan(&userID, &code)
	return userID, code, err
}

func DeleteLogin2FAPending(db *sql.DB, token string) {
	db.Exec("DELETE FROM login_2fa_pending WHERE token = ?", token)
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
		"INSERT INTO trusted_devices (token, user_id, device_name, ip, location, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
		token, userID, deviceName, ip, location, time.Now().Add(30*24*time.Hour),
	)
	return token, err
}

func GetTrustedDeviceUserID(db *sql.DB, token string) (int64, error) {
	var userID int64
	err := db.QueryRow(
		"SELECT user_id FROM trusted_devices WHERE token = ? AND expires_at > CURRENT_TIMESTAMP",
		token,
	).Scan(&userID)
	return userID, err
}

func GetTrustedDevices(db *sql.DB, userID int64) ([]TrustedDevice, error) {
	rows, err := db.Query(
		"SELECT token, device_name, location, created_at FROM trusted_devices WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC",
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
	res, err := db.Exec("DELETE FROM trusted_devices WHERE token = ? AND user_id = ?", token, userID)
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
	db.Exec("DELETE FROM trusted_devices WHERE user_id = ?", userID)
}

func CleanExpiredTrustedDevices(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM trusted_devices WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

func CleanExpiredLogin2FAPending(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM login_2fa_pending WHERE expires_at <= CURRENT_TIMESTAMP")
	return err
}

func UpdateUserEmail(db *sql.DB, userID int64, newEmail string) error {
	_, err := db.Exec("UPDATE users SET email = ? WHERE id = ?", newEmail, userID)
	return err
}

func CheckUserConflict(db *sql.DB, username, email string) (bool, error) {
	var count int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM users WHERE username = ? OR email = ?", username, email,
	).Scan(&count)
	return count > 0, err
}

func EnsureAdminUser(db *sql.DB, hashedPw string) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = 'admin')").Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		_, err = db.Exec("UPDATE users SET password = ?, is_admin = 1 WHERE username = 'admin'", hashedPw)
		return err
	}
	_, err = db.Exec(
		"INSERT INTO users (username, email, password, is_admin) VALUES ('admin', 'admin@teamapx.local', ?, 1)",
		hashedPw,
	)
	return err
}
