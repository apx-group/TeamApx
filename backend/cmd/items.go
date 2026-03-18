package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// Item represents an item definition in the NeonDB catalog.
type Item struct {
	ItemID    string   `json:"item_id"`
	SeqID     int64    `json:"seq_id"`
	Name      string   `json:"name"`
	Rarity    *string  `json:"rarity"`    // nil → null in JSON
	ImageURL  *string  `json:"image_url"` // nil → null in JSON
	IsWeapon  bool     `json:"is_weapon"`
	IsArmor   bool     `json:"is_armor"`
	IsItem    bool     `json:"is_item"`
	IsAnimal  bool     `json:"is_animal"`
	Perks     []string `json:"perks"` // decoded from JSONB
	CreatedAt string   `json:"created_at"`
}

// UserItem is an Item owned by a specific user.
type UserItem struct {
	Item
	Quantity   int    `json:"quantity"`
	AcquiredAt string `json:"acquired_at"`
}

// scanItem scans a row into an Item, handling nullable columns.
func scanItem(row interface {
	Scan(...any) error
}) (Item, error) {
	var it Item
	var rarity sql.NullString
	var imageURL sql.NullString
	var perksRaw []byte
	if err := row.Scan(
		&it.ItemID, &it.SeqID, &it.Name, &rarity, &imageURL,
		&it.IsWeapon, &it.IsArmor, &it.IsItem, &it.IsAnimal,
		&perksRaw, &it.CreatedAt,
	); err != nil {
		return Item{}, err
	}
	if rarity.Valid {
		it.Rarity = &rarity.String
	}
	if imageURL.Valid {
		it.ImageURL = &imageURL.String
	}
	if len(perksRaw) > 0 {
		_ = json.Unmarshal(perksRaw, &it.Perks)
	}
	if it.Perks == nil {
		it.Perks = []string{}
	}
	return it, nil
}

// GetAllItems returns all items ordered by seq_id ascending.
func GetAllItems(db *sql.DB) ([]Item, error) {
	rows, err := db.Query(`
		SELECT item_id, seq_id, name, rarity, image_url,
		       is_weapon, is_armor, is_item, is_animal, perks, created_at
		FROM apx_items ORDER BY seq_id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Item
	for rows.Next() {
		it, err := scanItem(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

// CreateItem inserts a new item. The trigger auto-sets item_id and seq_id.
// Returns the full Item including the generated fields via RETURNING.
func CreateItem(db *sql.DB, name string, rarity *string, imageURL *string,
	isWeapon, isArmor, isItem, isAnimal bool, perks []string) (Item, error) {
	if perks == nil {
		perks = []string{}
	}
	perksJSON, err := json.Marshal(perks)
	if err != nil {
		return Item{}, fmt.Errorf("marshal perks: %w", err)
	}
	row := db.QueryRow(`
		INSERT INTO apx_items (name, rarity, image_url, is_weapon, is_armor, is_item, is_animal, perks)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING item_id, seq_id, name, rarity, image_url,
		          is_weapon, is_armor, is_item, is_animal, perks, created_at`,
		name, rarity, imageURL, isWeapon, isArmor, isItem, isAnimal, perksJSON,
	)
	return scanItem(row)
}

// DeleteItem removes an item by item_id.
func DeleteItem(db *sql.DB, itemID string) error {
	_, err := db.Exec(`DELETE FROM apx_items WHERE item_id = $1`, itemID)
	return err
}

// GetUserItems returns all items owned by the given username, joined with items.
func GetUserItems(db *sql.DB, username string) ([]UserItem, error) {
	rows, err := db.Query(`
		SELECT i.item_id, i.seq_id, i.name, i.rarity, i.image_url,
		       i.is_weapon, i.is_armor, i.is_item, i.is_animal, i.perks, i.created_at,
		       ui.quantity, ui.acquired_at
		FROM apx_user_items ui
		JOIN apx_items i ON i.item_id = ui.item_id
		WHERE ui.username = $1
		ORDER BY ui.acquired_at DESC`, username)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []UserItem
	for rows.Next() {
		var ui UserItem
		var rarity sql.NullString
		var imageURL sql.NullString
		var perksRaw []byte
		if err := rows.Scan(
			&ui.ItemID, &ui.SeqID, &ui.Name, &rarity, &imageURL,
			&ui.IsWeapon, &ui.IsArmor, &ui.IsItem, &ui.IsAnimal,
			&perksRaw, &ui.CreatedAt,
			&ui.Quantity, &ui.AcquiredAt,
		); err != nil {
			return nil, err
		}
		if rarity.Valid {
			ui.Rarity = &rarity.String
		}
		if imageURL.Valid {
			ui.ImageURL = &imageURL.String
		}
		if len(perksRaw) > 0 {
			_ = json.Unmarshal(perksRaw, &ui.Perks)
		}
		if ui.Perks == nil {
			ui.Perks = []string{}
		}
		items = append(items, ui)
	}
	return items, rows.Err()
}

var validRarities = map[string]bool{
	"E-Rank": true, "D-Rank": true, "C-Rank": true,
	"B-Rank": true, "A-Rank": true, "S-Rank": true,
}

// handleAdminItems handles GET/POST/DELETE /api/admin/items
func handleAdminItems(userDB *sql.DB, neonDB *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if neonDB == nil {
			jsonError(w, http.StatusServiceUnavailable, "items not available")
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

		switch r.Method {
		case http.MethodGet:
			items, err := GetAllItems(neonDB)
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
			created, err := CreateItem(neonDB, req.Name, rarityPtr, imagePtr,
				req.IsWeapon, req.IsArmor, req.IsItem, req.IsAnimal, req.Perks)
			if err != nil {
				log.Printf("CreateItem error: %v", err)
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			jsonResponse(w, http.StatusCreated, map[string]interface{}{"item": created})

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
			if err := DeleteItem(neonDB, req.ItemID); err != nil {
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
func handleAdminItemImage(userDB *sql.DB, uploadDir string) http.HandlerFunc {
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
		user, err := GetSessionUser(userDB, cookie.Value)
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

// handleMyItems handles GET /api/items/my — returns the current user's items.
func handleMyItems(userDB *sql.DB, neonDB *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		if neonDB == nil {
			jsonError(w, http.StatusServiceUnavailable, "items not available")
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

		items, err := GetUserItems(neonDB, user.Username)
		if err != nil {
			log.Printf("GetUserItems error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if items == nil {
			items = []UserItem{}
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"items": items})
	}
}
