package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

// LogEntry represents a single team news/announcement entry.
type LogEntry struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	LogDate   string    `json:"log_date"` // "YYYY-MM-DD"
	CreatedAt time.Time `json:"created_at"`
}

// GetAllLogEntries returns all log entries ordered by date descending.
func GetAllLogEntries(db *sql.DB) ([]LogEntry, error) {
	rows, err := db.Query(`SELECT id, title, body, log_date, created_at FROM apx_log ORDER BY log_date DESC, id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var entries []LogEntry
	for rows.Next() {
		var e LogEntry
		var d time.Time
		if err := rows.Scan(&e.ID, &e.Title, &e.Body, &d, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.LogDate = d.Format("2006-01-02")
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// CreateLogEntry inserts a new log entry and returns its ID.
func CreateLogEntry(db *sql.DB, title, body, logDate string) (int64, error) {
	var id int64
	err := db.QueryRow(
		`INSERT INTO apx_log (title, body, log_date) VALUES ($1, $2, $3) RETURNING id`,
		title, body, logDate,
	).Scan(&id)
	return id, err
}

// UpdateLogEntry updates an existing log entry.
func UpdateLogEntry(db *sql.DB, id int64, title, body, logDate string) error {
	_, err := db.Exec(
		`UPDATE apx_log SET title=$1, body=$2, log_date=$3 WHERE id=$4`,
		title, body, logDate, id,
	)
	return err
}

// DeleteLogEntry removes a log entry by ID.
func DeleteLogEntry(db *sql.DB, id int64) error {
	_, err := db.Exec(`DELETE FROM apx_log WHERE id = $1`, id)
	return err
}

// handleLog serves GET /api/log — public, no auth required.
func handleLog(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		entries, err := GetAllLogEntries(db)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "db error")
			return
		}
		if entries == nil {
			entries = []LogEntry{}
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"entries": entries})
	}
}

// handleAdminLog serves GET/POST/PUT/DELETE /api/admin/log — admin only.
func handleAdminLog(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
			entries, err := GetAllLogEntries(db)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "db error")
				return
			}
			if entries == nil {
				entries = []LogEntry{}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"entries": entries})

		case http.MethodPost:
			var req struct {
				Title   string `json:"title"`
				Body    string `json:"body"`
				LogDate string `json:"log_date"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			id, err := CreateLogEntry(db, req.Title, req.Body, req.LogDate)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "db error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"id": id})

		case http.MethodPut:
			var req struct {
				ID      int64  `json:"id"`
				Title   string `json:"title"`
				Body    string `json:"body"`
				LogDate string `json:"log_date"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if err := UpdateLogEntry(db, req.ID, req.Title, req.Body, req.LogDate); err != nil {
				jsonError(w, http.StatusInternalServerError, "db error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"ok": true})

		case http.MethodDelete:
			var req struct {
				ID int64 `json:"id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if err := DeleteLogEntry(db, req.ID); err != nil {
				jsonError(w, http.StatusInternalServerError, "db error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"ok": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}
