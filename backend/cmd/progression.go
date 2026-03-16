package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
)

// ── Types ──

type ProgressionInventoryItem struct {
	InventoryID int    `json:"inventory_id"`
	Name        string `json:"name"`
	Rarity      string `json:"rarity"`
	ItemType    string `json:"item_type"`
	AssetKey    string `json:"asset_key"`
	SellPrice   int    `json:"sell_price,omitempty"`
	Equipped    bool   `json:"equipped,omitempty"`
}

// ── Helpers ──

func checkInternalAPIKey(w http.ResponseWriter, r *http.Request) bool {
	key := r.Header.Get("X-Api-Key")
	if key != os.Getenv("INTERNAL_API_KEY") {
		w.WriteHeader(http.StatusUnauthorized)
		return false
	}
	return true
}

func resolveUserIDByDiscord(db *sql.DB, discordID string) (int64, error) {
	var userID int64
	err := db.QueryRow(
		"SELECT user_id FROM linked_accounts WHERE service = 'discord' AND service_id = ?",
		discordID,
	).Scan(&userID)
	return userID, err
}

func levelToRank(level int) string {
	switch {
	case level >= 500:
		return "S"
	case level >= 300:
		return "A"
	case level >= 200:
		return "B"
	case level >= 100:
		return "C"
	default:
		return "D"
	}
}

// ── DB Helpers ──

func upsertProgressionUser(db *sql.DB, userID int64, discordID string, level, xp, balance int) error {
	_, err := db.Exec(`
		INSERT INTO progression_users (user_id, discord_id, level, xp, currency_balance, updated_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(user_id) DO UPDATE SET
			discord_id       = excluded.discord_id,
			level            = excluded.level,
			xp               = excluded.xp,
			currency_balance = excluded.currency_balance,
			updated_at       = CURRENT_TIMESTAMP`,
		userID, discordID, level, xp, balance,
	)
	return err
}

func insertInventoryItem(db *sql.DB, userID int64, invID, itemID int, name, rarity, itemType, assetKey string, sellPrice int) error {
	_, err := db.Exec(`
		INSERT INTO progression_inventory
			(user_id, inventory_id, item_id, name, rarity, item_type, asset_key, sell_price)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id, inventory_id) DO UPDATE SET
			item_id    = excluded.item_id,
			name       = excluded.name,
			rarity     = excluded.rarity,
			item_type  = excluded.item_type,
			asset_key  = excluded.asset_key,
			sell_price = excluded.sell_price`,
		userID, invID, itemID, name, rarity, itemType, assetKey, sellPrice,
	)
	return err
}

func deleteInventoryItem(db *sql.DB, userID int64, inventoryID int) error {
	_, err := db.Exec(
		"DELETE FROM progression_inventory WHERE user_id = ? AND inventory_id = ?",
		userID, inventoryID,
	)
	return err
}

func updateProgressionUserRank(db *sql.DB, userID int64, discordID string, rank string) error {
	var rankVal interface{}
	if rank != "" {
		rankVal = rank
	}
	_, err := db.Exec(`
		INSERT INTO progression_users (user_id, discord_id, level, xp, currency_balance, discord_rank, updated_at)
		VALUES (?, ?, 0, 0, 0, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(user_id) DO UPDATE SET
			discord_rank = excluded.discord_rank,
			updated_at   = CURRENT_TIMESTAMP`,
		userID, discordID, rankVal,
	)
	return err
}

