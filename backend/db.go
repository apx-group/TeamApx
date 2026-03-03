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
	Email     string `json:"email"`
	Password  string `json:"-"`
	IsAdmin   bool   `json:"is_admin"`
	CreatedAt string `json:"created_at"`
}

type TeamMember struct {
	ID           int64  `json:"id"`
	Name         string `json:"name"`
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
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
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

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			username   TEXT    NOT NULL UNIQUE,
			email      TEXT    NOT NULL UNIQUE,
			password   TEXT    NOT NULL,
			is_admin   BOOLEAN NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS team (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			name        TEXT    NOT NULL,
			kills       INTEGER NOT NULL DEFAULT 0,
			deaths      INTEGER NOT NULL DEFAULT 0,
			rounds      INTEGER NOT NULL DEFAULT 0,
			kost_points INTEGER NOT NULL DEFAULT 0,
			atk_role    TEXT    NOT NULL DEFAULT '',
			def_role    TEXT    NOT NULL DEFAULT '',
			kill_entry  INTEGER NOT NULL DEFAULT 0,
			kill_trade  INTEGER NOT NULL DEFAULT 0,
			kill_impact INTEGER NOT NULL DEFAULT 0,
			kill_late   INTEGER NOT NULL DEFAULT 0,
			death_entry INTEGER NOT NULL DEFAULT 0,
			death_trade INTEGER NOT NULL DEFAULT 0,
			death_late  INTEGER NOT NULL DEFAULT 0,
			clutch_1v1  INTEGER NOT NULL DEFAULT 0,
			clutch_1v2  INTEGER NOT NULL DEFAULT 0,
			clutch_1v3  INTEGER NOT NULL DEFAULT 0,
			clutch_1v4  INTEGER NOT NULL DEFAULT 0,
			clutch_1v5  INTEGER NOT NULL DEFAULT 0,
			obj_plant   INTEGER NOT NULL DEFAULT 0,
			obj_defuse  INTEGER NOT NULL DEFAULT 0
		);
		CREATE TABLE IF NOT EXISTS staff (
			id   INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT    NOT NULL,
			role TEXT    NOT NULL DEFAULT ''
		);
	`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("create data tables: %w", err)
	}
	return db, nil
}

func GetStaffMembers(db *sql.DB) ([]StaffMember, error) {
	rows, err := db.Query(`SELECT id, name, role FROM staff ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var members []StaffMember
	for rows.Next() {
		var s StaffMember
		if err := rows.Scan(&s.ID, &s.Name, &s.Role); err != nil {
			return nil, err
		}
		members = append(members, s)
	}
	return members, nil
}

func AddStaffMember(db *sql.DB, name, role string) (int64, error) {
	res, err := db.Exec("INSERT INTO staff (name, role) VALUES (?, ?)", name, role)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func DeleteStaffMember(db *sql.DB, id int64) error {
	_, err := db.Exec("DELETE FROM staff WHERE id = ?", id)
	return err
}

func CreateUser(db *sql.DB, username, email, hashedPw string) (int64, error) {
	res, err := db.Exec(
		"INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
		username, email, hashedPw,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetUserByEmail(db *sql.DB, email string) (*User, error) {
	u := &User{}
	err := db.QueryRow(
		"SELECT id, username, email, password, is_admin, created_at FROM users WHERE email = ?", email,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Password, &u.IsAdmin, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func GetUserByUsername(db *sql.DB, username string) (*User, error) {
	u := &User{}
	err := db.QueryRow(
		"SELECT id, username, email, password, is_admin, created_at FROM users WHERE username = ?", username,
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
		SELECT u.id, u.username, u.email, u.is_admin, u.created_at
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
	`, token).Scan(&u.ID, &u.Username, &u.Email, &u.IsAdmin, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
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
	rows, err := db.Query(`SELECT id, name, kills, deaths, rounds, kost_points, atk_role, def_role,
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
		if err := rows.Scan(&m.ID, &m.Name, &m.Kills, &m.Deaths, &m.Rounds, &m.KostPoints, &m.AtkRole, &m.DefRole,
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

func UpdateTeamMember(db *sql.DB, m TeamMember) error {
	_, err := db.Exec(`UPDATE team SET kills=?, deaths=?, rounds=?, kost_points=?, atk_role=?, def_role=?,
		is_main_roster=?, paired_with=?,
		kill_entry=?, kill_trade=?, kill_impact=?, kill_late=?,
		death_entry=?, death_trade=?, death_late=?,
		clutch_1v1=?, clutch_1v2=?, clutch_1v3=?, clutch_1v4=?, clutch_1v5=?,
		obj_plant=?, obj_defuse=?
		WHERE id=?`,
		m.Kills, m.Deaths, m.Rounds, m.KostPoints, m.AtkRole, m.DefRole,
		m.IsMainRoster, m.PairedWith,
		m.KillEntry, m.KillTrade, m.KillImpact, m.KillLate,
		m.DeathEntry, m.DeathTrade, m.DeathLate,
		m.Clutch1v1, m.Clutch1v2, m.Clutch1v3, m.Clutch1v4, m.Clutch1v5,
		m.ObjPlant, m.ObjDefuse,
		m.ID,
	)
	return err
}

func AddTeamMember(db *sql.DB, name, atkRole, defRole string, isMainRoster bool) (int64, error) {
	res, err := db.Exec(
		"INSERT INTO team (name, atk_role, def_role, is_main_roster) VALUES (?, ?, ?, ?)",
		name, atkRole, defRole, isMainRoster,
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
