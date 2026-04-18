package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

// Nginx config example:
//
//	location /api/ {
//	    proxy_pass http://127.0.0.1:8080;
//	    proxy_set_header Host $host;
//	    proxy_set_header X-Real-IP $remote_addr;
//	}

type Application struct {
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
}

func main() {
	loadDotEnv()

	// Optional: External API client (for APX Stats backend)
	var apx *ApxClient
	apxAPIURL := os.Getenv("APX_API_URL")
	apxAPIKey := os.Getenv("APX_API_KEY")
	if apxAPIURL != "" && apxAPIKey != "" {
		apx = NewApxClient(apxAPIURL, apxAPIKey)
	} else {
		// Create a dummy client for local-only operation
		apx = NewApxClient("http://localhost:3000", "dummy-key")
		log.Println("Running in local-only mode (APX_API_URL/APX_API_KEY not set)")
	}

	// Frontend directory – in production, point to the Vite build output (frontend/dist)
	frontendDir := os.Getenv("FRONTEND_DIR")
	if frontendDir == "" {
		frontendDir = filepath.Join("..", "..", "frontend", "dist")
	}
	frontendDir, _ = filepath.Abs(frontendDir)

	// Upload directory (lives at project root /public/uploads, outside frontend/)
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = filepath.Join("..", "..", "public", "uploads")
	}
	uploadDir, _ = filepath.Abs(uploadDir)
	for _, sub := range []string{"profile", "banner", "badge", "items"} {
		if err := os.MkdirAll(filepath.Join(uploadDir, sub), 0755); err != nil {
			log.Fatalf("Failed to create upload dir: %v", err)
		}
	}
	log.Printf("Upload directory: %s", uploadDir)

	// API routes
	http.HandleFunc("/api/team", handlePublicTeam(apx))
	http.HandleFunc("/api/staff", handlePublicStaff(apx))
	http.HandleFunc("/api/admin/users", handleAdminUsers(apx))
	http.HandleFunc("/api/apply", handleApply(apx))
	http.HandleFunc("/api/auth/register", handleRegister(apx))
	http.HandleFunc("/api/auth/verify-email", handleVerifyEmail(apx))
	http.HandleFunc("/api/auth/change-email", handleChangeEmail(apx))
	http.HandleFunc("/api/auth/verify-email-change", handleVerifyEmailChange(apx))
	http.HandleFunc("/api/auth/login", handleLogin(apx))
	http.HandleFunc("/api/auth/login-2fa", handleLoginVerify2FA(apx))
	http.HandleFunc("/api/auth/trust-devices", handle2FASettings(apx))
	http.HandleFunc("/api/auth/devices", handleDevices(apx))
	http.HandleFunc("/api/auth/logout", handleLogout(apx))
	http.HandleFunc("/api/auth/me", handleMe(apx))
	http.HandleFunc("/api/auth/my-application", handleMyApplication(apx))
	http.HandleFunc("/api/auth/profile", handleProfile(apx, uploadDir))
	http.HandleFunc("/api/auth/links", handleLinks(apx))
	http.HandleFunc("/api/auth/profile-settings", handleProfileSettings(apx))
	http.HandleFunc("/api/auth/deactivate", handleDeactivateAccount(apx))
	http.HandleFunc("/api/auth/delete", handleDeleteAccount(apx))
	http.HandleFunc("/api/user", handleAdminPublicUser(apx))
	http.HandleFunc("/api/users/search", handleUserSearch(apx))
	http.HandleFunc("/auth/discord", handleDiscordOAuth(apx))
	http.HandleFunc("/auth/discord/callback", handleDiscordCallback(apx))
	http.HandleFunc("/auth/challengermode", handleChallengerModeOAuth(apx))
	http.HandleFunc("/auth/challengermode/callback", handleChallengerModeCallback(apx))
	http.HandleFunc("/auth/twitch", handleTwitchOAuth(apx))
	http.HandleFunc("/auth/twitch/callback", handleTwitchCallback(apx))
	http.HandleFunc("/auth/youtube", handleYouTubeOAuth(apx))
	http.HandleFunc("/auth/youtube/callback", handleYouTubeCallback(apx))
	http.HandleFunc("/api/admin/applications", handleAdminApplications(apx))
	http.HandleFunc("/api/admin/team", handleAdminTeam(apx))
	http.HandleFunc("/api/admin/staff", handleAdminStaff(apx))
	http.HandleFunc("/api/admin/user/nickname", handleAdminUserNickname(apx))
	http.HandleFunc("/api/admin/verify-master", handleAdminVerifyMaster(apx))
	http.HandleFunc("/api/admin/users/", handleAdminUserActions(apx))
	http.HandleFunc("/api/badges", handleUserBadges(apx))
	http.HandleFunc("/api/admin/badges", handleAdminBadges(apx))
	http.HandleFunc("/api/admin/user-badges", handleAdminUserBadges(apx))
	http.HandleFunc("/api/admin/badges/image", handleAdminBadgeImage(apx, uploadDir))
	http.HandleFunc("/api/admin/items", handleAdminItems(apx, uploadDir))
	http.HandleFunc("/api/admin/items/image", handleAdminItemImage(apx, uploadDir))
	http.HandleFunc("/api/log", handleLog(apx))
	http.HandleFunc("/api/admin/log", handleAdminLog(apx))
	http.HandleFunc("/api/items/my", handleMyItems(apx))

	// Events
	http.HandleFunc("/api/events", handlePublicEvents(apx))
	http.HandleFunc("/api/events/", handleEventRoutes(apx))
	http.HandleFunc("/api/admin/events", handleAdminEvents(apx))

	// Twitch live status
	http.HandleFunc("/api/twitch/live", handleTwitchLiveStatus)

	// Progression — public (Website → Go)
	http.HandleFunc("/api/progression/profile", handleProgressionProfile(apx))
	http.HandleFunc("/api/progression/leaderboard", handleProgressionLeaderboard(apx))
	http.HandleFunc("/api/progression/me", handleProgressionMe(apx))

	// Progression — internal (Bot → Go, secured via X-Api-Key header)
	http.HandleFunc("/api/internal/progression/user-sync", handleInternalUserSync(apx))
	http.HandleFunc("/api/internal/progression/inventory-add", handleInternalInventoryAdd(apx))
	http.HandleFunc("/api/internal/progression/inventory-remove", handleInternalInventoryRemove(apx))
	http.HandleFunc("/api/internal/progression/inventory-equip", handleInternalInventoryEquip(apx))
	http.HandleFunc("/api/internal/progression/role-sync", handleInternalRoleSync(apx))

	// Serve uploaded files at /public/uploads/...
	publicDir := filepath.Dir(uploadDir) // …/public
	http.Handle("/public/", http.StripPrefix("/public/", http.FileServer(http.Dir(publicDir))))

	// Proxy /dashboard/api/ → APX Stats backend
	statsBackendURL, _ := url.Parse("http://apx-stats-backend:8080")
	statsProxy := httputil.NewSingleHostReverseProxy(statsBackendURL)
	http.Handle("/dashboard/api/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, "/dashboard")
		statsProxy.ServeHTTP(w, r)
	}))

	// Serve frontend files; fall back to /pages/<path> for clean URLs
	http.Handle("/", frontendHandler(frontendDir))
	log.Printf("Serving frontend from %s", frontendDir)

	addr := ":8080"
	log.Printf("Backend listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

func enrichTeamAvatars(members []TeamMember, apx *ApxClient) {
	for i := range members {
		members[i].AvatarURL = apx.GetUserAvatarByUsername(members[i].Username)
		if members[i].Username != "" {
			if nick := apx.GetUserNicknameByUsername(members[i].Username); nick != "" {
				members[i].Name = nick
			}
		}
	}
}

func enrichStaffAvatars(staff []StaffMember, apx *ApxClient) {
	for i := range staff {
		staff[i].AvatarURL = apx.GetUserAvatarByUsername(staff[i].Username)
		if staff[i].Username != "" {
			if nick := apx.GetUserNicknameByUsername(staff[i].Username); nick != "" {
				staff[i].Name = nick
			}
		}
	}
}

func handlePublicTeam(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		members, err := apx.GetTeamMembers()
		if err != nil {
			log.Printf("Failed to get team members: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		enrichTeamAvatars(members, apx)
		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"members": members,
		})
	}
}

