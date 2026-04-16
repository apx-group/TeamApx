package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Event represents a single team event/tournament.
type Event struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Status           string `json:"status"`
	Date             string `json:"date"`
	DurationDe       string `json:"duration_de"`
	DurationEn       string `json:"duration_en"`
	DescriptionDe    string `json:"description_de"`
	DescriptionEn    string `json:"description_en"`
	MaxParticipants  int    `json:"max_participants"`
	ParticipantCount int    `json:"participant_count"`
	IsJoined         bool   `json:"is_joined"`
	CreatedAt        string `json:"created_at"`
}

// EventParticipant represents a user who has joined an event.
type EventParticipant struct {
	UserID    int64  `json:"user_id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
	JoinedAt  string `json:"joined_at"`
}

func scanEvent(row interface {
	Scan(...any) error
}) (Event, error) {
	var ev Event
	var d time.Time
	var createdAt time.Time
	err := row.Scan(
		&ev.ID, &ev.Name, &ev.Status, &d,
		&ev.DurationDe, &ev.DurationEn,
		&ev.DescriptionDe, &ev.DescriptionEn,
		&ev.MaxParticipants, &createdAt,
		&ev.ParticipantCount,
	)
	if err != nil {
		return ev, err
	}
	ev.Date = d.Format("2006-01-02")
	ev.CreatedAt = createdAt.Format(time.RFC3339)
	return ev, nil
}

const eventSelectSQL = `
	SELECT e.id, e.name, e.status, e.date,
	       e.duration_de, e.duration_en,
	       e.description_de, e.description_en,
	       e.max_participants, e.created_at,
	       COUNT(ep.user_id) AS participant_count
	FROM apx_events e
	LEFT JOIN apx_event_participants ep ON ep.event_id = e.id`

func GetAllEvents(db *sql.DB) ([]Event, error) {
	rows, err := db.Query(eventSelectSQL + `
		GROUP BY e.id
		ORDER BY e.date DESC, e.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var events []Event
	for rows.Next() {
		ev, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, ev)
	}
	return events, rows.Err()
}

func GetEventByID(db *sql.DB, id string) (*Event, error) {
	row := db.QueryRow(eventSelectSQL+`
		WHERE e.id = $1
		GROUP BY e.id`, id)
	ev, err := scanEvent(row)
	if err != nil {
		return nil, err
	}
	return &ev, nil
}

func IsEventParticipant(db *sql.DB, userID int64, eventID string) (bool, error) {
	var count int
	err := db.QueryRow(
		`SELECT COUNT(*) FROM apx_event_participants WHERE user_id = $1 AND event_id = $2`,
		userID, eventID,
	).Scan(&count)
	return count > 0, err
}

func GetEventParticipants(db *sql.DB, eventID string) ([]EventParticipant, error) {
	rows, err := db.Query(`
		SELECT ep.user_id, u.username, u.nickname, u.avatar_url, ep.joined_at
		FROM apx_event_participants ep
		JOIN apx_users u ON u.id = ep.user_id
		WHERE ep.event_id = $1
		ORDER BY ep.joined_at ASC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var participants []EventParticipant
	for rows.Next() {
		var p EventParticipant
		var joinedAt time.Time
		if err := rows.Scan(&p.UserID, &p.Username, &p.Nickname, &p.AvatarURL, &joinedAt); err != nil {
			return nil, err
		}
		p.JoinedAt = joinedAt.Format(time.RFC3339)
		participants = append(participants, p)
	}
	return participants, rows.Err()
}

func JoinEvent(db *sql.DB, userID int64, eventID string) error {
	// Fetch event
	ev, err := GetEventByID(db, eventID)
	if err == sql.ErrNoRows {
		return fmt.Errorf("event not found")
	}
	if err != nil {
		return err
	}
	if ev.Status == "past" {
		return fmt.Errorf("event is over")
	}
	if ev.MaxParticipants > 0 && ev.ParticipantCount >= ev.MaxParticipants {
		return fmt.Errorf("event is full")
	}

	// Check if already joined
	joined, err := IsEventParticipant(db, userID, eventID)
	if err != nil {
		return err
	}
	if joined {
		return fmt.Errorf("already joined")
	}

	_, err = db.Exec(
		`INSERT INTO apx_event_participants (user_id, event_id) VALUES ($1, $2)`,
		userID, eventID,
	)
	return err
}

func LeaveEvent(db *sql.DB, userID int64, eventID string) error {
	res, err := db.Exec(
		`DELETE FROM apx_event_participants WHERE user_id = $1 AND event_id = $2`,
		userID, eventID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("not joined")
	}
	return nil
}

func CreateEvent(db *sql.DB, ev Event) (string, error) {
	var id string
	err := db.QueryRow(`
		INSERT INTO apx_events
		    (name, status, date, duration_de, duration_en, description_de, description_en, max_participants)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		ev.Name, ev.Status, ev.Date,
		ev.DurationDe, ev.DurationEn,
		ev.DescriptionDe, ev.DescriptionEn,
		ev.MaxParticipants,
	).Scan(&id)
	return id, err
}

