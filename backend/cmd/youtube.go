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

func ytClientID() string     { return os.Getenv("YT_CLIENT_ID") }
func ytClientSecret() string { return os.Getenv("YT_CLIENT_SECRET") }
func ytRedirectURI() string  { return os.Getenv("YT_REDIRECT_URI") }

const (
	ytAuthURL  = "https://accounts.google.com/o/oauth2/v2/auth"
	ytTokenURL = "https://oauth2.googleapis.com/token"
	ytScope    = "openid profile https://www.googleapis.com/auth/youtube.readonly"
)

// GET /auth/youtube
func handleYouTubeOAuth(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if ytClientID() == "" {
			jsonError(w, http.StatusServiceUnavailable, "YouTube OAuth not configured")
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
			log.Printf("CreateOAuthState (youtube) error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		authURL := fmt.Sprintf(
			"%s?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&state=%s&access_type=offline",
			ytAuthURL,
			url.QueryEscape(ytClientID()),
			url.QueryEscape(ytRedirectURI()),
			url.QueryEscape(ytScope),
			url.QueryEscape(state),
		)
		http.Redirect(w, r, authURL, http.StatusFound)
	}
}

// GET /auth/youtube/callback
func handleYouTubeCallback(db *sql.DB) http.HandlerFunc {
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
			http.Redirect(w, r, linksPageURL()+"?yt=error&reason="+url.QueryEscape(reason), http.StatusFound)
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

		accessToken, err := exchangeYouTubeCode(code)
		if err != nil {
			log.Printf("YouTube token exchange error: %v", err)
			redirectFail("token_exchange_failed")
			return
		}

		channel, err := fetchYouTubeChannel(accessToken)
		if err != nil {
			log.Printf("YouTube channel fetch error: %v", err)
			redirectFail("channel_fetch_failed")
			return
		}

		if err := UpsertLinkedAccount(db, oauthState.UserID, "youtube", channel.ID, channel.displayName(), channel.avatarURL(), channel.profileURL()); err != nil {
			log.Printf("UpsertLinkedAccount (youtube) error: %v", err)
			redirectFail("db_error")
			return
		}

		http.Redirect(w, r, linksPageURL()+"?yt=ok", http.StatusFound)
	}
}

func exchangeYouTubeCode(code string) (string, error) {
	data := url.Values{}
	data.Set("client_id", ytClientID())
	data.Set("client_secret", ytClientSecret())
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	data.Set("redirect_uri", ytRedirectURI())

	resp, err := http.Post(ytTokenURL, "application/x-www-form-urlencoded", strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("post token: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("yt token error %d: %s", resp.StatusCode, body)
	}

	var t struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &t); err != nil {
		return "", fmt.Errorf("decode token: %w", err)
	}
	return t.AccessToken, nil
}

type ytChannel struct {
	ID     string
	Title  string
	Handle string
	Thumb  string
}

func (c *ytChannel) displayName() string {
	if c.Handle != "" {
		return c.Handle
	}
	return c.Title
}

func (c *ytChannel) avatarURL() string { return c.Thumb }

func (c *ytChannel) profileURL() string {
	if c.Handle != "" {
		h := c.Handle
		if !strings.HasPrefix(h, "@") {
			h = "@" + h
		}
		return "https://www.youtube.com/" + h
	}
	return "https://www.youtube.com/channel/" + c.ID
}

func fetchYouTubeChannel(accessToken string) (*ytChannel, error) {
	req, err := http.NewRequest(http.MethodGet,
		"https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get channel: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if os.Getenv("SMTP_HOST") == "" {
		log.Printf("[DEV] YT channel response: %s", body)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("yt channel error %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Items []struct {
			ID      string `json:"id"`
			Snippet struct {
				Title      string `json:"title"`
				CustomUrl  string `json:"customUrl"`
				Thumbnails struct {
					Default struct {
						URL string `json:"url"`
					} `json:"default"`
				} `json:"thumbnails"`
			} `json:"snippet"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("decode channel: %w", err)
	}
	if len(result.Items) == 0 {
		return nil, fmt.Errorf("no channel found")
	}

	item := result.Items[0]
	return &ytChannel{
		ID:     item.ID,
		Title:  item.Snippet.Title,
		Handle: item.Snippet.CustomUrl,
		Thumb:  item.Snippet.Thumbnails.Default.URL,
	}, nil
}