func handlePublicStaff(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		staff, err := apx.GetStaffMembers()
		if err != nil {
			log.Printf("Failed to get staff: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if staff == nil {
			staff = []StaffMember{}
		}
		enrichStaffAvatars(staff, apx)
		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"staff": staff,
		})
	}
}

func handleAdminUsers(apx *ApxClient) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		if !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}
		usernames, err := apx.GetAllUsernames()
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if usernames == nil {
			usernames = []string{}
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"usernames": usernames})
	}
}

func handleAdminStaff(apx *ApxClient) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		if !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		switch r.Method {
		case http.MethodGet:
			staff, err := apx.GetStaffMembers()
			if err != nil {
				log.Printf("Failed to get staff: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if staff == nil {
				staff = []StaffMember{}
			}
			enrichStaffAvatars(staff, apx)
			jsonResponse(w, http.StatusOK, map[string]interface{}{"staff": staff})

		case http.MethodPost:
			var req struct {
				Name     string `json:"name"`
				Role     string `json:"role"`
				Username string `json:"username"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			req.Name = strings.TrimSpace(req.Name)
			if req.Name == "" {
				jsonError(w, http.StatusBadRequest, "name required")
				return
			}
			validRoles := map[string]bool{"Coach": true, "Analyst": true, "Manager": true, "Sub": true}
			if !validRoles[req.Role] {
				jsonError(w, http.StatusBadRequest, "invalid role")
				return
			}
			id, err := apx.AddStaffMember(req.Name, req.Role, strings.TrimSpace(req.Username))
			if err != nil {
				log.Printf("Failed to add staff: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusCreated, map[string]interface{}{"id": id, "success": true})

		case http.MethodPut:
			var req struct {
				ID       int64  `json:"id"`
				Name     string `json:"name"`
				Role     string `json:"role"`
				Username string `json:"username"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if req.ID == 0 {
				jsonError(w, http.StatusBadRequest, "id required")
				return
			}
			validRoles := map[string]bool{"Coach": true, "Analyst": true, "Manager": true, "Sub": true}
			if req.Role != "" && !validRoles[req.Role] {
				jsonError(w, http.StatusBadRequest, "invalid role")
				return
			}
			if err := apx.UpdateStaffMember(req.ID, strings.TrimSpace(req.Name), req.Role, strings.TrimSpace(req.Username)); err != nil {
				log.Printf("Failed to update staff: %v", err)
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
			if err := apx.DeleteStaffMember(req.ID); err != nil {
				log.Printf("Failed to delete staff: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

func handleApply(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

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
			jsonError(w, http.StatusUnauthorized, "Bitte zuerst einloggen")
			return
		}
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Bitte zuerst einloggen")
			return
		}

		var app Application
		if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		var missing []string
		name := strings.TrimSpace(app.Name)
		if name == "" {
			missing = append(missing, "name")
		} else if len([]rune(name)) > 20 {
			missing = append(missing, "name (max 20 Zeichen)")
		}
		if app.Age < 13 || app.Age > 30 {
			missing = append(missing, "age (13–30)")
		}
		discord := strings.TrimSpace(app.Discord)
		if len([]rune(discord)) < 2 || len([]rune(discord)) > 20 {
			missing = append(missing, "discord (2–20 Zeichen)")
		}
		if strings.TrimSpace(app.Game) == "" {
			missing = append(missing, "game")
		}
		if strings.TrimSpace(app.Rank) == "" {
			missing = append(missing, "rank")
		}
		if strings.TrimSpace(app.AttackerRole) == "" {
			missing = append(missing, "attacker_role")
		}
		if strings.TrimSpace(app.DefenderRole) == "" {
			missing = append(missing, "defender_role")
		}
		if strings.TrimSpace(app.Experience) == "" {
			missing = append(missing, "experience")
		}
		if strings.TrimSpace(app.Motivation) == "" {
			missing = append(missing, "motivation")
		}

		if len(missing) > 0 {
			msg := fmt.Sprintf(`{"error":"missing required fields: %s"}`, strings.Join(missing, ", "))
			http.Error(w, msg, http.StatusBadRequest)
			return
		}

		record := ApplicationRecord{
			UserID:       user.ID,
			Name:         app.Name,
			Age:          app.Age,
			Discord:      app.Discord,
			Game:         app.Game,
			Rank:         app.Rank,
			AttackerRole: app.AttackerRole,
			DefenderRole: app.DefenderRole,
			Experience:   app.Experience,
			Motivation:   app.Motivation,
			Availability: app.Availability,
		}
		if _, err := apx.CreateApplication(record); err != nil {
			log.Printf("CreateApplication error: %v", err)
			jsonError(w, http.StatusInternalServerError, "failed to save application")
			return
		}

		jsonResponse(w, http.StatusOK, map[string]bool{"success": true})
	}
}

func handleMyApplication(apx *ApxClient) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		switch r.Method {
		case http.MethodGet:
			app, err := apx.GetApplicationByUserID(user.ID)
			if err != nil {
				jsonResponse(w, http.StatusOK, map[string]interface{}{"application": nil})
				return
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"application": app})

		case http.MethodPut:
			var update Application
			if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}

			record := ApplicationRecord{
				Name:         update.Name,
				Age:          update.Age,
				Discord:      update.Discord,
				Game:         update.Game,
				Rank:         update.Rank,
				AttackerRole: update.AttackerRole,
				DefenderRole: update.DefenderRole,
				Experience:   update.Experience,
				Motivation:   update.Motivation,
				Availability: update.Availability,
			}
			if err := apx.UpdateApplicationByUserID(user.ID, record); err != nil {
				log.Printf("Update application error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

// handleLinks serves GET /api/auth/links, POST /api/auth/links, DELETE /api/auth/links
func handleLinks(apx *ApxClient) http.HandlerFunc {
	validServices := map[string]bool{
		"discord":        true,
		"challengermode": true,
		"twitch":         true,
		"youtube":        true,
	}
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
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		switch r.Method {
		case http.MethodGet:
			accounts, err := apx.GetLinkedAccounts(user.ID)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if accounts == nil {
				accounts = []LinkedAccount{}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"links": accounts})

		case http.MethodPost:
			var req struct {
				Service  string `json:"service"`
				Username string `json:"username"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			req.Service = strings.TrimSpace(req.Service)
			req.Username = strings.TrimSpace(req.Username)
			if !validServices[req.Service] {
				jsonError(w, http.StatusBadRequest, "invalid service")
				return
			}
			if req.Username == "" {
				jsonError(w, http.StatusBadRequest, "username required")
				return
			}
			if err := apx.UpsertLinkedAccount(user.ID, req.Service, "", req.Username, "", ""); err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		case http.MethodDelete:
			service := r.URL.Query().Get("service")
			if !validServices[service] {
				jsonError(w, http.StatusBadRequest, "invalid service")
				return
			}
			if err := apx.DeleteLinkedAccount(user.ID, service); err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

func handleAdminApplications(apx *ApxClient) http.HandlerFunc {
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

		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		if !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		apps, err := apx.GetApplications()
		if err != nil {
			log.Printf("Failed to get applications: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"applications": apps,
		})
	}
}

func handleAdminUserNickname(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
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
		username := r.URL.Query().Get("username")
		nickname := apx.GetUserNicknameByUsername(username)
		jsonResponse(w, http.StatusOK, map[string]string{"nickname": nickname})
	}
}

func handleAdminTeam(apx *ApxClient) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		if !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		switch r.Method {
		case http.MethodPost:
			var req struct {
				Name         string `json:"name"`
				Username     string `json:"username"`
				AtkRole      string `json:"atk_role"`
				DefRole      string `json:"def_role"`
				IsMainRoster bool   `json:"is_main_roster"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			req.Name = strings.TrimSpace(req.Name)
			if req.Name == "" {
				jsonError(w, http.StatusBadRequest, "name required")
				return
			}
			if req.IsMainRoster {
				count, _ := apx.CountMainRoster(0)
				if count >= 5 {
					jsonError(w, http.StatusBadRequest, "Maximal 5 Main Roster Spieler erlaubt")
					return
				}
			}
			id, err := apx.AddTeamMember(req.Name, req.Username, req.AtkRole, req.DefRole, req.IsMainRoster)
			if err != nil {
				log.Printf("Failed to add team member: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusCreated, map[string]interface{}{"id": id, "success": true})

		case http.MethodGet:
			members, err := apx.GetTeamMembers()
			if err != nil {
				log.Printf("Failed to get team members: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			enrichTeamAvatars(members, apx)
			jsonResponse(w, http.StatusOK, map[string]interface{}{
				"members": members,
			})

		case http.MethodPut:
			var m TeamMember
			if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if m.ID == 0 {
				jsonError(w, http.StatusBadRequest, "missing player id")
				return
			}
			if m.IsMainRoster {
				count, _ := apx.CountMainRoster(m.ID)
				if count >= 5 {
					jsonError(w, http.StatusBadRequest, "Maximal 5 Main Roster Spieler erlaubt")
					return
				}
			}
			ratingFields := []*int{
				&m.KillEntry, &m.KillTrade, &m.KillImpact, &m.KillLate,
				&m.DeathEntry, &m.DeathTrade, &m.DeathLate,
				&m.Clutch1v1, &m.Clutch1v2, &m.Clutch1v3, &m.Clutch1v4, &m.Clutch1v5,
				&m.ObjPlant, &m.ObjDefuse,
			}
			for _, f := range ratingFields {
				if *f < 0 {
					*f = 0
				}
			}
			if err := apx.UpdateTeamMember(m); err != nil {
				log.Printf("Failed to update team member: %v", err)
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
			if err := apx.DeleteTeamMember(req.ID); err != nil {
				log.Printf("Failed to delete team member: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

// frontendHandler serves the React SPA (Vite build output).
func frontendHandler(root string) http.Handler {
	dir := http.Dir(root)
	fileServer := http.FileServer(dir)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f, err := dir.Open(r.URL.Path)
		if err == nil {
			stat, statErr := f.Stat()
			f.Close()
			if statErr == nil && !stat.IsDir() {
				fileServer.ServeHTTP(w, r)
				return
			}
		}
		indexFile, err := dir.Open("/index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusInternalServerError)
			return
		}
		defer indexFile.Close()
		stat, err := indexFile.Stat()
		if err != nil {
			http.Error(w, "stat failed", http.StatusInternalServerError)
			return
		}
		http.ServeContent(w, r, "index.html", stat.ModTime(), indexFile.(io.ReadSeeker))
	})
}

// loadDotEnv lädt ../.env (relativ zum Backend-Verzeichnis) und setzt
// fehlende Env-Vars. Bereits gesetzte Vars werden nicht überschrieben.
func loadDotEnv() {
	candidates := []string{"../../.env", "../.env", ".env"}
	var data []byte
	var err error
	for _, p := range candidates {
		abs, _ := filepath.Abs(p)
		data, err = os.ReadFile(abs)
		if err == nil {
			log.Printf("Loaded env from %s", abs)
			break
		}
	}
	if err != nil {
		return
	}

	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.IndexByte(line, '=')
		if idx < 0 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		val := strings.TrimSpace(line[idx+1:])

		if i := strings.Index(val, " #"); i >= 0 {
			val = strings.TrimSpace(val[:i])
		}

		if len(val) >= 2 {
			if (val[0] == '"' && val[len(val)-1] == '"') ||
				(val[0] == '\'' && val[len(val)-1] == '\'') {
				val = val[1 : len(val)-1]
			}
		}

		if key != "" && os.Getenv(key) == "" {
			os.Setenv(key, val)
		}
	}
}
