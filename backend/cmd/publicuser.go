package main

import (
	"database/sql"
	"log"
	"net/http"
)

// GET /api/user?u=<username>
func handlePublicUser(db *sql.DB) http.HandlerFunc {
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

		var userID int64
		var displayUsername, nickname, avatarURL, bannerURL, timezone, bio string
		var showLocalTime bool
		var createdAt sql.NullTime
		err := db.QueryRow(
			`SELECT id, username, nickname, avatar_url, banner_url, timezone, show_local_time, bio, created_at FROM apx_users WHERE username = $1`,
			username,
		).Scan(&userID, &displayUsername, &nickname, &avatarURL, &bannerURL, &timezone, &showLocalTime, &bio, &createdAt)
		if err == sql.ErrNoRows {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}
		if err != nil {
			log.Printf("handlePublicUser: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		links, err := GetLinkedAccounts(db, userID)
		if err != nil {
			log.Printf("handlePublicUser GetLinkedAccounts: %v", err)
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

		type publicBadge struct {
			Name     string `json:"name"`
			ImageURL string `json:"image_url"`
			Level    int    `json:"level"`
			MaxLevel int    `json:"max_level"`
		}
		pubBadges := []publicBadge{}
		if userBadges, err := GetUserBadges(db, userID); err == nil {
			for _, b := range userBadges {
				if b.Owned {
					pubBadges = append(pubBadges, publicBadge{b.Name, b.ImageURL, b.Level, b.MaxLevel})
				}
			}
		}

		createdAtStr := ""
		if createdAt.Valid {
			createdAtStr = createdAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}
		resp := map[string]interface{}{
			"username":        displayUsername,
			"nickname":        nickname,
			"avatar_url":      avatarURL,
			"banner_url":      bannerURL,
			"links":           pubLinks,
			"badges":          pubBadges,
			"created_at":      createdAtStr,
			"bio":             bio,
			"show_local_time": showLocalTime,
		}
		if timezone != "" {
			resp["timezone"] = timezone
		}
		jsonResponse(w, http.StatusOK, resp)
	}
}

// GET /api/users/search?q=<query>
func handleUserSearch(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		q := r.URL.Query().Get("q")
		if q == "" {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"users": []struct{}{}})
			return
		}

		users, err := SearchUsers(db, q)
		if err != nil {
			log.Printf("handleUserSearch: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		type searchResult struct {
			Username  string `json:"username"`
			Nickname  string `json:"nickname"`
			AvatarURL string `json:"avatar_url"`
		}
		results := make([]searchResult, 0, len(users))
		for _, u := range users {
			results = append(results, searchResult{
				Username:  u.Username,
				Nickname:  u.Nickname,
				AvatarURL: u.AvatarURL,
			})
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{"users": results})
	}
}
