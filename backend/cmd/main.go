package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
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
	AttackerRole string `json:"attacker-role"`
	DefenderRole string `json:"defender-role"`
	Experience   string `json:"experience"`
	Motivation   string `json:"motivation"`
	Availability string `json:"availability"`
}

func main() {
	loadDotEnv()

	// Initialize User-Datenbank (users, sessions, applications)
	userDBPath := os.Getenv("USER_DB_PATH")
	if userDBPath == "" {
		userDBPath = "../users.db"
	}
	userDB, err := InitUserDB(userDBPath)
	if err != nil {
		log.Fatalf("Failed to initialize user database: %v", err)
	}
	defer userDB.Close()

	// Initialize Data-Datenbank (team/Spielerstatistiken)
	dataDBPath := os.Getenv("DATA_DB_PATH")
	if dataDBPath == "" {
		dataDBPath = "../data.db"
	}
	dataDB, err := InitDataDB(dataDBPath)
	if err != nil {
		log.Fatalf("Failed to initialize data database: %v", err)
	}
	defer dataDB.Close()

	// Seed admin user
	adminPw := os.Getenv("ADMIN_PASSWORD")
	if adminPw == "" {
		adminPw = "admin1234"
		log.Println("WARNING: No ADMIN_PASSWORD set, using default 'admin1234'")
	}
	hashedAdminPw, err := bcrypt.GenerateFromPassword([]byte(adminPw), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash admin password: %v", err)
	}
	if err := EnsureAdminUser(userDB, string(hashedAdminPw)); err != nil {
		log.Fatalf("Failed to create admin user: %v", err)
	}
	log.Println("Admin user 'admin' ready")

	// Seed team players
	if err := EnsureTeamPlayers(dataDB); err != nil {
		log.Fatalf("Failed to seed team players: %v", err)
	}
	log.Println("Team players ready")

	// Periodic cleanup
	go func() {
		for {
			time.Sleep(1 * time.Hour)
			if err := CleanExpiredSessions(userDB); err != nil {
				log.Printf("Session cleanup error: %v", err)
			}
			if err := CleanExpiredVerifications(userDB); err != nil {
				log.Printf("Verification cleanup error: %v", err)
			}
			if err := CleanExpiredEmailChangeRequests(userDB); err != nil {
				log.Printf("Email change cleanup error: %v", err)
			}
			if err := CleanExpiredOAuthStates(userDB); err != nil {
				log.Printf("OAuth state cleanup error: %v", err)
			}
			if err := CleanExpiredTrustedDevices(userDB); err != nil {
				log.Printf("Trusted devices cleanup error: %v", err)
			}
			if err := CleanExpiredLogin2FAPending(userDB); err != nil {
				log.Printf("2FA pending cleanup error: %v", err)
			}
		}
	}()

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
	for _, sub := range []string{"profile", "banner", "badge"} {
		if err := os.MkdirAll(filepath.Join(uploadDir, sub), 0755); err != nil {
			log.Fatalf("Failed to create upload dir: %v", err)
		}
	}
	log.Printf("Upload directory: %s", uploadDir)

	// API routes
	http.HandleFunc("/api/team", handlePublicTeam(userDB, dataDB))
	http.HandleFunc("/api/staff", handlePublicStaff(userDB, dataDB))
	http.HandleFunc("/api/admin/users", handleAdminUsers(userDB))
	http.HandleFunc("/api/apply", handleApply(userDB))
	http.HandleFunc("/api/auth/register", handleRegister(userDB))
	http.HandleFunc("/api/auth/verify-email", handleVerifyEmail(userDB))
	http.HandleFunc("/api/auth/change-email", handleChangeEmail(userDB))
	http.HandleFunc("/api/auth/verify-email-change", handleVerifyEmailChange(userDB))
	http.HandleFunc("/api/auth/login", handleLogin(userDB))
	http.HandleFunc("/api/auth/login-2fa", handleLoginVerify2FA(userDB))
	http.HandleFunc("/api/auth/trust-devices", handle2FASettings(userDB))
	http.HandleFunc("/api/auth/devices", handleDevices(userDB))
	http.HandleFunc("/api/auth/logout", handleLogout(userDB))
	http.HandleFunc("/api/auth/me", handleMe(userDB))
	http.HandleFunc("/api/auth/my-application", handleMyApplication(userDB))
	http.HandleFunc("/api/auth/profile", handleProfile(userDB, uploadDir))
	http.HandleFunc("/api/auth/links", handleLinks(userDB))
	http.HandleFunc("/api/auth/deactivate", handleDeactivateAccount(userDB))
	http.HandleFunc("/api/auth/delete", handleDeleteAccount(userDB))
	http.HandleFunc("/api/user", handleAdminPublicUser(userDB))
	http.HandleFunc("/api/users/search", handleUserSearch(userDB))
	http.HandleFunc("/auth/discord", handleDiscordOAuth(userDB))
	http.HandleFunc("/auth/discord/callback", handleDiscordCallback(userDB))
	http.HandleFunc("/auth/challengermode", handleChallengerModeOAuth(userDB))
	http.HandleFunc("/auth/challengermode/callback", handleChallengerModeCallback(userDB))
	http.HandleFunc("/auth/twitch", handleTwitchOAuth(userDB))
	http.HandleFunc("/auth/twitch/callback", handleTwitchCallback(userDB))
	http.HandleFunc("/api/admin/applications", handleAdminApplications(userDB))
	http.HandleFunc("/api/admin/team", handleAdminTeam(userDB, dataDB))
	http.HandleFunc("/api/admin/staff", handleAdminStaff(userDB, dataDB))
	http.HandleFunc("/api/admin/user/nickname", handleAdminUserNickname(userDB))
	http.HandleFunc("/api/admin/verify-master", handleAdminVerifyMaster(userDB))
	http.HandleFunc("/api/admin/users/", handleAdminUserActions(userDB))
	http.HandleFunc("/api/badges", handleUserBadges(userDB))
	http.HandleFunc("/api/admin/badges", handleAdminBadges(userDB))
	http.HandleFunc("/api/admin/user-badges", handleAdminUserBadges(userDB))
	http.HandleFunc("/api/admin/badges/image", handleAdminBadgeImage(userDB, uploadDir))

	// Serve uploaded files at /public/uploads/...
	publicDir := filepath.Dir(uploadDir) // …/public
	http.Handle("/public/", http.StripPrefix("/public/", http.FileServer(http.Dir(publicDir))))

	// Serve frontend files; fall back to /pages/<path> for clean URLs
	http.Handle("/", frontendHandler(frontendDir))
	log.Printf("Serving frontend from %s", frontendDir)

	addr := ":8080"
	log.Printf("Backend listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

func enrichTeamAvatars(members []TeamMember, userDB *sql.DB) {
	for i := range members {
		members[i].AvatarURL = GetUserAvatarByUsername(userDB, members[i].Username)
		if members[i].Username != "" {
			if nick := GetUserNicknameByUsername(userDB, members[i].Username); nick != "" {
				members[i].Name = nick
			}
		}
	}
}

func enrichStaffAvatars(staff []StaffMember, userDB *sql.DB) {
	for i := range staff {
		staff[i].AvatarURL = GetUserAvatarByUsername(userDB, staff[i].Username)
		if staff[i].Username != "" {
			if nick := GetUserNicknameByUsername(userDB, staff[i].Username); nick != "" {
				staff[i].Name = nick
			}
		}
	}
}

func handlePublicTeam(userDB, dataDB *sql.DB) http.HandlerFunc {
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
		members, err := GetTeamMembers(dataDB)
		if err != nil {
			log.Printf("Failed to get team members: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		enrichTeamAvatars(members, userDB)
		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"members": members,
		})
	}
}

func handlePublicStaff(userDB, dataDB *sql.DB) http.HandlerFunc {
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
		staff, err := GetStaffMembers(dataDB)
		if err != nil {
			log.Printf("Failed to get staff: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if staff == nil {
			staff = []StaffMember{}
		}
		enrichStaffAvatars(staff, userDB)
		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"staff": staff,
		})
	}
}