func equipInventoryItem(db *sql.DB, userID int64, inventoryID int, itemType string, equipped bool) error {
	if !equipped {
		_, err := db.Exec(
			"UPDATE progression_inventory SET equipped = 0 WHERE user_id = ? AND inventory_id = ?",
			userID, inventoryID,
		)
		return err
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(
		"UPDATE progression_inventory SET equipped = 0 WHERE user_id = ? AND item_type = ?",
		userID, itemType,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(
		"UPDATE progression_inventory SET equipped = 1 WHERE user_id = ? AND inventory_id = ?",
		userID, inventoryID,
	); err != nil {
		return err
	}
	return tx.Commit()
}

// ── Internal Handlers (Bot → Go) ──

// POST /api/internal/progression/user-sync
func handleInternalUserSync(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if !checkInternalAPIKey(w, r) {
			return
		}
		var req struct {
			UserID          string `json:"user_id"`
			Level           int    `json:"level"`
			XP              int    `json:"xp"`
			CurrencyBalance int    `json:"currency_balance"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if req.UserID == "" {
			jsonError(w, http.StatusBadRequest, "user_id required")
			return
		}
		userID, err := resolveUserIDByDiscord(db, req.UserID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": false})
			return
		}
		if err := upsertProgressionUser(db, userID, req.UserID, req.Level, req.XP, req.CurrencyBalance); err != nil {
			log.Printf("user-sync: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": true})
	}
}

// POST /api/internal/progression/inventory-add
func handleInternalInventoryAdd(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if !checkInternalAPIKey(w, r) {
			return
		}
		var req struct {
			UserID      string `json:"user_id"`
			InventoryID int    `json:"inventory_id"`
			ItemID      int    `json:"item_id"`
			Name        string `json:"name"`
			Rarity      string `json:"rarity"`
			ItemType    string `json:"item_type"`
			AssetKey    string `json:"asset_key"`
			SellPrice   int    `json:"sell_price"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid body")
			return
		}
		userID, err := resolveUserIDByDiscord(db, req.UserID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": false})
			return
		}
		if err := insertInventoryItem(db, userID, req.InventoryID, req.ItemID, req.Name, req.Rarity, req.ItemType, req.AssetKey, req.SellPrice); err != nil {
			log.Printf("inventory-add: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": true})
	}
}

// POST /api/internal/progression/inventory-remove
func handleInternalInventoryRemove(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if !checkInternalAPIKey(w, r) {
			return
		}
		var req struct {
			UserID      string `json:"user_id"`
			InventoryID int    `json:"inventory_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid body")
			return
		}
		userID, err := resolveUserIDByDiscord(db, req.UserID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": false})
			return
		}
		if err := deleteInventoryItem(db, userID, req.InventoryID); err != nil {
			log.Printf("inventory-remove: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": true})
	}
}

// POST /api/internal/progression/inventory-equip
func handleInternalInventoryEquip(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if !checkInternalAPIKey(w, r) {
			return
		}
		var req struct {
			UserID      string `json:"user_id"`
			InventoryID int    `json:"inventory_id"`
			Equipped    bool   `json:"equipped"`
			ItemType    string `json:"item_type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid body")
			return
		}
		userID, err := resolveUserIDByDiscord(db, req.UserID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": false})
			return
		}
		if err := equipInventoryItem(db, userID, req.InventoryID, req.ItemType, req.Equipped); err != nil {
			log.Printf("inventory-equip: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": true})
	}
}

