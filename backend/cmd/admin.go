package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
)

// POST /api/admin/verify-master
func handleAdminVerifyMaster(apx *ApxClient) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
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
//	GET    /api/admin/users/<username>
//	POST   /api/admin/users/<username>/deactivate
//	POST   /api/admin/users/<username>/activate
//	POST   /api/admin/users/<username>/toggle-2fa
//	POST   /api/admin/users/<username>/event-access
//	DELETE /api/admin/users/<username>
func handleAdminUserActions(apx *ApxClient) http.HandlerFunc {
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
		admin, err := apx.GetSessionUser(cookie.Value)
		if err != nil || !admin.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

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
			u, err := apx.GetUserByUsernameAny(username)
			if err != nil {
				jsonError(w, http.StatusNotFound, "Nutzer nicht gefunden")
				return
			}
			links, _ := apx.GetLinkedAccounts(u.ID)
			if links == nil {
				links = []LinkedAccount{}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{
				"username":       u.Username,
				"nickname":       u.Nickname,
				"avatar_url":     u.AvatarURL,
				"banner_url":     u.BannerURL,
				"email":          u.Email,
				"is_active":      u.IsActive,
				"two_fa_enabled": u.TwoFAEnabled,
				"is_admin":       u.IsAdmin,
				"event_access":   u.EventAccess,
				"created_at":     u.CreatedAt,
				"links":          links,
			})

		case r.Method == http.MethodPost && action == "deactivate":
			if username == "admin" || username == admin.Username {
				jsonError(w, http.StatusForbidden, "Diese Aktion ist für diesen Nutzer nicht erlaubt")
				return
			}
			if err := apx.DeactivateUserByUsername(username); err != nil {
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
			if err := apx.ActivateByUsername(username); err != nil {
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
			newVal, err := apx.ToggleUser2FA(username)
			if err != nil {
				log.Printf("admin toggle-2fa %s: %v", username, err)
				jsonError(w, http.StatusNotFound, "Nutzer nicht gefunden")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"two_fa_enabled": newVal})

		case r.Method == http.MethodPost && action == "event-access":
			var req struct {
				EventAccess bool `json:"event_access"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid body")
				return
			}
			if err := apx.SetUserEventAccessByUsername(username, req.EventAccess); err != nil {
				log.Printf("admin event-access %s: %v", username, err)
				jsonError(w, http.StatusNotFound, "Nutzer nicht gefunden")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		case r.Method == http.MethodDelete && action == "":
			if username == "admin" || username == admin.Username {
				jsonError(w, http.StatusForbidden, "Diese Aktion ist für diesen Nutzer nicht erlaubt")
				return
			}
			if err := apx.DeleteUserByUsername(username); err != nil {
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

// handleAdminPublicUser wraps handlePublicUser but includes email/2FA for admins.
func handleAdminPublicUser(apx *ApxClient) http.HandlerFunc {
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

		isAdmin := false
		if cookie, err := r.Cookie("session"); err == nil {
			if user, err := apx.GetSessionUser(cookie.Value); err == nil {
				isAdmin = user.IsAdmin
			}
		}

		u, err := apx.GetUserByUsernameAny(username)
		if err != nil {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}

		links, err := apx.GetLinkedAccounts(u.ID)
		if err != nil {
			log.Printf("handleAdminPublicUser GetLinkedAccounts: %v", err)
			links = nil
		}

		discordRoles := []string{}
		for _, link := range links {
			if link.Service == "discord" && link.ServiceID != "" {
				if memberRoles, err := fetchGuildMemberRolesByBot(link.ServiceID); err == nil && memberRoles != nil {
					discordRoles = matchDiscordDisplayRoles(memberRoles)
				} else if err != nil {
					log.Printf("handleAdminPublicUser fetchGuildMemberRolesByBot: %v", err)
				}
				break
			}
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

		badges, err := apx.GetUserBadges(u.ID)
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
			pubBadges = append(pubBadges, publicBadge{
				Name:     b.Name,
				ImageURL: b.ImageURL,
				Level:    b.Level,
				MaxLevel: b.MaxLevel,
			})
		}

		resp := map[string]interface{}{
			"username":        u.Username,
			"nickname":        u.Nickname,
			"avatar_url":      u.AvatarURL,
			"banner_url":      u.BannerURL,
			"links":           pubLinks,
			"badges":          pubBadges,
			"bio":             u.Bio,
			"show_local_time": u.ShowLocalTime,
			"created_at":      u.CreatedAt,
			"discord_roles":   discordRoles,
		}
		if u.Timezone != "" {
			resp["timezone"] = u.Timezone
		}
		if isAdmin {
			resp["email"] = u.Email
			resp["two_fa_enabled"] = u.TwoFAEnabled
		}
		jsonResponse(w, http.StatusOK, resp)
	}
}
