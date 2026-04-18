package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// Item represents an item definition in the catalog.
type Item struct {
	ItemID    string   `json:"item_id"`
	SeqID     int64    `json:"seq_id"`
	Name      string   `json:"name"`
	Rarity    *string  `json:"rarity"`
	ImageURL  *string  `json:"image_url"`
	IsWeapon  bool     `json:"is_weapon"`
	IsArmor   bool     `json:"is_armor"`
	IsItem    bool     `json:"is_item"`
	IsAnimal  bool     `json:"is_animal"`
	Perks     []string `json:"perks"`
	CreatedAt string   `json:"created_at"`
}

var validRarities = map[string]bool{
	"E-Rank": true, "D-Rank": true, "C-Rank": true,
	"B-Rank": true, "A-Rank": true, "S-Rank": true,
}

// handleAdminItems handles GET/POST/DELETE /api/admin/items
func handleAdminItems(apx *ApxClient, uploadDir string) http.HandlerFunc {
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
			items, err := apx.GetAllItems()
			if err != nil {
				log.Printf("GetAllItems error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if items == nil {
				items = []Item{}
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"items": items})

		case http.MethodPost:
			var req struct {
				Name     string   `json:"name"`
				Rarity   string   `json:"rarity"`
				ImageURL string   `json:"image_url"`
				IsWeapon bool     `json:"is_weapon"`
				IsArmor  bool     `json:"is_armor"`
				IsItem   bool     `json:"is_item"`
				IsAnimal bool     `json:"is_animal"`
				Perks    []string `json:"perks"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if req.Name == "" {
				jsonError(w, http.StatusBadRequest, "name required")
				return
			}
			if req.Rarity != "" && !validRarities[req.Rarity] {
				jsonError(w, http.StatusBadRequest, "invalid rarity")
				return
			}
			var rarityPtr *string
			if req.Rarity != "" {
				rarityPtr = &req.Rarity
			}
			var imagePtr *string
			if req.ImageURL != "" {
				imagePtr = &req.ImageURL
			}
			item := &Item{
				Name: req.Name, Rarity: rarityPtr, ImageURL: imagePtr,
				IsWeapon: req.IsWeapon, IsArmor: req.IsArmor,
				IsItem: req.IsItem, IsAnimal: req.IsAnimal, Perks: req.Perks,
			}
			if err := apx.CreateItem(item); err != nil {
				log.Printf("CreateItem error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusCreated, map[string]interface{}{"item": item})

		case http.MethodDelete:
			var req struct {
				ItemID string `json:"item_id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if req.ItemID == "" {
				jsonError(w, http.StatusBadRequest, "item_id required")
				return
			}
			if err := apx.DeleteItem(req.ItemID); err != nil {
				log.Printf("DeleteItem error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

// handleAdminItemImage handles POST /api/admin/items/image — uploads an item image.
func handleAdminItemImage(apx *ApxClient, uploadDir string) http.HandlerFunc {
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

		filename := fmt.Sprintf("item_%d", time.Now().UnixNano())
		url, err := saveUploadedImage(file, uploadDir, "items", filename)
		if err != nil {
			log.Printf("saveUploadedImage item error: %v", err)
			jsonError(w, http.StatusInternalServerError, "upload failed")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]string{"image_url": url})
	}
}

// handleMyItems handles GET /api/items/my — returns the current user's progression inventory.
func handleMyItems(apx *ApxClient) http.HandlerFunc {
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

		items, err := apx.GetUserItems(user.ID)
		if err != nil {
			log.Printf("GetUserItems error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if items == nil {
			items = []ProgressionInventoryItem{}
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"items": items})
	}
}
