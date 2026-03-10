package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
)

// Badge represents a badge definition.
type Badge struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Info        string `json:"info"`
	ImageURL    string `json:"image_url"`
	MaxLevel    int    `json:"max_level"`
	Available   bool   `json:"available"`
	Category    string `json:"category"`
}

// UserBadge represents a badge as seen by / assigned to a user.
type UserBadge struct {
	BadgeID     int64  `json:"badge_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Info        string `json:"info"`
	ImageURL    string `json:"image_url"`
	MaxLevel    int    `json:"max_level"`
	Available   bool   `json:"available"`
	Category    string `json:"category"`
	Level       int    `json:"level"`
}

// MigrateBadgesTables creates the badges and user_badges tables if they don't exist.
func MigrateBadgesTables(db *sql.DB) {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS badges (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			name        TEXT    NOT NULL,
			description TEXT    NOT NULL DEFAULT '',
			info        TEXT    NOT NULL DEFAULT '',
			image_url   TEXT    NOT NULL DEFAULT '/assets/icons/APX.png',
			max_level   INTEGER NOT NULL DEFAULT 3,
			available   INTEGER NOT NULL DEFAULT 1,
			category    TEXT    NOT NULL DEFAULT '',
			created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS user_badges (
			user_id   INTEGER NOT NULL,
			badge_id  INTEGER NOT NULL,
			level     INTEGER NOT NULL DEFAULT 1,
			PRIMARY KEY (user_id, badge_id),
			FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
			FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
		);
	`)
	if err != nil {
		log.Printf("MigrateBadgesTables error: %v", err)
	}
}

