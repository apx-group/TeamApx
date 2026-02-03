package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
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

type DiscordEmbed struct {
	Title  string       `json:"title"`
	Color  int          `json:"color"`
	Fields []EmbedField `json:"fields"`
}

type EmbedField struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Inline bool   `json:"inline"`
}

type DiscordWebhookPayload struct {
	Embeds []DiscordEmbed `json:"embeds"`
}

var webhookURL string

func main() {
	webhookURL = os.Getenv("DISCORD_WEBHOOK_URL")
	if webhookURL == "" {
		log.Fatal("DISCORD_WEBHOOK_URL environment variable is required")
	}

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

	// Periodic session cleanup
	go func() {
		for {
			time.Sleep(1 * time.Hour)
			if err := CleanExpiredSessions(db); err != nil {
				log.Printf("Session cleanup error: %v", err)
			}
		}
	}()

	// Routes
	http.HandleFunc("/api/apply", handleApply)
	http.HandleFunc("/api/auth/register", handleRegister(db))
	http.HandleFunc("/api/auth/login", handleLogin(db))
	http.HandleFunc("/api/auth/logout", handleLogout(db))
	http.HandleFunc("/api/auth/me", handleMe(db))

	addr := ":8080"
	log.Printf("Backend listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

func handleApply(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var app Application
	if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
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

	if err := sendToDiscord(app); err != nil {
		log.Printf("Discord webhook error: %v", err)
		http.Error(w, `{"error":"failed to send application"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success":true}`))
}

func sendToDiscord(app Application) error {
	fields := []EmbedField{
		{Name: "Name", Value: app.Name, Inline: true},
		{Name: "Alter", Value: fmt.Sprintf("%d", app.Age), Inline: true},
		{Name: "Discord", Value: app.Discord, Inline: true},
		{Name: "Spiel", Value: app.Game, Inline: true},
	}

	if app.Rank != "" {
		fields = append(fields, EmbedField{Name: "Rang", Value: app.Rank, Inline: true})
	}

	fields = append(fields, EmbedField{Name: "Erfahrung", Value: app.Experience, Inline: true})

	if app.AttackerRole != "" {
		fields = append(fields, EmbedField{Name: "Attacker", Value: app.AttackerRole, Inline: true})
	}
	if app.DefenderRole != "" {
		fields = append(fields, EmbedField{Name: "Defender", Value: app.DefenderRole, Inline: true})
	}

	fields = append(fields, EmbedField{Name: "Motivation", Value: app.Motivation, Inline: false})

	if app.Availability != "" {
		fields = append(fields, EmbedField{Name: "Verfügbarkeit", Value: app.Availability, Inline: false})
	}

	payload := DiscordWebhookPayload{
		Embeds: []DiscordEmbed{
			{
				Title:  "Neue Bewerbung",
				Color:  0xBEA05D, // accent color from the website
				Fields: fields,
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	resp, err := http.Post(webhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("post to discord: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("discord returned status %d", resp.StatusCode)
	}

	return nil
}
