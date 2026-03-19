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
		"SELECT user_id FROM apx_linked_accounts WHERE service = 'discord' AND service_id = $1",
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
		INSERT INTO apx_progression_users (user_id, discord_id, level, xp, currency_balance, updated_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
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
		INSERT INTO apx_progression_inventory
			(user_id, inventory_id, item_id, name, rarity, item_type, asset_key, sell_price)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
		"DELETE FROM apx_progression_inventory WHERE user_id = $1 AND inventory_id = $2",
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
		INSERT INTO apx_progression_users (user_id, discord_id, level, xp, currency_balance, discord_rank, updated_at)
		VALUES ($1, $2, 0, 0, 0, $3, CURRENT_TIMESTAMP)
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
			"UPDATE apx_progression_inventory SET equipped = false WHERE user_id = $1 AND inventory_id = $2",
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
		"UPDATE apx_progression_inventory SET equipped = false WHERE user_id = $1 AND item_type = $2",
		userID, itemType,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(
		"UPDATE apx_progression_inventory SET equipped = true WHERE user_id = $1 AND inventory_id = $2",
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
func handleProgressionProfile(db *sql.DB, neonDB *sql.DB) http.HandlerFunc {
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
			"SELECT id FROM apx_users WHERE username = $1 AND is_active = true", username,
		).Scan(&userID); err != nil {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}

		// Fetch Discord ID from apx_linked_accounts
		var discordID string
		_ = db.QueryRow(
			"SELECT service_id FROM apx_linked_accounts WHERE user_id = $1 AND service = 'discord'",
			userID,
		).Scan(&discordID)

		// Live data from NeonDB (bot_users) — source of truth
		var level, balance int
		rank := ""
		if discordID != "" && neonDB != nil {
			var neonRankRoleID sql.NullInt64
			if err := neonDB.QueryRow(
				"SELECT level, gold, rank_role_id FROM bot_users WHERE user_id = $1 AND guild_id = $2",
				discordID, apxGuildID,
			).Scan(&level, &balance, &neonRankRoleID); err == nil && neonRankRoleID.Valid {
				roleIDStr := strconv.FormatInt(neonRankRoleID.Int64, 10)
				for i := len(apxRankRoles) - 1; i >= 0; i-- {
					if apxRankRoles[i].ID == roleIDStr {
						rank = apxRankRoles[i].Name
						break
					}
				}
			}
		}

		rows, err := db.Query(`
			SELECT inventory_id, name, rarity, item_type, asset_key
			FROM apx_progression_inventory
			WHERE user_id = $1 AND equipped = true
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
			"currency_balance": balance,
			"rank":             rank,
			"equipped_items":   equippedItems,
		})
	}
}

// GET /api/progression/me  (session cookie required)
func handleProgressionMe(db *sql.DB, neonDB *sql.DB) http.HandlerFunc {
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

		// Fetch Discord ID from apx_linked_accounts
		var discordID string
		_ = db.QueryRow(
			"SELECT service_id FROM apx_linked_accounts WHERE user_id = $1 AND service = 'discord'",
			user.ID,
		).Scan(&discordID)

		// Live data from NeonDB (bot_users) — source of truth
		var level, balance int
		rank := ""
		if discordID != "" && neonDB != nil {
			var neonRankRoleID sql.NullInt64
			if err := neonDB.QueryRow(
				"SELECT level, gold, rank_role_id FROM bot_users WHERE user_id = $1 AND guild_id = $2",
				discordID, apxGuildID,
			).Scan(&level, &balance, &neonRankRoleID); err == nil && neonRankRoleID.Valid {
				roleIDStr := strconv.FormatInt(neonRankRoleID.Int64, 10)
				for i := len(apxRankRoles) - 1; i >= 0; i-- {
					if apxRankRoles[i].ID == roleIDStr {
						rank = apxRankRoles[i].Name
						break
					}
				}
			}
		}

		rows, err := db.Query(`
			SELECT inventory_id, name, rarity, item_type, asset_key, equipped
			FROM apx_progression_inventory
			WHERE user_id = $1
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
			var equipped bool
			if err := rows.Scan(&invID, &name, &rarity, &itemType, &assetKey, &equipped); err != nil {
				continue
			}
			inventory = append(inventory, map[string]interface{}{
				"inventory_id": invID,
				"name":         name,
				"rarity":       rarity,
				"item_type":    itemType,
				"asset_key":    assetKey,
				"equipped":     equipped,
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

// GET /api/progression/leaderboard?limit=10
// Returns { entries: [...], my_position: {...}|null }
// Pulls directly from bot_users (all guild members, not just website accounts).
func handleProgressionLeaderboard(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		limit := 10
		if v := r.URL.Query().Get("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 50 {
				limit = n
			}
		}

		rows, err := db.Query(`
			SELECT
			  bu.user_id,
			  bu.xp,
			  bu.level,
			  bu.gold,
			  bu.discord_username,
			  bu.rank_role_id,
			  COALESCE(u.username,  '') AS username,
			  COALESCE(u.nickname,  '') AS nickname,
			  COALESCE(u.avatar_url,'') AS avatar_url
			FROM bot_users bu
			LEFT JOIN apx_users u ON u.id = NULLIF(bu.apx_id, '')::bigint
			WHERE bu.guild_id = $1
			ORDER BY bu.level DESC, bu.xp DESC
			LIMIT $2`,
			apxGuildID, limit,
		)
		if err != nil {
			log.Printf("leaderboard query: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		defer rows.Close()

		buildEntry := func(pos int, userID, discordUsername string, xp, level, gold int, rankRoleID sql.NullInt64, username, nickname, avatarURL string) map[string]interface{} {
			progRank := levelToRank(level)
			if rankRoleID.Valid {
				roleIDStr := strconv.FormatInt(rankRoleID.Int64, 10)
				for i := len(apxRankRoles) - 1; i >= 0; i-- {
					if apxRankRoles[i].ID == roleIDStr {
						progRank = apxRankRoles[i].Name
						break
					}
				}
			}
			return map[string]interface{}{
				"rank":             pos,
				"user_id":          userID,
				"discord_username": discordUsername,
				"username":         username,
				"nickname":         nickname,
				"avatar_url":       avatarURL,
				"level":            level,
				"xp":               xp,
				"gold":             gold,
				"prog_rank":        progRank,
			}
		}

		entries := []map[string]interface{}{}
		seenUserIDs := map[string]bool{}
		pos := 1
		for rows.Next() {
			var userID, discordUsername, username, nickname, avatarURL string
			var xp, level, gold int
			var rankRoleID sql.NullInt64
			if err := rows.Scan(&userID, &xp, &level, &gold, &discordUsername, &rankRoleID, &username, &nickname, &avatarURL); err != nil {
				continue
			}
			entries = append(entries, buildEntry(pos, userID, discordUsername, xp, level, gold, rankRoleID, username, nickname, avatarURL))
			seenUserIDs[userID] = true
			pos++
		}
		rows.Close()

		// Determine logged-in user's own position (only if they have Discord linked and are in bot_users)
		var myPosition map[string]interface{}
		if cookie, err := r.Cookie("session"); err == nil {
			if user, err := GetSessionUser(db, cookie.Value); err == nil {
				var discordID string
				_ = db.QueryRow(
					"SELECT service_id FROM apx_linked_accounts WHERE user_id = $1 AND service = 'discord'",
					user.ID,
				).Scan(&discordID)

				if discordID != "" && !seenUserIDs[discordID] {
					// Calculate rank position
					var myRank int
					err := db.QueryRow(`
						SELECT COUNT(*) + 1
						FROM bot_users
						WHERE guild_id = $1
						  AND (
						    level > (SELECT level FROM bot_users WHERE user_id = $2 AND guild_id = $1)
						    OR (
						      level = (SELECT level FROM bot_users WHERE user_id = $2 AND guild_id = $1)
						      AND xp > (SELECT xp FROM bot_users WHERE user_id = $2 AND guild_id = $1)
						    )
						  )`,
						apxGuildID, discordID,
					).Scan(&myRank)
					if err == nil {
						var myXP, myLevel, myGold int
						var myDiscordUsername string
						var myRankRoleID sql.NullInt64
						err2 := db.QueryRow(`
							SELECT xp, level, gold, discord_username, rank_role_id
							FROM bot_users WHERE user_id = $1 AND guild_id = $2`,
							discordID, apxGuildID,
						).Scan(&myXP, &myLevel, &myGold, &myDiscordUsername, &myRankRoleID)
						if err2 == nil {
							myPosition = buildEntry(myRank, discordID, myDiscordUsername, myXP, myLevel, myGold, myRankRoleID, user.Username, user.Nickname, user.AvatarURL)
						}
					}
				}
			}
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"entries":     entries,
			"my_position": myPosition,
		})
	}
}