// GetAllBadges returns all badges ordered by id.
func GetAllBadges(db *sql.DB) ([]Badge, error) {
	rows, err := db.Query(`SELECT id, name, description, info, image_url, max_level, available, category FROM badges ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var badges []Badge
	for rows.Next() {
		var b Badge
		var available int
		if err := rows.Scan(&b.ID, &b.Name, &b.Description, &b.Info, &b.ImageURL, &b.MaxLevel, &available, &b.Category); err != nil {
			return nil, err
		}
		b.Available = available != 0
		badges = append(badges, b)
	}
	return badges, rows.Err()
}

// CreateBadge inserts a new badge and returns its new ID.
func CreateBadge(db *sql.DB, name, description, info, imageURL, category string, maxLevel int) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO badges (name, description, info, image_url, max_level, category) VALUES (?, ?, ?, ?, ?, ?)`,
		name, description, info, imageURL, maxLevel, category,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// UpdateBadge updates an existing badge.
func UpdateBadge(db *sql.DB, id int64, name, description, info, imageURL, category string, maxLevel int, available bool) error {
	av := 0
	if available {
		av = 1
	}
	_, err := db.Exec(
		`UPDATE badges SET name=?, description=?, info=?, image_url=?, max_level=?, available=?, category=? WHERE id=?`,
		name, description, info, imageURL, maxLevel, av, category, id,
	)
	return err
}

// DeleteBadge removes a badge by ID.
func DeleteBadge(db *sql.DB, id int64) error {
	_, err := db.Exec(`DELETE FROM badges WHERE id = ?`, id)
	return err
}

// GetUserBadges returns ALL badges for the given user, with level=0 for badges the user doesn't own.
func GetUserBadges(db *sql.DB, userID int64) ([]UserBadge, error) {
	rows, err := db.Query(`
		SELECT b.id, b.name, b.description, b.info, b.image_url, b.max_level, b.available, b.category,
		       COALESCE(ub.level, 0) AS level
		FROM badges b
		LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = ?
		ORDER BY b.id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var badges []UserBadge
	for rows.Next() {
		var b UserBadge
		var available int
		if err := rows.Scan(&b.BadgeID, &b.Name, &b.Description, &b.Info, &b.ImageURL, &b.MaxLevel, &available, &b.Category, &b.Level); err != nil {
			return nil, err
		}
		b.Available = available != 0
		badges = append(badges, b)
	}
	return badges, rows.Err()
}

// GetUserIDByUsername looks up a user's ID by their username.
func GetUserIDByUsername(db *sql.DB, username string) (int64, error) {
	var id int64
	err := db.QueryRow(`SELECT id FROM users WHERE username = ?`, username).Scan(&id)
	return id, err
}

// GetUserBadgesByUsername looks up the user ID and then returns their badges.
func GetUserBadgesByUsername(db *sql.DB, username string) ([]UserBadge, error) {
	userID, err := GetUserIDByUsername(db, username)
	if err != nil {
		return nil, err
	}
	return GetUserBadges(db, userID)
}

// UpsertUserBadge inserts or updates a user's badge level.
func UpsertUserBadge(db *sql.DB, userID, badgeID int64, level int) error {
	_, err := db.Exec(`
		INSERT INTO user_badges (user_id, badge_id, level)
		VALUES (?, ?, ?)
		ON CONFLICT(user_id, badge_id) DO UPDATE SET level = excluded.level`,
		userID, badgeID, level,
	)
	return err
}

// RemoveUserBadge removes a badge from a user.
func RemoveUserBadge(db *sql.DB, userID, badgeID int64) error {
	_, err := db.Exec(`DELETE FROM user_badges WHERE user_id = ? AND badge_id = ?`, userID, badgeID)
	return err
}

// handleAdminBadges handles admin badge CRUD: GET (list), POST (create), PUT (update), DELETE (delete).
func handleAdminBadges(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		cookie, err := r.Cookie("session")
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil || !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		switch r.Method {
		case http.MethodGet:
			badges, err := GetAllBadges(db)
			if err != nil {
				log.Printf("GetAllBadges error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if badges == nil {
				badges = []Badge{}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"badges": badges})

		case http.MethodPost:
			var req struct {
				Name        string `json:"name"`
				Description string `json:"description"`
				Info        string `json:"info"`
				ImageURL    string `json:"image_url"`
				Category    string `json:"category"`
				MaxLevel    int    `json:"max_level"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if req.Name == "" {
				jsonError(w, http.StatusBadRequest, "name required")
				return
			}
			if req.MaxLevel < 0 || req.MaxLevel > 15 {
				req.MaxLevel = 0
			}
			if req.ImageURL == "" {
				req.ImageURL = "/assets/icons/APX.png"
			}
			id, err := CreateBadge(db, req.Name, req.Description, req.Info, req.ImageURL, req.Category, req.MaxLevel)
			if err != nil {
				log.Printf("CreateBadge error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusCreated, map[string]interface{}{"id": id, "success": true})

		case http.MethodPut:
			var req struct {
				ID          int64  `json:"id"`
				Name        string `json:"name"`
				Description string `json:"description"`
				Info        string `json:"info"`
				ImageURL    string `json:"image_url"`
				Category    string `json:"category"`
				MaxLevel    int    `json:"max_level"`
				Available   bool   `json:"available"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if req.ID == 0 {
				jsonError(w, http.StatusBadRequest, "id required")
				return
			}
			if req.Name == "" {
				jsonError(w, http.StatusBadRequest, "name required")
				return
			}
			if req.MaxLevel < 0 || req.MaxLevel > 15 {
				req.MaxLevel = 0
			}
			if req.ImageURL == "" {
				req.ImageURL = "/assets/icons/APX.png"
			}
			if err := UpdateBadge(db, req.ID, req.Name, req.Description, req.Info, req.ImageURL, req.Category, req.MaxLevel, req.Available); err != nil {
				log.Printf("UpdateBadge error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		case http.MethodDelete:
			var req struct {
				ID int64 `json:"id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if req.ID == 0 {
				jsonError(w, http.StatusBadRequest, "id required")
				return
			}
			if err := DeleteBadge(db, req.ID); err != nil {
				log.Printf("DeleteBadge error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

// handleAdminUserBadges handles admin user-badge operations.
// GET  ?username=X          → list user's badges
// POST body {username, badge_id, level} → upsert
// DELETE ?username=X&badge_id=Y        → remove
func handleAdminUserBadges(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		cookie, err := r.Cookie("session")
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil || !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		switch r.Method {
		case http.MethodGet:
			username := r.URL.Query().Get("username")
			if username == "" {
				jsonError(w, http.StatusBadRequest, "username required")
				return
			}
			badges, err := GetUserBadgesByUsername(db, username)
			if err != nil {
				log.Printf("GetUserBadgesByUsername error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if badges == nil {
				badges = []UserBadge{}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"badges": badges})

		case http.MethodPost:
			var req struct {
				Username string `json:"username"`
				BadgeID  int64  `json:"badge_id"`
				Level    int    `json:"level"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if req.Username == "" {
				jsonError(w, http.StatusBadRequest, "username required")
				return
			}
			if req.BadgeID == 0 {
				jsonError(w, http.StatusBadRequest, "badge_id required")
				return
			}
			if req.Level < 0 {
				req.Level = 0
			}
			userID, err := GetUserIDByUsername(db, req.Username)
			if err != nil {
				jsonError(w, http.StatusNotFound, "user not found")
				return
			}
			if err := UpsertUserBadge(db, userID, req.BadgeID, req.Level); err != nil {
				log.Printf("UpsertUserBadge error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		case http.MethodDelete:
			username := r.URL.Query().Get("username")
			badgeIDStr := r.URL.Query().Get("badge_id")
			if username == "" || badgeIDStr == "" {
				jsonError(w, http.StatusBadRequest, "username and badge_id required")
				return
			}
			badgeID, err := strconv.ParseInt(badgeIDStr, 10, 64)
			if err != nil || badgeID == 0 {
				jsonError(w, http.StatusBadRequest, "invalid badge_id")
				return
			}
			userID, err := GetUserIDByUsername(db, username)
			if err != nil {
				jsonError(w, http.StatusNotFound, "user not found")
				return
			}
			if err := RemoveUserBadge(db, userID, badgeID); err != nil {
				log.Printf("RemoveUserBadge error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

// handleAdminBadgeImage handles POST /api/admin/badges/image – uploads a badge image.
func handleAdminBadgeImage(db *sql.DB, uploadDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		cookie, err := r.Cookie("session")
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil || !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		if err := r.ParseMultipartForm(10 << 20); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid form data")
			return
		}
		file, _, err := r.FormFile("image")
		if err != nil {
			jsonError(w, http.StatusBadRequest, "image required")
			return
		}
		defer file.Close()

		filename := fmt.Sprintf("badge_%d", time.Now().UnixNano())
		url, err := saveUploadedImage(file, uploadDir, "badge", filename)
		if err != nil {
			log.Printf("saveUploadedImage badge error: %v", err)
			jsonError(w, http.StatusInternalServerError, "upload failed")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]string{"image_url": url})
	}
}

// handleUserBadges handles GET /api/badges – returns the current user's badges.
func handleUserBadges(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		cookie, err := r.Cookie("session")
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		badges, err := GetUserBadges(db, user.ID)
		if err != nil {
			log.Printf("GetUserBadges error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if badges == nil {
			badges = []UserBadge{}
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"badges": badges})
	}
}
