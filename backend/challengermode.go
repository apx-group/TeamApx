package main

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
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
// code_challenge = BASE64URL(SHA256(code_verifier)), no padding.
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
func handleChallengerModeOAuth(db *sql.DB) http.HandlerFunc {
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
			http.Redirect(w, r, "/src/user/pages/login.html", http.StatusFound)
			return
		}
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil {
			http.Redirect(w, r, "/src/user/pages/login.html", http.StatusFound)
			return
		}

		// PKCE
		codeVerifier, codeChallenge, err := generatePKCE()
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		// State (random)
		stateBytes := make([]byte, 16)
		if _, err := rand.Read(stateBytes); err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		state := base64.RawURLEncoding.EncodeToString(stateBytes)

		if err := CreateOAuthState(db, state, user.ID, codeVerifier, time.Now().Add(10*time.Minute)); err != nil {
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
func handleChallengerModeCallback(db *sql.DB) http.HandlerFunc {
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

		oauthState, err := GetAndDeleteOAuthState(db, state)
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

		if err := UpsertLinkedAccount(db, oauthState.UserID, "challengermode", cmUser.id(), cmUser.displayName(), cmUser.avatarURL()); err != nil {
			log.Printf("UpsertLinkedAccount (cm) error: %v", err)
			redirectFail("db_error")
			return
		}

		http.Redirect(w, r, linksPageURL()+"?cm=ok", http.StatusFound)
	}
}

// cmUserResponse enthält die Claims aus dem id_token JWT.
type cmUserResponse struct {
	Sub               string `json:"sub"`
	Name              string `json:"name"`
	Nickname          string `json:"nickname"`
	PreferredUsername string `json:"preferred_username"`
	Picture           string `json:"picture"`
}

func (u *cmUserResponse) id() string { return u.Sub }

func (u *cmUserResponse) displayName() string {
	if u.Nickname != "" {
		return u.Nickname
	}
	if u.PreferredUsername != "" {
		return u.PreferredUsername
	}
	return u.Name
}

func (u *cmUserResponse) avatarURL() string { return u.Picture }

// exchangeCMCode tauscht den Code gegen Token und dekodiert den id_token JWT.
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

	// Im Dev-Modus komplette Token-Antwort loggen
	if os.Getenv("SMTP_HOST") == "" {
		log.Printf("[DEV] CM token response: %s", body)
	}

	var tokenResp struct {
		IDToken string `json:"id_token"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("decode token response: %w", err)
	}
	if tokenResp.IDToken == "" {
		return nil, fmt.Errorf("no id_token in response")
	}

	return parseJWTClaims(tokenResp.IDToken)
}

// parseJWTClaims dekodiert den Payload eines JWT ohne Signaturprüfung.
func parseJWTClaims(jwt string) (*cmUserResponse, error) {
	parts := strings.Split(jwt, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid jwt format")
	}
	// Padding ergänzen falls nötig
	payload := parts[1]
	switch len(payload) % 4 {
	case 2:
		payload += "=="
	case 3:
		payload += "="
	}
	decoded, err := base64.URLEncoding.DecodeString(payload)
	if err != nil {
		// Fallback: RawURL
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
