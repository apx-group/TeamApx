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

func discordClientID() string     { return os.Getenv("DISCORD_CLIENT_ID") }
func discordClientSecret() string { return os.Getenv("DISCORD_CLIENT_SECRET") }
func discordRedirectURI() string  { return os.Getenv("DISCORD_REDIRECT_URI") }

// linksPageURL is where the user ends up after OAuth.
func linksPageURL() string {
	base := os.Getenv("APP_BASE_URL") // e.g. https://apx-team.com
	return base + "/src/pages/links.html"
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
			http.Redirect(w, r, "/src/pages/login.html", http.StatusFound)
			return
		}
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil {
			http.Redirect(w, r, "/src/pages/login.html", http.StatusFound)
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
			"https://discord.com/oauth2/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=identify+email&state=%s",
			url.QueryEscape(discordClientID()),
			url.QueryEscape(discordRedirectURI()),
			url.QueryEscape(state),
		)
		http.Redirect(w, r, authURL, http.StatusFound)
	}
}

// handleDiscordCallback handles the Discord OAuth2 callback.
// GET /api/auth/discord/callback
func handleDiscordCallback(db *sql.DB) http.HandlerFunc {
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
		if err := UpsertLinkedAccount(db, oauthState.UserID, "discord", discordUser.ID, displayName, discordUser.AvatarURL()); err != nil {
			log.Printf("UpsertLinkedAccount error: %v", err)
			redirectFail("db_error")
			return
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
