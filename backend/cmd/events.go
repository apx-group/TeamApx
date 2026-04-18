package main

import (
	"encoding/json"
	"net/http"
	"strings"
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

// handlePublicEvents serves GET /api/events — public list.
func handlePublicEvents(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		events, err := apx.GetAllEvents()
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if events == nil {
			events = []Event{}
		}
		// Mark joined events for authenticated users
		if cookie, err := r.Cookie("session"); err == nil {
			if user, err := apx.GetSessionUser(cookie.Value); err == nil {
				for i := range events {
					events[i].IsJoined, _ = apx.IsEventParticipant(user.ID, events[i].ID)
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
func handleEventRoutes(apx *ApxClient) http.HandlerFunc {
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
			ev, err := apx.GetEventByID(eventID)
			if err != nil {
				if err == errNotFound {
					jsonError(w, http.StatusNotFound, "event not found")
					return
				}
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			participants, err := apx.GetEventParticipants(eventID)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if participants == nil {
				participants = []EventParticipant{}
			}
			if cookie, err := r.Cookie("session"); err == nil {
				if user, err := apx.GetSessionUser(cookie.Value); err == nil {
					ev.IsJoined, _ = apx.IsEventParticipant(user.ID, eventID)
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
			user, err := apx.GetSessionUser(cookie.Value)
			if err != nil {
				jsonError(w, http.StatusUnauthorized, "invalid session")
				return
			}

			if action == "join" {
				if !user.EventAccess {
					jsonError(w, http.StatusForbidden, "no event access")
					return
				}
				if err := apx.JoinEvent(user.ID, eventID); err != nil {
					jsonError(w, http.StatusConflict, err.Error())
					return
				}
			} else {
				if err := apx.LeaveEvent(user.ID, eventID); err != nil {
					jsonError(w, http.StatusInternalServerError, "internal error")
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
func handleAdminEvents(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		switch r.Method {
		case http.MethodGet:
			events, err := apx.GetAllEvents()
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if events == nil {
				events = []Event{}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"events": events})

		case http.MethodPost:
			var req CreateEventInput
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid body")
				return
			}
			if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Date) == "" {
				jsonError(w, http.StatusBadRequest, "name and date required")
				return
			}
			if req.Status == "" {
				req.Status = "upcoming"
			}
			ev, err := apx.CreateEvent(req)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusCreated, map[string]string{"id": ev.ID})

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
			if err := apx.UpdateEvent(&ev); err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
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
			if err := apx.DeleteEvent(req.ID); err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}