func handleAdminUsers(userDB *sql.DB) http.HandlerFunc {
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
		user, err := GetSessionUser(userDB, cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		if !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}
		usernames, err := GetAllUsernames(userDB)
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

func handleAdminStaff(userDB, dataDB *sql.DB) http.HandlerFunc {
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
		user, err := GetSessionUser(userDB, cookie.Value)
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
			staff, err := GetStaffMembers(dataDB)
			if err != nil {
				log.Printf("Failed to get staff: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if staff == nil {
				staff = []StaffMember{}
			}
			enrichStaffAvatars(staff, userDB)
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
			validRoles := map[string]bool{"Coach": true, "Analyst": true, "Manager": true}
			if !validRoles[req.Role] {
				jsonError(w, http.StatusBadRequest, "invalid role")
				return
			}
			id, err := AddStaffMember(dataDB, req.Name, req.Role, strings.TrimSpace(req.Username))
			if err != nil {
				log.Printf("Failed to add staff: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusCreated, map[string]interface{}{"id": id, "success": true})

		case http.MethodPut:
			var req struct {
				ID       int64  `json:"id"`
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
			validRoles := map[string]bool{"Coach": true, "Analyst": true, "Manager": true}
			if req.Role != "" && !validRoles[req.Role] {
				jsonError(w, http.StatusBadRequest, "invalid role")
				return
			}
			if err := UpdateStaffMember(dataDB, req.ID, req.Role, strings.TrimSpace(req.Username)); err != nil {
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
			if err := DeleteStaffMember(dataDB, req.ID); err != nil {
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

func handleApply(db *sql.DB) http.HandlerFunc {
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

		// Require login
		cookie, err := r.Cookie("session")
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Bitte zuerst einloggen")
			return
		}
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Bitte zuerst einloggen")
			return
		}

		var app Application
		if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		// Validate required fields
		var missing []string
		if strings.TrimSpace(app.Name) == "" {
			missing = append(missing, "name")
		}
		if app.Age < 13 || app.Age > 99 {
			missing = append(missing, "age")
		}
		if strings.TrimSpace(app.Discord) == "" {
			missing = append(missing, "discord")
		}
		if strings.TrimSpace(app.Game) == "" {
			missing = append(missing, "game")
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

		// Store in database
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
		if _, err := CreateApplication(db, record); err != nil {
			log.Printf("DB insert error: %v", err)
			jsonError(w, http.StatusInternalServerError, "failed to save application")
			return
		}

		jsonResponse(w, http.StatusOK, map[string]bool{"success": true})
	}
}

func handleMyApplication(db *sql.DB) http.HandlerFunc {
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
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		switch r.Method {
		case http.MethodGet:
			app, err := GetApplicationByUserID(db, user.ID)
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
			if err := UpdateApplicationByUserID(db, user.ID, record); err != nil {
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
func handleLinks(db *sql.DB) http.HandlerFunc {
	validServices := map[string]bool{
		"discord":        true,
		"challengermode": true,
		"twitch":         true,
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
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		switch r.Method {
		case http.MethodGet:
			accounts, err := GetLinkedAccounts(db, user.ID)
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
			if err := UpsertLinkedAccount(db, user.ID, req.Service, "", req.Username, ""); err != nil {
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
			if err := DeleteLinkedAccount(db, user.ID, service); err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

func handleAdminApplications(db *sql.DB) http.HandlerFunc {
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

		if !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		apps, err := GetApplications(db)
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

func handleAdminUserNickname(userDB *sql.DB) http.HandlerFunc {
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
		user, err := GetSessionUser(userDB, cookie.Value)
		if err != nil || !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}
		username := r.URL.Query().Get("username")
		nickname := GetUserNicknameByUsername(userDB, username)
		jsonResponse(w, http.StatusOK, map[string]string{"nickname": nickname})
	}
}

func handleAdminTeam(userDB, dataDB *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Auth check gegen userDB
		cookie, err := r.Cookie("session")
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		user, err := GetSessionUser(userDB, cookie.Value)
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
				count, _ := CountMainRoster(dataDB, 0)
				if count >= 5 {
					jsonError(w, http.StatusBadRequest, "Maximal 5 Main Roster Spieler erlaubt")
					return
				}
			}
			id, err := AddTeamMember(dataDB, req.Name, req.Username, req.AtkRole, req.DefRole, req.IsMainRoster)
			if err != nil {
				log.Printf("Failed to add team member: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusCreated, map[string]interface{}{"id": id, "success": true})

		case http.MethodGet:
			members, err := GetTeamMembers(dataDB)
			if err != nil {
				log.Printf("Failed to get team members: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			enrichTeamAvatars(members, userDB)
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
			if m.Kills < 0 {
				m.Kills = 0
			}
			if m.Deaths < 0 {
				m.Deaths = 0
			}
			if m.Rounds < 0 {
				m.Rounds = 0
			}
			if m.KostPoints < 0 {
				m.KostPoints = 0
			}
			// Max 5 Main Roster check
			if m.IsMainRoster {
				count, _ := CountMainRoster(dataDB, m.ID)
				if count >= 5 {
					jsonError(w, http.StatusBadRequest, "Maximal 5 Main Roster Spieler erlaubt")
					return
				}
			}
			// Clamp rating detail fields
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
			if err := UpdateTeamMember(dataDB, m); err != nil {
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
			if err := DeleteTeamMember(dataDB, req.ID); err != nil {
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
// Static assets are served directly; all other paths fall back to index.html
// so that React Router can handle client-side navigation.
func frontendHandler(root string) http.Handler {
	dir := http.Dir(root)
	fileServer := http.FileServer(dir)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to open the requested path as a real file/directory
		f, err := dir.Open(r.URL.Path)
		if err == nil {
			stat, statErr := f.Stat()
			f.Close()
			// Serve real files directly; for directories that are not /,
			// also fall through to index.html (SPA handles routes).
			if statErr == nil && !stat.IsDir() {
				fileServer.ServeHTTP(w, r)
				return
			}
		}
		// SPA fallback – serve index.html and let React Router take over
		r2 := r.Clone(r.Context())
		r2.URL.Path = "/index.html"
		fileServer.ServeHTTP(w, r2)
	})
}

// loadDotEnv lädt ../.env (relativ zum Backend-Verzeichnis) und setzt
// fehlende Env-Vars. Bereits gesetzte Vars werden nicht überschrieben.
// Inline-Kommentare (# ...) werden entfernt.
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

		// Inline-Kommentar entfernen
		if i := strings.Index(val, " #"); i >= 0 {
			val = strings.TrimSpace(val[:i])
		}

		// Anführungszeichen entfernen
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