// POST /api/internal/progression/role-sync
func handleInternalRoleSync(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if !checkInternalAPIKey(w, r) {
			return
		}
		var req struct {
			UserID  string `json:"user_id"`
			GuildID string `json:"guild_id"`
			Rank    string `json:"rank"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if req.UserID == "" {
			jsonError(w, http.StatusBadRequest, "user_id required")
			return
		}
		if req.GuildID != apxGuildID {
			jsonError(w, http.StatusBadRequest, "invalid guild_id")
			return
		}
		// Normalize rank: accept "E-Rank", "E-rank", or just "E" → store "E"
		rank := req.Rank
		if len(rank) == 6 && rank[1:] == "-Rank" {
			rank = string(rank[0])
		} else if len(rank) == 6 && rank[1:] == "-rank" {
			rank = string(rank[0])
		}
		userID, err := resolveUserIDByDiscord(db, req.UserID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": false})
			return
		}
		if err := updateProgressionUserRank(db, userID, req.UserID, rank); err != nil {
			log.Printf("role-sync: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": true})
	}
}

// ── Public Handlers (Website → Go) ──

// GET /api/progression/profile?u=<username>
func handleProgressionProfile(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		username := r.URL.Query().Get("u")
		if username == "" {
			jsonError(w, http.StatusBadRequest, "username required")
			return
		}

		var userID int64
		if err := db.QueryRow(
			"SELECT id FROM users WHERE username = ? AND is_active = 1", username,
		).Scan(&userID); err != nil {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}

		var level, xp, balance int
		var discordRank sql.NullString
		err := db.QueryRow(
			"SELECT level, xp, currency_balance, discord_rank FROM progression_users WHERE user_id = ?", userID,
		).Scan(&level, &xp, &balance, &discordRank)
		if err != nil && err != sql.ErrNoRows {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		rank := levelToRank(level)
		if discordRank.Valid && discordRank.String != "" {
			rank = discordRank.String
		}

		rows, err := db.Query(`
			SELECT inventory_id, name, rarity, item_type, asset_key
			FROM progression_inventory
			WHERE user_id = ? AND equipped = 1
			ORDER BY item_type`, userID,
		)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		defer rows.Close()

		equippedItems := []ProgressionInventoryItem{}
		for rows.Next() {
			var item ProgressionInventoryItem
			if err := rows.Scan(&item.InventoryID, &item.Name, &item.Rarity, &item.ItemType, &item.AssetKey); err != nil {
				continue
			}
			equippedItems = append(equippedItems, item)
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"username":         username,
			"level":            level,
			"xp":               xp,
			"currency_balance": balance,
			"rank":             rank,
			"equipped_items":   equippedItems,
		})
	}
}

// GET /api/progression/me  (session cookie required)
func handleProgressionMe(db *sql.DB) http.HandlerFunc {
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
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		var discordID string
		var level, balance int
		var discordRank sql.NullString
		err = db.QueryRow(
			"SELECT discord_id, level, currency_balance, discord_rank FROM progression_users WHERE user_id = ?", user.ID,
		).Scan(&discordID, &level, &balance, &discordRank)
		if err != nil && err != sql.ErrNoRows {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		rank := levelToRank(level)
		if discordRank.Valid && discordRank.String != "" {
			rank = discordRank.String
		}

		rows, err := db.Query(`
			SELECT inventory_id, name, rarity, item_type, asset_key, equipped
			FROM progression_inventory
			WHERE user_id = ?
			ORDER BY obtained_at DESC`, user.ID,
		)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		defer rows.Close()

		inventory := []map[string]interface{}{}
		for rows.Next() {
			var invID int
			var name, rarity, itemType, assetKey string
			var equipped int
			if err := rows.Scan(&invID, &name, &rarity, &itemType, &assetKey, &equipped); err != nil {
				continue
			}
			inventory = append(inventory, map[string]interface{}{
				"inventory_id": invID,
				"name":         name,
				"rarity":       rarity,
				"item_type":    itemType,
				"asset_key":    assetKey,
				"equipped":     equipped == 1,
			})
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"user_id":          discordID,
			"level":            level,
			"currency_balance": balance,
			"rank":             rank,
			"inventory":        inventory,
		})
	}
}

// GET /api/progression/leaderboard?limit=50&offset=0
func handleProgressionLeaderboard(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		limit := 50
		offset := 0
		if v := r.URL.Query().Get("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
				limit = n
			}
		}
		if v := r.URL.Query().Get("offset"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n >= 0 {
				offset = n
			}
		}

		rows, err := db.Query(`
			SELECT u.username, u.nickname, u.avatar_url, pu.level, pu.currency_balance, pu.discord_rank
			FROM progression_users pu
			JOIN users u ON u.id = pu.user_id
			WHERE u.is_active = 1
			ORDER BY pu.currency_balance DESC
			LIMIT ? OFFSET ?`,
			limit, offset,
		)
		if err != nil {
			log.Printf("leaderboard query: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		defer rows.Close()

		type lbEntry struct {
			userID int64
			entry  map[string]interface{}
		}
		var rawEntries []lbEntry
		pos := offset + 1
		for rows.Next() {
			var username, nickname, avatar string
			var level, balance int
			var discordRank sql.NullString
			if err := rows.Scan(&username, &nickname, &avatar, &level, &balance, &discordRank); err != nil {
				continue
			}
			progRank := levelToRank(level)
			if discordRank.Valid && discordRank.String != "" {
				progRank = discordRank.String
			}
			rawEntries = append(rawEntries, lbEntry{
				entry: map[string]interface{}{
					"rank":             pos,
					"username":         username,
					"nickname":         nickname,
					"avatar_url":       avatar,
					"level":            level,
					"currency_balance": balance,
					"prog_rank":        progRank,
					"equipped_frame":   "",
				},
			})
			pos++
		}
		rows.Close()

		// Fetch equipped frames for each user in one query
		if len(rawEntries) > 0 {
			type frameRow struct {
				username string
				assetKey string
			}
			frameRows, err := db.Query(`
				SELECT u.username, pi.asset_key
				FROM progression_inventory pi
				JOIN progression_users pu ON pu.user_id = pi.user_id
				JOIN users u ON u.id = pu.user_id
				WHERE pi.equipped = 1 AND pi.item_type = 'cosmetic'
				  AND u.is_active = 1`)
			if err == nil {
				defer frameRows.Close()
				frames := map[string]string{}
				for frameRows.Next() {
					var uname, key string
					if frameRows.Scan(&uname, &key) == nil {
						frames[uname] = key
					}
				}
				for i := range rawEntries {
					uname := rawEntries[i].entry["username"].(string)
					rawEntries[i].entry["equipped_frame"] = frames[uname]
				}
			}
		}

		result := make([]map[string]interface{}, len(rawEntries))
		for i, e := range rawEntries {
			result[i] = e.entry
		}
		jsonResponse(w, http.StatusOK, result)
	}
}
