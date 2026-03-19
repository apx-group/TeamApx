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

		masterPw := strings.TrimSpace(os.Getenv("MASTERPASSWORD"))
		if masterPw == "" || strings.TrimSpace(req.Password) != masterPw {
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

		// Parse path: /api/admin/users/<username>[/action]
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

		switch {
		case r.Method == http.MethodGet && action == "":
			var userID int64
			var displayUsername, nickname, avatarURL, bannerURL, email, createdAt string
			var isActive, twoFAEnabled, isAdmin bool
			err := db.QueryRow(
				`SELECT id, username, nickname, avatar_url, banner_url, email, is_active, two_fa_enabled, is_admin, created_at FROM apx_users WHERE username = $1`,
				username,
			).Scan(&userID, &displayUsername, &nickname, &avatarURL, &bannerURL, &email, &isActive, &twoFAEnabled, &isAdmin, &createdAt)
			if err == sql.ErrNoRows {
				jsonError(w, http.StatusNotFound, "Nutzer nicht gefunden")
				return
			}
			if err != nil {
				log.Printf("admin getUserDetail %s: %v", username, err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			links, _ := GetLinkedAccounts(db, userID)
			if links == nil {
				links = []LinkedAccount{}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{
				"username":       displayUsername,
				"nickname":       nickname,
				"avatar_url":     avatarURL,
				"banner_url":     bannerURL,
				"email":          email,
				"is_active":      isActive,
				"two_fa_enabled": twoFAEnabled,
				"is_admin":       isAdmin,
				"created_at":     createdAt,
				"links":          links,
			})

		case r.Method == http.MethodPost && action == "deactivate":
			// Prevent acting on the root admin account or on oneself
			if username == "admin" || username == admin.Username {
				jsonError(w, http.StatusForbidden, "Diese Aktion ist für diesen Nutzer nicht erlaubt")
				return
			}
			if err := DeactivateUserByUsername(db, username); err != nil {
				log.Printf("admin deactivate %s: %v", username, err)
				jsonError(w, http.StatusNotFound, "Nutzer nicht gefunden")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		case r.Method == http.MethodPost && action == "activate":
			if username == "admin" || username == admin.Username {
				jsonError(w, http.StatusForbidden, "Diese Aktion ist für diesen Nutzer nicht erlaubt")
				return
			}
			_, err := db.Exec("UPDATE apx_users SET is_active = true WHERE username = $1", username)
			if err != nil {
				log.Printf("admin activate %s: %v", username, err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		case r.Method == http.MethodPost && action == "toggle-2fa":
			if username == "admin" || username == admin.Username {
				jsonError(w, http.StatusForbidden, "Diese Aktion ist für diesen Nutzer nicht erlaubt")
				return
			}
			newVal, err := ToggleUser2FA(db, username)
			if err != nil {
				log.Printf("admin toggle-2fa %s: %v", username, err)
				jsonError(w, http.StatusNotFound, "Nutzer nicht gefunden")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"two_fa_enabled": newVal})

		case r.Method == http.MethodDelete && action == "":
			if username == "admin" || username == admin.Username {
				jsonError(w, http.StatusForbidden, "Diese Aktion ist für diesen Nutzer nicht erlaubt")
				return
			}
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
			`SELECT id, username, nickname, avatar_url, banner_url, email FROM apx_users WHERE username = $1`,
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
			Service    string `json:"service"`
			Username   string `json:"username"`
			AvatarURL  string `json:"avatar_url"`
			ProfileURL string `json:"profile_url"`
		}
		pubLinks := make([]publicLink, 0, len(links))
		for _, l := range links {
			pubLinks = append(pubLinks, publicLink{
				Service:    l.Service,
				Username:   l.Username,
				AvatarURL:  l.AvatarURL,
				ProfileURL: l.ProfileURL,
			})
		}

		badges, err := GetUserBadges(db, userID)
		if err != nil {
			log.Printf("handleAdminPublicUser GetUserBadges: %v", err)
			badges = nil
		}
		type publicBadge struct {
			Name     string `json:"name"`
			ImageURL string `json:"image_url"`
			Level    int    `json:"level"`
			MaxLevel int    `json:"max_level"`
		}
		pubBadges := make([]publicBadge, 0)
		for _, b := range badges {
			if b.Level > 0 || (b.MaxLevel == 0 && b.Owned) {
				pubBadges = append(pubBadges, publicBadge{
					Name:     b.Name,
					ImageURL: b.ImageURL,
					Level:    b.Level,
					MaxLevel: b.MaxLevel,
				})
			}
		}

		resp := map[string]interface{}{
			"username":   displayUsername,
			"nickname":   nickname,
			"avatar_url": avatarURL,
			"banner_url": bannerURL,
			"links":      pubLinks,
			"badges":     pubBadges,
		}
		if isAdmin {
			resp["email"] = email
			var twoFAEnabled bool
			db.QueryRow("SELECT two_fa_enabled FROM apx_users WHERE username = $1", displayUsername).Scan(&twoFAEnabled)
			resp["two_fa_enabled"] = twoFAEnabled
		}
		jsonResponse(w, http.StatusOK, resp)
	}
}
