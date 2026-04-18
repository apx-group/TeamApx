package main

import (
	"log"
	"net/http"
)

// GET /api/user?u=<username>  (also used as handleAdminPublicUser via separate route)
func handlePublicUser(apx *ApxClient) http.HandlerFunc {
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

		u, err := apx.GetUserByUsername(username)
		if err != nil {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}

		links, err := apx.GetLinkedAccounts(u.ID)
		if err != nil {
			log.Printf("handlePublicUser GetLinkedAccounts: %v", err)
			links = nil
		}

		// Fetch live Discord roles via bot token
		discordRoles := []string{}
		for _, link := range links {
			if link.Service == "discord" && link.ServiceID != "" {
				if memberRoles, err := fetchGuildMemberRolesByBot(link.ServiceID); err == nil && memberRoles != nil {
					discordRoles = matchDiscordDisplayRoles(memberRoles)
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
				Service: l.Service, Username: l.Username,
				AvatarURL: l.AvatarURL, ProfileURL: l.ProfileURL,
			})
		}

		type publicBadge struct {
			Name     string `json:"name"`
			ImageURL string `json:"image_url"`
			Level    int    `json:"level"`
			MaxLevel int    `json:"max_level"`
		}
		pubBadges := []publicBadge{}
		if userBadges, err := apx.GetUserBadges(u.ID); err == nil {
			for _, b := range userBadges {
				if b.Owned {
					pubBadges = append(pubBadges, publicBadge{b.Name, b.ImageURL, b.Level, b.MaxLevel})
				}
			}
		}

		resp := map[string]interface{}{
			"username":        u.Username,
			"nickname":        u.Nickname,
			"avatar_url":      u.AvatarURL,
			"banner_url":      u.BannerURL,
			"links":           pubLinks,
			"badges":          pubBadges,
			"created_at":      u.CreatedAt,
			"bio":             u.Bio,
			"show_local_time": u.ShowLocalTime,
			"discord_roles":   discordRoles,
		}
		if u.Timezone != "" {
			resp["timezone"] = u.Timezone
		}
		jsonResponse(w, http.StatusOK, resp)
	}
}

// GET /api/users/search?q=<query>
func handleUserSearch(apx *ApxClient) http.HandlerFunc {
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

		users, err := apx.SearchUsers(q)
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
				Username: u.Username, Nickname: u.Nickname, AvatarURL: u.AvatarURL,
			})
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{"users": results})
	}
}
