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
	// Initialize SQLite database
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./teamapx.db"
	}

	db, err := InitDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

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
	if err := EnsureAdminUser(db, string(hashedAdminPw)); err != nil {
		log.Fatalf("Failed to create admin user: %v", err)
	}
	log.Println("Admin user 'admin' ready")

	// Seed team players
	if err := EnsureTeamPlayers(db); err != nil {
		log.Fatalf("Failed to seed team players: %v", err)
	}
	log.Println("Team players ready")

	// Periodic session cleanup
	go func() {
		for {
			time.Sleep(1 * time.Hour)
			if err := CleanExpiredSessions(db); err != nil {
				log.Printf("Session cleanup error: %v", err)
			}
		}
	}()

	// API routes
	http.HandleFunc("/api/apply", handleApply(db))
	http.HandleFunc("/api/auth/register", handleRegister(db))
	http.HandleFunc("/api/auth/login", handleLogin(db))
	http.HandleFunc("/api/auth/logout", handleLogout(db))
	http.HandleFunc("/api/auth/me", handleMe(db))
	http.HandleFunc("/api/auth/my-application", handleMyApplication(db))
	http.HandleFunc("/api/admin/applications", handleAdminApplications(db))
	http.HandleFunc("/api/admin/team", handleAdminTeam(db))

	// Serve frontend files
	frontendDir := os.Getenv("FRONTEND_DIR")
	if frontendDir == "" {
		// Default: parent directory of backend/
		frontendDir = filepath.Join(".", "..")
	}
	frontendDir, _ = filepath.Abs(frontendDir)
	fs := http.FileServer(http.Dir(frontendDir))
	http.Handle("/", fs)
	log.Printf("Serving frontend from %s", frontendDir)

	addr := ":8080"
	log.Printf("Backend listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
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

func handleAdminTeam(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Auth check
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

		switch r.Method {
		case http.MethodGet:
			members, err := GetTeamMembers(db)
			if err != nil {
				log.Printf("Failed to get team members: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
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
			if err := UpdateTeamMember(db, m); err != nil {
				log.Printf("Failed to update team member: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}
