package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const discordAPIBase = "https://discord.com/api/v10"

const apxGuildID = "935593651696963585"

// apxRankRoles are the six progression rank roles on the APX guild.
// Ordered E→S (lowest to highest) so that iterating in reverse gives the highest rank first.
// Names are single letters to stay consistent with levelToRank() and frontend CSS classes.
var apxRankRoles = []DiscordRole{
	{ID: "1387208154739376223", Name: "E"},
	{ID: "1387209340909387858", Name: "D"},
	{ID: "1387209465358712863", Name: "C"},
	{ID: "1391281919106355271", Name: "B"},
	{ID: "1391281906791747624", Name: "A"},
	{ID: "1391281999032877096", Name: "S"},
}

// extractRankRole returns the highest rank role found in memberRoles, or "" if none.
func extractRankRole(memberRoles []string) string {
	roleSet := make(map[string]bool, len(memberRoles))
	for _, id := range memberRoles {
		roleSet[id] = true
	}
	for i := len(apxRankRoles) - 1; i >= 0; i-- {
		if roleSet[apxRankRoles[i].ID] {
			return apxRankRoles[i].Name
		}
	}
	return ""
}

func discordBotToken() string     { return os.Getenv("DISCORD_TOKEN") }
func discordClientID() string     { return os.Getenv("DISCORD_CLIENT_ID") }
func discordClientSecret() string { return os.Getenv("DISCORD_CLIENT_SECRET") }
func discordRedirectURI() string  { return os.Getenv("DISCORD_REDIRECT_URI") }
func discordScopes() string {
	if s := os.Getenv("DISCORD_SCOPES"); s != "" {
		return s
	}
	return "identify guilds guilds.members.read email"
}

// linksPageURL is where the user ends up after OAuth.
func linksPageURL() string {
	base := os.Getenv("APP_BASE_URL") // e.g. https://apx-team.com
	return base + "/links"
}

// handleDiscordOAuth initiates the Discord OAuth2 flow.
// GET /api/auth/discord
func handleDiscordOAuth(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		if discordClientID() == "" {
			jsonError(w, http.StatusServiceUnavailable, "Discord OAuth not configured")
			return
		}

		cookie, err := r.Cookie("session")
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		// Generate random state
		b := make([]byte, 16)
		if _, err := rand.Read(b); err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		state := hex.EncodeToString(b)

		if err := CreateOAuthState(db, state, user.ID, "", time.Now().Add(10*time.Minute)); err != nil {
			log.Printf("CreateOAuthState error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		authURL := fmt.Sprintf(
			"https://discord.com/oauth2/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&state=%s",
			url.QueryEscape(discordClientID()),
			url.QueryEscape(discordRedirectURI()),
			url.QueryEscape(discordScopes()),
			url.QueryEscape(state),
		)
		http.Redirect(w, r, authURL, http.StatusFound)
	}
}

// handleDiscordCallback handles the Discord OAuth2 callback.
// GET /api/auth/discord/callback
func handleDiscordCallback(db *sql.DB, neonDB *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		q := r.URL.Query()
		code := q.Get("code")
		state := q.Get("state")
		errParam := q.Get("error")

		redirectFail := func(reason string) {
			http.Redirect(w, r, linksPageURL()+"?discord=error&reason="+url.QueryEscape(reason), http.StatusFound)
		}

		if errParam != "" {
			redirectFail(errParam)
			return
		}
		if code == "" || state == "" {
			redirectFail("missing_params")
			return
		}

		oauthState, err := GetAndDeleteOAuthState(db, state)
		if err != nil {
			redirectFail("invalid_state")
			return
		}

		// Exchange code for access token
		token, err := exchangeDiscordCode(code)
		if err != nil {
			log.Printf("Discord token exchange error: %v", err)
			redirectFail("token_exchange_failed")
			return
		}

		// Fetch Discord user info
		discordUser, err := fetchDiscordUser(token)
		if err != nil {
			log.Printf("Discord user fetch error: %v", err)
			redirectFail("user_fetch_failed")
			return
		}

		// Save to linked_accounts
		displayName := discordUser.Username
		if discordUser.GlobalName != "" {
			displayName = discordUser.GlobalName
		}
		if err := UpsertLinkedAccount(db, oauthState.UserID, "discord", discordUser.ID, displayName, discordUser.AvatarURL(), ""); err != nil {
			log.Printf("UpsertLinkedAccount error: %v", err)
			redirectFail("db_error")
			return
		}

		// Sync apx_id into bot_users table in NeonDB
		if neonDB != nil {
			if err := UpdateBotUserApxID(neonDB, discordUser.ID, oauthState.UserID); err != nil {
				log.Printf("UpdateBotUserApxID error: %v", err)
			}
		}

		// Check APX community guild membership and roles
		discordData := buildDiscordData(token, displayName)
		discordJSON, err := json.Marshal(discordData)
		if err != nil {
			log.Printf("discord data marshal error: %v", err)
		} else {
			if err := UpsertDiscordData(db, oauthState.UserID, string(discordJSON)); err != nil {
				log.Printf("UpsertDiscordData error: %v", err)
			}
		}

		// Sync rank role to progression_users immediately on Discord link
		if discordData.ApxCommunityGuild {
			if err := updateProgressionUserRank(db, oauthState.UserID, discordUser.ID, discordData.Rank); err != nil {
				log.Printf("updateProgressionUserRank at Discord link: %v", err)
			}
		}

		// Award "APX MEMBER" badge if user is in the APX community guild
		if discordData.ApxCommunityGuild {
			if badgeID, err := GetBadgeIDByName(db, "APX MEMBER"); err == nil {
				if err := UpsertUserBadge(db, oauthState.UserID, badgeID, 1); err != nil {
					log.Printf("UpsertUserBadge APX MEMBER error: %v", err)
				}
			} else {
				log.Printf("GetBadgeIDByName APX MEMBER error: %v", err)
			}
		}

		http.Redirect(w, r, linksPageURL()+"?discord=ok", http.StatusFound)
	}
}

type discordTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
}

type discordUserResponse struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	GlobalName string `json:"global_name"`
	Avatar     string `json:"avatar"` // hash; empty = default avatar
}

func (u *discordUserResponse) AvatarURL() string {
	if u.Avatar != "" {
		return fmt.Sprintf("https://cdn.discordapp.com/avatars/%s/%s.png?size=128", u.ID, u.Avatar)
	}
	// Default avatar: index based on user ID
	var id int64
	fmt.Sscanf(u.ID, "%d", &id)
	return fmt.Sprintf("https://cdn.discordapp.com/embed/avatars/%d.png", (id>>22)%6)
}

func exchangeDiscordCode(code string) (string, error) {
	data := url.Values{}
	data.Set("client_id", discordClientID())
	data.Set("client_secret", discordClientSecret())
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", discordRedirectURI())

	resp, err := http.Post(
		discordAPIBase+"/oauth2/token",
		"application/x-www-form-urlencoded",
		strings.NewReader(data.Encode()),
	)
	if err != nil {
		return "", fmt.Errorf("post token: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("discord token error %d: %s", resp.StatusCode, body)
	}

	var t discordTokenResponse
	if err := json.Unmarshal(body, &t); err != nil {
		return "", fmt.Errorf("decode token: %w", err)
	}
	return t.AccessToken, nil
}

type discordGuildMemberResponse struct {
	Roles []string `json:"roles"`
}

func fetchDiscordGuildMember(accessToken, guildID string) (*discordGuildMemberResponse, error) {
	req, _ := http.NewRequest(http.MethodGet, discordAPIBase+"/users/@me/guilds/"+guildID+"/member", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get guild member: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusForbidden {
		return nil, nil // not a member
	}

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("guild member error %d: %s", resp.StatusCode, body)
	}

	var m discordGuildMemberResponse
	if err := json.Unmarshal(body, &m); err != nil {
		return nil, fmt.Errorf("decode guild member: %w", err)
	}
	return &m, nil
}

func buildDiscordData(accessToken, displayName string) DiscordData {
	data := DiscordData{
		DiscordUsername:   displayName,
		ApxCommunityGuild: false,
		Roles:             []DiscordRole{},
	}

	member, err := fetchDiscordGuildMember(accessToken, apxGuildID)
	if err != nil {
		log.Printf("fetchDiscordGuildMember error: %v", err)
		return data
	}
	if member == nil {
		return data // not in guild
	}

	data.ApxCommunityGuild = true

	roleSet := make(map[string]bool, len(member.Roles))
	for _, id := range member.Roles {
		roleSet[id] = true
	}
	for _, r := range apxRankRoles {
		if roleSet[r.ID] {
			data.Roles = append(data.Roles, r)
		}
	}
	data.Rank = extractRankRole(member.Roles)
	return data
}

func fetchDiscordUser(accessToken string) (*discordUserResponse, error) {
	req, _ := http.NewRequest(http.MethodGet, discordAPIBase+"/users/@me", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("discord user error %d: %s", resp.StatusCode, body)
	}

	var u discordUserResponse
	if err := json.Unmarshal(body, &u); err != nil {
		return nil, fmt.Errorf("decode user: %w", err)
	}
	return &u, nil
}

// SyncGuildMemberUsernames fetches all members of apxGuildID from the Discord API
// and updates the discord_username column in bot_users for every known user.
// Display name priority: guild nickname > global_name > username.
func SyncGuildMemberUsernames(db *sql.DB) error {
	token := discordBotToken()
	if token == "" {
		return fmt.Errorf("DISCORD_TOKEN not set")
	}

	// Discord allows up to 1000 per request; paginate using after= if needed.
	var after string
	updated := 0
	for {
		apiURL := fmt.Sprintf("%s/guilds/%s/members?limit=1000", discordAPIBase, apxGuildID)
		if after != "" {
			apiURL += "&after=" + after
		}

		req, err := http.NewRequest(http.MethodGet, apiURL, nil)
		if err != nil {
			return fmt.Errorf("build request: %w", err)
		}
		req.Header.Set("Authorization", "Bot "+token)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return fmt.Errorf("guild members request: %w", err)
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("guild members error %d: %s", resp.StatusCode, body)
		}

		type discordUser struct {
			ID         string `json:"id"`
			Username   string `json:"username"`
			GlobalName string `json:"global_name"`
		}
		type guildMember struct {
			User *discordUser `json:"user"`
			Nick string       `json:"nick"`
		}
		var members []guildMember
		if err := json.Unmarshal(body, &members); err != nil {
			return fmt.Errorf("decode members: %w", err)
		}
		if len(members) == 0 {
			break
		}

		for _, m := range members {
			if m.User == nil {
				continue
			}
			displayName := m.Nick
			if displayName == "" {
				displayName = m.User.GlobalName
			}
			if displayName == "" {
				displayName = m.User.Username
			}
			if _, err := db.Exec(
				"UPDATE bot_users SET discord_username = $1 WHERE user_id = $2 AND guild_id = $3",
				displayName, m.User.ID, apxGuildID,
			); err != nil {
				log.Printf("SyncGuildMemberUsernames: update %s: %v", m.User.ID, err)
			} else {
				updated++
			}
		}

		if len(members) < 1000 {
			break // last page
		}
		after = members[len(members)-1].User.ID
	}

	log.Printf("SyncGuildMemberUsernames: updated %d bot_users rows", updated)
	return nil
}
