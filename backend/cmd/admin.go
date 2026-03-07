package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
)

// POST /api/admin/verify-master
func handleAdminVerifyMaster(db *sql.DB) http.HandlerFunc {
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

		var req struct {
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		masterPw := os.Getenv("MASTERPASSWORD")
		if masterPw == "" || req.Password != masterPw {
			jsonError(w, http.StatusUnauthorized, "Falsches Masterpassword")
			return
		}

		jsonResponse(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// handleAdminUserActions handles:
//
//	POST   /api/admin/users/<username>/deactivate
//	DELETE /api/admin/users/<username>
func handleAdminUserActions(db *sql.DB) http.HandlerFunc {
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
		admin, err := GetSessionUser(db, cookie.Value)
		if err != nil || !admin.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		// Parse path: /api/admin/users/<username>[/deactivate]
		path := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
		parts := strings.SplitN(path, "/", 2)
		username := parts[0]
		if username == "" {
			jsonError(w, http.StatusBadRequest, "missing username")
			return
		}
		action := ""
		if len(parts) == 2 {
			action = parts[1]
		}

		// Prevent acting on the root admin account or on oneself
		if username == "admin" || username == admin.Username {
			jsonError(w, http.StatusForbidden, "Diese Aktion ist für diesen Nutzer nicht erlaubt")
			return
		}

		switch {
		case r.Method == http.MethodPost && action == "deactivate":
			if err := DeactivateUserByUsername(db, username); err != nil {
				log.Printf("admin deactivate %s: %v", username, err)
				jsonError(w, http.StatusNotFound, "Nutzer nicht gefunden")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		case r.Method == http.MethodPost && action == "toggle-2fa":
			newVal, err := ToggleUser2FA(db, username)
			if err != nil {
				log.Printf("admin toggle-2fa %s: %v", username, err)
				jsonError(w, http.StatusNotFound, "Nutzer nicht gefunden")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"two_fa_enabled": newVal})

		case r.Method == http.MethodDelete && action == "":
			if err := DeleteUserByUsername(db, username); err != nil {
				log.Printf("admin delete %s: %v", username, err)
				jsonError(w, http.StatusNotFound, "Nutzer nicht gefunden")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

// handleAdminPublicUser wraps handlePublicUser but includes email for admins.
func handleAdminPublicUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		username := r.URL.Query().Get("u")
		if username == "" {
			jsonError(w, http.StatusBadRequest, "missing username")
			return
		}

		// Check if requester is admin
		isAdmin := false
		if cookie, err := r.Cookie("session"); err == nil {
			if user, err := GetSessionUser(db, cookie.Value); err == nil {
				isAdmin = user.IsAdmin
			}
		}

		var userID int64
		var displayUsername, nickname, avatarURL, bannerURL, email string
		err := db.QueryRow(
			`SELECT id, username, nickname, avatar_url, banner_url, email FROM users WHERE username = ?`,
			username,
		).Scan(&userID, &displayUsername, &nickname, &avatarURL, &bannerURL, &email)
		if err == sql.ErrNoRows {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}
		if err != nil {
			log.Printf("handleAdminPublicUser: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		links, err := GetLinkedAccounts(db, userID)
		if err != nil {
			log.Printf("handleAdminPublicUser GetLinkedAccounts: %v", err)
			links = nil
		}

		type publicLink struct {
			Service   string `json:"service"`
			Username  string `json:"username"`
			AvatarURL string `json:"avatar_url"`
		}
		pubLinks := make([]publicLink, 0, len(links))
		for _, l := range links {
			pubLinks = append(pubLinks, publicLink{
				Service:   l.Service,
				Username:  l.Username,
				AvatarURL: l.AvatarURL,
			})
		}

		resp := map[string]interface{}{
			"username":   displayUsername,
			"nickname":   nickname,
			"avatar_url": avatarURL,
			"banner_url": bannerURL,
			"links":      pubLinks,
		}
		if isAdmin {
			resp["email"] = email
			var twoFAEnabled bool
			db.QueryRow("SELECT two_fa_enabled FROM users WHERE username = ?", displayUsername).Scan(&twoFAEnabled)
			resp["two_fa_enabled"] = twoFAEnabled
		}
		jsonResponse(w, http.StatusOK, resp)
	}
}
