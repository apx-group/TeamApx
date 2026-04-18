package main

import (
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

// handleLog serves GET /api/log — public, no auth required.
func handleLog(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		entries, err := apx.GetAllLogEntries()
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if entries == nil {
			entries = []LogEntry{}
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"entries": entries})
	}
}

// handleAdminLog serves GET/POST/PUT/DELETE /api/admin/log — admin only.
func handleAdminLog(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session")
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil || !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		switch r.Method {
		case http.MethodGet:
			entries, err := apx.GetAllLogEntries()
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
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
			entry := &LogEntry{Title: req.Title, Body: req.Body, LogDate: req.LogDate}
			if err := apx.CreateLogEntry(entry); err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"ok": true})

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
			entry := &LogEntry{ID: req.ID, Title: req.Title, Body: req.Body, LogDate: req.LogDate}
			if err := apx.UpdateLogEntry(entry); err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
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
			if err := apx.DeleteLogEntry(req.ID); err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"ok": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}
