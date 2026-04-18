package main

import (
	"crypto/rand"
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
var apxRankRoles = []DiscordRole{
	{ID: "1387208154739376223", Name: "E"},
	{ID: "1387209340909387858", Name: "D"},
	{ID: "1387209465358712863", Name: "C"},
	{ID: "1391281919106355271", Name: "B"},
	{ID: "1391281906791747624", Name: "A"},
	{ID: "1391281999032877096", Name: "S"},
}

// discordDisplayRoles defines which guild roles are shown on public profiles.
var discordDisplayRoles = []DiscordRole{
	{ID: "1357853817428906195", Name: "Admin"},
	{ID: "1426317112099475598", Name: "Moderator"},
	{ID: "1483953978856308908", Name: "Staff"},
	{ID: "1474384456256196688", Name: "Head of Legal Team"},
	{ID: "1474384074314481664", Name: "Head of Design"},
	{ID: "1474384160108970079", Name: "Coach"},
	{ID: "1474384220024733779", Name: "Landgraf Racing - Owner"},
	{ID: "1477965648867885148", Name: "Landgraf Racing"},
	{ID: "1159145438453170237", Name: "Discord Server Booster"},
	{ID: "1422140683589910558", Name: "Enjoyer"},
	{ID: "935595628396937296", Name: "Member"},
}

// fetchGuildMemberRolesByBot fetches a guild member's role IDs using the bot token.
func fetchGuildMemberRolesByBot(discordUserID string) ([]string, error) {
	token := discordBotToken()
	if token == "" {
		return nil, fmt.Errorf("DISCORD_TOKEN not set")
	}

	req, err := http.NewRequest(http.MethodGet, discordAPIBase+"/guilds/"+apxGuildID+"/members/"+discordUserID, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Authorization", "Bot "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get guild member: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("guild member error %d: %s", resp.StatusCode, body)
	}

	var m discordGuildMemberResponse
	if err := json.Unmarshal(body, &m); err != nil {
		return nil, fmt.Errorf("decode guild member: %w", err)
	}
	return m.Roles, nil
}

// matchDiscordDisplayRoles returns the display names of roles the member has.
func matchDiscordDisplayRoles(memberRoles []string) []string {
	roleSet := make(map[string]bool, len(memberRoles))
	for _, id := range memberRoles {
		roleSet[id] = true
	}
	var matched []string
	for _, r := range discordDisplayRoles {
		if roleSet[r.ID] {
			matched = append(matched, r.Name)
		}
	}
	return matched
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

func linksPageURL() string {
	base := os.Getenv("APP_BASE_URL")
	return base + "/links"
}

// GET /auth/discord
func handleDiscordOAuth(apx *ApxClient) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		b := make([]byte, 16)
		if _, err := rand.Read(b); err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		state := hex.EncodeToString(b)

		if err := apx.CreateOAuthState(state, user.ID, "", time.Now().Add(10*time.Minute)); err != nil {
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

// GET /auth/discord/callback
func handleDiscordCallback(apx *ApxClient) http.HandlerFunc {
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

		oauthState, err := apx.GetAndDeleteOAuthState(state)
		if err != nil {
			redirectFail("invalid_state")
			return
		}

		token, err := exchangeDiscordCode(code)
		if err != nil {
			log.Printf("Discord token exchange error: %v", err)
			redirectFail("token_exchange_failed")
			return
		}

		discordUser, err := fetchDiscordUser(token)
		if err != nil {
			log.Printf("Discord user fetch error: %v", err)
			redirectFail("user_fetch_failed")
			return
		}

		displayName := discordUser.Username
		if discordUser.GlobalName != "" {
			displayName = discordUser.GlobalName
		}
		if err := apx.UpsertLinkedAccount(oauthState.UserID, "discord", discordUser.ID, displayName, discordUser.AvatarURL(), ""); err != nil {
			log.Printf("UpsertLinkedAccount error: %v", err)
			redirectFail("db_error")
			return
		}

		// Sync apx_id into bot_users
		if err := apx.UpdateBotUserApxID(discordUser.ID, oauthState.UserID); err != nil {
			log.Printf("UpdateBotUserApxID error: %v", err)
		}

		// Check APX community guild membership and roles
		discordData := buildDiscordData(token, displayName)

		// Sync rank role to progression_users immediately on Discord link
		if discordData.ApxCommunityGuild && discordData.Rank != "" {
			if err := apx.UpdateProgressionUserRank(oauthState.UserID, discordUser.ID, discordData.Rank); err != nil {
				log.Printf("UpdateProgressionUserRank at Discord link: %v", err)
			}
		}

		// Award "APX MEMBER" badge if user is in the APX community guild
		if discordData.ApxCommunityGuild {
			if badgeID, err := apx.GetBadgeIDByName("APX MEMBER"); err == nil {
				if err := apx.UpsertUserBadge(oauthState.UserID, badgeID, 1); err != nil {
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
	Avatar     string `json:"avatar"`
}

func (u *discordUserResponse) AvatarURL() string {
	if u.Avatar != "" {
		return fmt.Sprintf("https://cdn.discordapp.com/avatars/%s/%s.png?size=128", u.ID, u.Avatar)
	}
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
		return nil, nil
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
		return data
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