func UpdateEvent(db *sql.DB, ev Event) error {
	_, err := db.Exec(`
		UPDATE apx_events
		SET name=$1, status=$2, date=$3,
		    duration_de=$4, duration_en=$5,
		    description_de=$6, description_en=$7,
		    max_participants=$8
		WHERE id=$9`,
		ev.Name, ev.Status, ev.Date,
		ev.DurationDe, ev.DurationEn,
		ev.DescriptionDe, ev.DescriptionEn,
		ev.MaxParticipants, ev.ID,
	)
	return err
}

func DeleteEvent(db *sql.DB, id string) error {
	_, err := db.Exec(`DELETE FROM apx_events WHERE id = $1`, id)
	return err
}

func SetUserEventAccess(db *sql.DB, username string, access bool) error {
	res, err := db.Exec(
		`UPDATE apx_users SET event_access = $1 WHERE username = $2`,
		access, username,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

// handlePublicEvents serves GET /api/events — public list.
func handlePublicEvents(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		events, err := GetAllEvents(db)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "db error")
			return
		}
		if events == nil {
			events = []Event{}
		}
		// Mark joined events for authenticated users
		if cookie, err := r.Cookie("session"); err == nil {
			if user, err := GetSessionUser(db, cookie.Value); err == nil {
				for i := range events {
					events[i].IsJoined, _ = IsEventParticipant(db, user.ID, events[i].ID)
				}
			}
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"events": events})
	}
}

// handleEventRoutes handles:
//
//	GET  /api/events/{id}       — public event detail + participants
//	POST /api/events/{id}/join  — authenticated join
//	POST /api/events/{id}/leave — authenticated leave
func handleEventRoutes(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/events/")
		parts := strings.SplitN(path, "/", 2)
		eventID := parts[0]
		action := ""
		if len(parts) == 2 {
			action = parts[1]
		}

		if eventID == "" {
			jsonError(w, http.StatusBadRequest, "missing event id")
			return
		}

		switch {
		case r.Method == http.MethodGet && action == "":
			ev, err := GetEventByID(db, eventID)
			if err == sql.ErrNoRows {
				jsonError(w, http.StatusNotFound, "event not found")
				return
			}
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "db error")
				return
			}
			participants, err := GetEventParticipants(db, eventID)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "db error")
				return
			}
			if participants == nil {
				participants = []EventParticipant{}
			}
			if cookie, err := r.Cookie("session"); err == nil {
				if user, err := GetSessionUser(db, cookie.Value); err == nil {
					ev.IsJoined, _ = IsEventParticipant(db, user.ID, eventID)
				}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{
				"event":        ev,
				"participants": participants,
			})

		case r.Method == http.MethodPost && (action == "join" || action == "leave"):
			cookie, err := r.Cookie("session")
			if err != nil {
				jsonError(w, http.StatusUnauthorized, "not logged in")
				return
			}
			user, err := GetSessionUser(db, cookie.Value)
			if err != nil {
				jsonError(w, http.StatusUnauthorized, "invalid session")
				return
			}

			if action == "join" {
				if !user.EventAccess {
					jsonError(w, http.StatusForbidden, "no event access")
					return
				}
				if err := JoinEvent(db, user.ID, eventID); err != nil {
					switch err.Error() {
					case "already joined":
						jsonError(w, http.StatusConflict, "already joined")
					case "event not found":
						jsonError(w, http.StatusNotFound, "event not found")
					case "event is full":
						jsonError(w, http.StatusConflict, "event is full")
					case "event is over":
						jsonError(w, http.StatusBadRequest, "event is over")
					default:
						jsonError(w, http.StatusInternalServerError, "db error")
					}
					return
				}
			} else {
				if err := LeaveEvent(db, user.ID, eventID); err != nil {
					if err.Error() == "not joined" {
						jsonError(w, http.StatusConflict, "not joined")
						return
					}
					jsonError(w, http.StatusInternalServerError, "db error")
					return
				}
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

// handleAdminEvents serves GET/POST/PUT/DELETE /api/admin/events — admin only.
func handleAdminEvents(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		switch r.Method {
		case http.MethodGet:
			events, err := GetAllEvents(db)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "db error")
				return
			}
			if events == nil {
				events = []Event{}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"events": events})

		case http.MethodPost:
			var ev Event
			if err := json.NewDecoder(r.Body).Decode(&ev); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid body")
				return
			}
			if strings.TrimSpace(ev.Name) == "" || strings.TrimSpace(ev.Date) == "" {
				jsonError(w, http.StatusBadRequest, "name and date required")
				return
			}
			if ev.Status == "" {
				ev.Status = "upcoming"
			}
			id, err := CreateEvent(db, ev)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "db error")
				return
			}
			jsonResponse(w, http.StatusCreated, map[string]string{"id": id})

		case http.MethodPut:
			var ev Event
			if err := json.NewDecoder(r.Body).Decode(&ev); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid body")
				return
			}
			if ev.ID == "" {
				jsonError(w, http.StatusBadRequest, "id required")
				return
			}
			if err := UpdateEvent(db, ev); err != nil {
				jsonError(w, http.StatusInternalServerError, "db error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		case http.MethodDelete:
			var req struct {
				ID string `json:"id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid body")
				return
			}
			if req.ID == "" {
				jsonError(w, http.StatusBadRequest, "id required")
				return
			}
			if err := DeleteEvent(db, req.ID); err != nil {
				jsonError(w, http.StatusInternalServerError, "db error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}
