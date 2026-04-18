package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
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

func rankFromRoleID(roleID *string) string {
	if roleID == nil {
		return ""
	}
	for i := len(apxRankRoles) - 1; i >= 0; i-- {
		if apxRankRoles[i].ID == *roleID {
			return apxRankRoles[i].Name
		}
	}
	return ""
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

// ── Internal Handlers (Bot → Go) ──

// POST /api/internal/progression/user-sync
func handleInternalUserSync(apx *ApxClient) http.HandlerFunc {
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
		userID, err := apx.ResolveUserIDByDiscord(req.UserID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": false})
			return
		}
		if err := apx.UpsertProgressionUser(userID, req.UserID, req.Level, req.XP, req.CurrencyBalance); err != nil {
			log.Printf("user-sync: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": true})
	}
}

// POST /api/internal/progression/inventory-add
func handleInternalInventoryAdd(apx *ApxClient) http.HandlerFunc {
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
		userID, err := apx.ResolveUserIDByDiscord(req.UserID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": false})
			return
		}
		if err := apx.InsertInventoryItem(userID, req.InventoryID, req.ItemID, req.Name, req.Rarity, req.ItemType, req.AssetKey, req.SellPrice); err != nil {
			log.Printf("inventory-add: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": true})
	}
}

// POST /api/internal/progression/inventory-remove
func handleInternalInventoryRemove(apx *ApxClient) http.HandlerFunc {
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
		userID, err := apx.ResolveUserIDByDiscord(req.UserID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": false})
			return
		}
		if err := apx.DeleteInventoryItem(userID, req.InventoryID); err != nil {
			log.Printf("inventory-remove: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": true})
	}
}

// POST /api/internal/progression/inventory-equip
func handleInternalInventoryEquip(apx *ApxClient) http.HandlerFunc {
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
		userID, err := apx.ResolveUserIDByDiscord(req.UserID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": false})
			return
		}
		if err := apx.EquipInventoryItem(userID, req.InventoryID, req.ItemType, req.Equipped); err != nil {
			log.Printf("inventory-equip: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": true})
	}
}

// POST /api/internal/progression/role-sync
func handleInternalRoleSync(apx *ApxClient) http.HandlerFunc {
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
		if len(rank) == 6 && strings.HasSuffix(rank[1:], "-Rank") {
			rank = string(rank[0])
		} else if len(rank) == 6 && strings.HasSuffix(rank[1:], "-rank") {
			rank = string(rank[0])
		}
		userID, err := apx.ResolveUserIDByDiscord(req.UserID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": false})
			return
		}
		if err := apx.UpdateProgressionUserRank(userID, req.UserID, rank); err != nil {
			log.Printf("role-sync: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "linked": true})
	}
}

// ── Public Handlers (Website → Go) ──

// GET /api/progression/profile?u=<username>
func handleProgressionProfile(apx *ApxClient) http.HandlerFunc {
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

		u, err := apx.GetUserByUsername(username)
		if err != nil {
			jsonError(w, http.StatusNotFound, "user not found")
			return
		}

		var discordID string
		links, _ := apx.GetLinkedAccounts(u.ID)
		for _, l := range links {
			if l.Service == "discord" {
				discordID = l.ServiceID
				break
			}
		}

		var level, balance int
		rank := ""
		if discordID != "" {
			if botUser, err := apx.GetBotUser(discordID, apxGuildID); err == nil {
				level = botUser.Level
				balance = botUser.Gold
				rank = rankFromRoleID(botUser.RankRoleID)
			}
		}

		equippedItems, err := apx.GetEquippedItems(u.ID)
		if err != nil {
			equippedItems = []ProgressionInventoryItem{}
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
func handleProgressionMe(apx *ApxClient) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		var discordID string
		links, _ := apx.GetLinkedAccounts(user.ID)
		for _, l := range links {
			if l.Service == "discord" {
				discordID = l.ServiceID
				break
			}
		}

		var level, balance int
		rank := ""
		if discordID != "" {
			if botUser, err := apx.GetBotUser(discordID, apxGuildID); err == nil {
				level = botUser.Level
				balance = botUser.Gold
				rank = rankFromRoleID(botUser.RankRoleID)
			}
		}

		inventory, err := apx.GetUserItems(user.ID)
		if err != nil {
			inventory = []ProgressionInventoryItem{}
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
// Returns { entries: [...], my_position: null }
func handleProgressionLeaderboard(apx *ApxClient) http.HandlerFunc {
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

		users, err := apx.GetBotLeaderboard(apxGuildID, limit)
		if err != nil {
			log.Printf("leaderboard query: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		entries := make([]map[string]interface{}, 0, len(users))
		for i, u := range users {
			progRank := levelToRank(u.Level)
			if r := rankFromRoleID(u.RankRoleID); r != "" {
				progRank = r
			}
			entries = append(entries, map[string]interface{}{
				"rank":             i + 1,
				"user_id":          u.UserID,
				"discord_username": u.DiscordUsername,
				"username":         "",
				"nickname":         "",
				"avatar_url":       "",
				"level":            u.Level,
				"xp":               u.XP,
				"gold":             u.Gold,
				"prog_rank":        progRank,
			})
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"entries":     entries,
			"my_position": nil,
		})
	}
}
