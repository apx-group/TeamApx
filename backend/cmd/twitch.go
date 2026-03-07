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

func twitchClientID() string     { return os.Getenv("TWITCH_CLIENT_ID") }
func twitchClientSecret() string { return os.Getenv("TWITCH_CLIENT_SECRET") }
func twitchRedirectURI() string  { return os.Getenv("TWITCH_REDIRECT_URI") }

// GET /auth/twitch
func handleTwitchOAuth(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if twitchClientID() == "" {
			jsonError(w, http.StatusServiceUnavailable, "Twitch OAuth not configured")
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

		b := make([]byte, 16)
		if _, err := rand.Read(b); err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		state := hex.EncodeToString(b)

		if err := CreateOAuthState(db, state, user.ID, "", time.Now().Add(10*time.Minute)); err != nil {
			log.Printf("CreateOAuthState (twitch) error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		authURL := fmt.Sprintf(
			"https://id.twitch.tv/oauth2/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=user%%3Aread%%3Aemail&state=%s",
			url.QueryEscape(twitchClientID()),
			url.QueryEscape(twitchRedirectURI()),
			url.QueryEscape(state),
		)
		http.Redirect(w, r, authURL, http.StatusFound)
	}
}

// GET /auth/twitch/callback
func handleTwitchCallback(db *sql.DB) http.HandlerFunc {
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
			http.Redirect(w, r, linksPageURL()+"?twitch=error&reason="+url.QueryEscape(reason), http.StatusFound)
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

		token, err := exchangeTwitchCode(code)
		if err != nil {
			log.Printf("Twitch token exchange error: %v", err)
			redirectFail("token_exchange_failed")
			return
		}

		twitchUser, err := fetchTwitchUser(token)
		if err != nil {
			log.Printf("Twitch user fetch error: %v", err)
			redirectFail("user_fetch_failed")
			return
		}

		if err := UpsertLinkedAccount(db, oauthState.UserID, "twitch", twitchUser.ID, twitchUser.DisplayName, twitchUser.ProfileImageURL); err != nil {
			log.Printf("UpsertLinkedAccount (twitch) error: %v", err)
			redirectFail("db_error")
			return
		}

		http.Redirect(w, r, linksPageURL()+"?twitch=ok", http.StatusFound)
	}
}

type twitchTokenResponse struct {
	AccessToken string `json:"access_token"`
}

type twitchUserResponse struct {
	ID              string `json:"id"`
	Login           string `json:"login"`
	DisplayName     string `json:"display_name"`
	ProfileImageURL string `json:"profile_image_url"`
}

func exchangeTwitchCode(code string) (string, error) {
	data := url.Values{}
	data.Set("client_id", twitchClientID())
	data.Set("client_secret", twitchClientSecret())
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	data.Set("redirect_uri", twitchRedirectURI())

	resp, err := http.Post(
		"https://id.twitch.tv/oauth2/token",
		"application/x-www-form-urlencoded",
		strings.NewReader(data.Encode()),
	)
	if err != nil {
		return "", fmt.Errorf("post token: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("twitch token error %d: %s", resp.StatusCode, body)
	}

	var t twitchTokenResponse
	if err := json.Unmarshal(body, &t); err != nil {
		return "", fmt.Errorf("decode token: %w", err)
	}
	return t.AccessToken, nil
}

func fetchTwitchUser(accessToken string) (*twitchUserResponse, error) {
	req, _ := http.NewRequest(http.MethodGet, "https://api.twitch.tv/helix/users", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Client-Id", twitchClientID())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("twitch user error %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Data []twitchUserResponse `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("decode user: %w", err)
	}
	if len(result.Data) == 0 {
		return nil, fmt.Errorf("no user data returned")
	}
	return &result.Data[0], nil
}
