package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
)

// Badge represents a badge definition.
type Badge struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Info        string `json:"info"`
	ImageURL    string `json:"image_url"`
	MaxLevel    int    `json:"max_level"`
	Available   bool   `json:"available"`
	Category    string `json:"category"`
}

// UserBadge represents a badge as seen by / assigned to a user.
type UserBadge struct {
	BadgeID     int64  `json:"badge_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Info        string `json:"info"`
	ImageURL    string `json:"image_url"`
	MaxLevel    int    `json:"max_level"`
	Available   bool   `json:"available"`
	Category    string `json:"category"`
	Level       int    `json:"level"`
	Owned       bool   `json:"owned"`
}

// handleAdminBadges handles admin badge CRUD: GET (list), POST (create), PUT (update), DELETE (delete).
func handleAdminBadges(apx *ApxClient) http.HandlerFunc {
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
		if err != nil || !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		switch r.Method {
		case http.MethodGet:
			badges, err := apx.GetAllBadges()
			if err != nil {
				log.Printf("GetAllBadges error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if badges == nil {
				badges = []Badge{}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"badges": badges})

		case http.MethodPost:
			var req struct {
				Name        string `json:"name"`
				Description string `json:"description"`
				Info        string `json:"info"`
				ImageURL    string `json:"image_url"`
				Category    string `json:"category"`
				MaxLevel    int    `json:"max_level"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if req.Name == "" {
				jsonError(w, http.StatusBadRequest, "name required")
				return
			}
			if req.MaxLevel < 0 || req.MaxLevel > 15 {
				req.MaxLevel = 0
			}
			if req.ImageURL == "" {
				req.ImageURL = "/assets/icons/APX.png"
			}
			id, err := apx.CreateBadge(req.Name, req.Description, req.Info, req.ImageURL, req.Category, req.MaxLevel)
			if err != nil {
				log.Printf("CreateBadge error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusCreated, map[string]interface{}{"id": id, "success": true})

		case http.MethodPut:
			var req struct {
				ID          int64  `json:"id"`
				Name        string `json:"name"`
				Description string `json:"description"`
				Info        string `json:"info"`
				ImageURL    string `json:"image_url"`
				Category    string `json:"category"`
				MaxLevel    int    `json:"max_level"`
				Available   bool   `json:"available"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if req.ID == 0 {
				jsonError(w, http.StatusBadRequest, "id required")
				return
			}
			if req.Name == "" {
				jsonError(w, http.StatusBadRequest, "name required")
				return
			}
			if req.MaxLevel < 0 || req.MaxLevel > 15 {
				req.MaxLevel = 0
			}
			if req.ImageURL == "" {
				req.ImageURL = "/assets/icons/APX.png"
			}
			if err := apx.UpdateBadge(req.ID, req.Name, req.Description, req.Info, req.ImageURL, req.Category, req.MaxLevel, req.Available); err != nil {
				log.Printf("UpdateBadge error: %v", err)
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
			if err := apx.DeleteBadge(req.ID); err != nil {
				log.Printf("DeleteBadge error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

// handleAdminUserBadges handles admin user-badge operations.
// GET  ?username=X          → list all badges with owned status for user
// POST body {username, badge_id, level} → upsert
// DELETE ?username=X&badge_id=Y        → remove
func handleAdminUserBadges(apx *ApxClient) http.HandlerFunc {
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
		if err != nil || !user.IsAdmin {
			jsonError(w, http.StatusForbidden, "Keine Berechtigung")
			return
		}

		switch r.Method {
		case http.MethodGet:
			username := r.URL.Query().Get("username")
			if username == "" {
				jsonError(w, http.StatusBadRequest, "username required")
				return
			}
			u, err := apx.GetUserByUsername(username)
			if err != nil {
				jsonError(w, http.StatusNotFound, "user not found")
				return
			}
			// Merge all badges with owned status
			allBadges, err := apx.GetAllBadges()
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			ownedBadges, _ := apx.GetUserBadges(u.ID)
			ownedMap := make(map[int64]UserBadge, len(ownedBadges))
			for _, ub := range ownedBadges {
				ownedMap[ub.BadgeID] = ub
			}
			result := make([]UserBadge, 0, len(allBadges))
			for _, b := range allBadges {
				ub := UserBadge{
					BadgeID: b.ID, Name: b.Name, Description: b.Description,
					Info: b.Info, ImageURL: b.ImageURL, MaxLevel: b.MaxLevel,
					Available: b.Available, Category: b.Category,
				}
				if owned, ok := ownedMap[b.ID]; ok {
					ub.Level = owned.Level
					ub.Owned = true
				}
				result = append(result, ub)
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"badges": result})

		case http.MethodPost:
			var req struct {
				Username string `json:"username"`
				BadgeID  int64  `json:"badge_id"`
				Level    int    `json:"level"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if req.Username == "" {
				jsonError(w, http.StatusBadRequest, "username required")
				return
			}
			if req.BadgeID == 0 {
				jsonError(w, http.StatusBadRequest, "badge_id required")
				return
			}
			if req.Level < 0 {
				req.Level = 0
			}
			u, err := apx.GetUserByUsername(req.Username)
			if err != nil {
				jsonError(w, http.StatusNotFound, "user not found")
				return
			}
			if err := apx.UpsertUserBadge(u.ID, req.BadgeID, req.Level); err != nil {
				log.Printf("UpsertUserBadge error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		case http.MethodDelete:
			username := r.URL.Query().Get("username")
			badgeIDStr := r.URL.Query().Get("badge_id")
			if username == "" || badgeIDStr == "" {
				jsonError(w, http.StatusBadRequest, "username and badge_id required")
				return
			}
			badgeID, err := strconv.ParseInt(badgeIDStr, 10, 64)
			if err != nil || badgeID == 0 {
				jsonError(w, http.StatusBadRequest, "invalid badge_id")
				return
			}
			u, err := apx.GetUserByUsername(username)
			if err != nil {
				jsonError(w, http.StatusNotFound, "user not found")
				return
			}
			if err := apx.RemoveUserBadge(u.ID, badgeID); err != nil {
				log.Printf("RemoveUserBadge error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

// handleAdminBadgeImage handles POST /api/admin/badges/image – uploads a badge image.
func handleAdminBadgeImage(apx *ApxClient, uploadDir string) http.HandlerFunc {
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

		if err := r.ParseMultipartForm(10 << 20); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid form data")
			return
		}
		file, _, err := r.FormFile("image")
		if err != nil {
			jsonError(w, http.StatusBadRequest, "image required")
			return
		}
		defer file.Close()

		filename := fmt.Sprintf("badge_%d", time.Now().UnixNano())
		url, err := saveUploadedImage(file, uploadDir, "badge", filename)
		if err != nil {
			log.Printf("saveUploadedImage badge error: %v", err)
			jsonError(w, http.StatusInternalServerError, "upload failed")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]string{"image_url": url})
	}
}

// handleUserBadges handles GET /api/badges – returns the current user's badges.
func handleUserBadges(apx *ApxClient) http.HandlerFunc {
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

		badges, err := apx.GetUserBadges(user.ID)
		if err != nil {
			log.Printf("GetUserBadges error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if badges == nil {
			badges = []UserBadge{}
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"badges": badges})
	}
}
