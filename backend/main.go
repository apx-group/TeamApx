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
	// Initialize User-Datenbank (users, sessions, applications)
	userDBPath := os.Getenv("USER_DB_PATH")
	if userDBPath == "" {
		userDBPath = "./users.db"
	}
	userDB, err := InitUserDB(userDBPath)
	if err != nil {
		log.Fatalf("Failed to initialize user database: %v", err)
	}
	defer userDB.Close()

	// Initialize Data-Datenbank (team/Spielerstatistiken)
	dataDBPath := os.Getenv("DATA_DB_PATH")
	if dataDBPath == "" {
		dataDBPath = "./data.db"
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
		}
	}()

	// Frontend directory
	frontendDir := os.Getenv("FRONTEND_DIR")
	if frontendDir == "" {
		frontendDir = filepath.Join(".", "..")
	}
	frontendDir, _ = filepath.Abs(frontendDir)

	// Upload directory
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = filepath.Join(frontendDir, "public", "uploads")
	}
	for _, sub := range []string{"profile", "banner"} {
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
	http.HandleFunc("/api/auth/logout", handleLogout(userDB))
	http.HandleFunc("/api/auth/me", handleMe(userDB))
	http.HandleFunc("/api/auth/my-application", handleMyApplication(userDB))
	http.HandleFunc("/api/auth/profile", handleProfile(userDB, uploadDir))
	http.HandleFunc("/api/admin/applications", handleAdminApplications(userDB))
	http.HandleFunc("/api/admin/team", handleAdminTeam(userDB, dataDB))
	http.HandleFunc("/api/admin/staff", handleAdminStaff(userDB, dataDB))
	http.HandleFunc("/api/admin/user/nickname", handleAdminUserNickname(userDB))

	// Serve frontend files
	fs := http.FileServer(http.Dir(frontendDir))
	http.Handle("/", fs)
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
