package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
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

const (
	cmAuthURL  = "https://www.challengermode.com/oauth/authorize"
	cmTokenURL = "https://www.challengermode.com/oauth/token"
)

func cmClientID() string     { return os.Getenv("CM_CLIENT_ID") }
func cmClientSecret() string { return os.Getenv("CM_CLIENT_SECRET") }
func cmRedirectURI() string  { return os.Getenv("CM_REDIRECT_URI") }

func cmScope() string {
	if s := os.Getenv("CM_SCOPE"); s != "" {
		return s
	}
	return "openid"
}

// generatePKCE returns (codeVerifier, codeChallenge).
func generatePKCE() (verifier, challenge string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return
	}
	verifier = base64.RawURLEncoding.EncodeToString(b)
	h := sha256.Sum256([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(h[:])
	return
}

// GET /auth/challengermode
func handleChallengerModeOAuth(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if cmClientID() == "" {
			jsonError(w, http.StatusServiceUnavailable, "Challengermode OAuth not configured")
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

		codeVerifier, codeChallenge, err := generatePKCE()
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		stateBytes := make([]byte, 16)
		if _, err := rand.Read(stateBytes); err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		state := base64.RawURLEncoding.EncodeToString(stateBytes)

		if err := apx.CreateOAuthState(state, user.ID, codeVerifier, time.Now().Add(10*time.Minute)); err != nil {
			log.Printf("CreateOAuthState (cm) error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		authURL := fmt.Sprintf(
			"%s?client_id=%s&response_type=code&redirect_uri=%s&scope=%s&state=%s&code_challenge=%s&code_challenge_method=S256",
			cmAuthURL,
			url.QueryEscape(cmClientID()),
			url.QueryEscape(cmRedirectURI()),
			url.QueryEscape(cmScope()),
			url.QueryEscape(state),
			url.QueryEscape(codeChallenge),
		)
		http.Redirect(w, r, authURL, http.StatusFound)
	}
}

// GET /auth/challengermode/callback
func handleChallengerModeCallback(apx *ApxClient) http.HandlerFunc {
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
			http.Redirect(w, r, linksPageURL()+"?cm=error&reason="+url.QueryEscape(reason), http.StatusFound)
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

		cmUser, err := exchangeCMCode(code, oauthState.CodeVerifier)
		if err != nil {
			log.Printf("CM token exchange error: %v", err)
			redirectFail("token_exchange_failed")
			return
		}

		cmProfileURL := cmUser.profileURL()
		if cmProfileURL == "" {
			cmProfileURL = "https://www.challengermode.com/users/" + cmUser.id()
		}
		if err := apx.UpsertLinkedAccount(oauthState.UserID, "challengermode", cmUser.id(), cmUser.displayName(), cmUser.avatarURL(), cmProfileURL); err != nil {
			log.Printf("UpsertLinkedAccount (cm) error: %v", err)
			redirectFail("db_error")
			return
		}

		http.Redirect(w, r, linksPageURL()+"?cm=ok", http.StatusFound)
	}
}

// cmUserResponse contains the claims from the id_token JWT and userinfo endpoint.
type cmUserResponse struct {
	Sub      string `json:"sub"`
	Nickname string `json:"nickname"`
	Profile  string `json:"profile"`
	Picture  string `json:"picture"`
}

func (u *cmUserResponse) id() string          { return u.Sub }
func (u *cmUserResponse) displayName() string { return u.Nickname }
func (u *cmUserResponse) profileURL() string  { return u.Profile }
func (u *cmUserResponse) avatarURL() string   { return u.Picture }

func exchangeCMCode(code, codeVerifier string) (*cmUserResponse, error) {
	data := url.Values{}
	data.Set("client_id", cmClientID())
	data.Set("client_secret", cmClientSecret())
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", cmRedirectURI())
	data.Set("code_verifier", codeVerifier)

	resp, err := http.Post(cmTokenURL, "application/x-www-form-urlencoded", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("post token: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("cm token error %d: %s", resp.StatusCode, body)
	}

	if os.Getenv("SMTP_HOST") == "" {
		log.Printf("[DEV] CM token response: %s", body)
	}

	var tokenResp struct {
		IDToken     string `json:"id_token"`
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("decode token response: %w", err)
	}
	if tokenResp.IDToken == "" {
		return nil, fmt.Errorf("no id_token in response")
	}

	user, err := parseJWTClaims(tokenResp.IDToken)
	if err != nil {
		return nil, err
	}

	if tokenResp.AccessToken != "" {
		if info, err := fetchCMUserInfo(tokenResp.AccessToken); err == nil {
			user.Nickname = info.Nickname
			user.Profile = info.Profile
			user.Picture = info.Picture
		} else {
			log.Printf("CM userinfo fetch error: %v", err)
		}
	}

	return user, nil
}

func cmUserInfoURL() string {
	if s := os.Getenv("CM_USERINFO_URL"); s != "" {
		return s
	}
	return "https://www.challengermode.com/v1/me/userinfo"
}

func fetchCMUserInfo(accessToken string) (*cmUserResponse, error) {
	req, err := http.NewRequest(http.MethodGet, cmUserInfoURL(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("userinfo request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if os.Getenv("SMTP_HOST") == "" {
		log.Printf("[DEV] CM userinfo response: %s", body)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo error %d: %s", resp.StatusCode, body)
	}

	var u cmUserResponse
	if err := json.Unmarshal(body, &u); err != nil {
		return nil, fmt.Errorf("decode userinfo: %w", err)
	}
	return &u, nil
}

func parseJWTClaims(jwt string) (*cmUserResponse, error) {
	parts := strings.Split(jwt, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid jwt format")
	}
	payload := parts[1]
	switch len(payload) % 4 {
	case 2:
		payload += "=="
	case 3:
		payload += "="
	}
	decoded, err := base64.URLEncoding.DecodeString(payload)
	if err != nil {
		decoded, err = base64.RawURLEncoding.DecodeString(parts[1])
		if err != nil {
			return nil, fmt.Errorf("decode jwt payload: %w", err)
		}
	}

	if os.Getenv("SMTP_HOST") == "" {
		log.Printf("[DEV] CM id_token claims: %s", decoded)
	}

	var u cmUserResponse
	if err := json.Unmarshal(decoded, &u); err != nil {
		return nil, fmt.Errorf("unmarshal jwt claims: %w", err)
	}
	return &u, nil
}
