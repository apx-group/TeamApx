package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

var (
	usernameRe = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)
	emailRe    = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
)

type registerRequest struct {
	Username        string `json:"username"`
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
}

type loginRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

func handleRegister(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req registerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		req.Username = strings.TrimSpace(req.Username)
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		if !usernameRe.MatchString(req.Username) {
			jsonError(w, http.StatusBadRequest, "Benutzername muss 3-30 Zeichen lang sein (Buchstaben, Zahlen, Unterstrich)")
			return
		}
		if !emailRe.MatchString(req.Email) {
			jsonError(w, http.StatusBadRequest, "Ungültige E-Mail Adresse")
			return
		}
		if len(req.Password) < 8 {
			jsonError(w, http.StatusBadRequest, "Passwort muss mindestens 8 Zeichen lang sein")
			return
		}
		if req.Password != req.ConfirmPassword {
			jsonError(w, http.StatusBadRequest, "Passwörter stimmen nicht überein")
			return
		}

		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		userID, err := CreateUser(db, req.Username, req.Email, string(hashed))
		if err != nil {
			if strings.Contains(err.Error(), "UNIQUE") {
				jsonError(w, http.StatusConflict, "Benutzername oder E-Mail bereits vergeben")
				return
			}
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		token, err := CreateSession(db, userID)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		setSessionCookie(w, token)
		jsonResponse(w, http.StatusCreated, map[string]interface{}{
			"user": map[string]interface{}{
				"id":       userID,
				"username": req.Username,
				"email":    req.Email,
				"is_admin": false,
			},
		})
	}
}

func handleLogin(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		req.Login = strings.TrimSpace(req.Login)
		if req.Login == "" || req.Password == "" {
			jsonError(w, http.StatusBadRequest, "Login und Passwort sind erforderlich")
			return
		}

		// Try email first, then username
		user, err := GetUserByEmail(db, strings.ToLower(req.Login))
		if err != nil {
			user, err = GetUserByUsername(db, req.Login)
		}
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Ungültige Anmeldedaten")
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			jsonError(w, http.StatusUnauthorized, "Ungültige Anmeldedaten")
			return
		}

		token, err := CreateSession(db, user.ID)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		setSessionCookie(w, token)
		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"user": map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
				"email":    user.Email,
				"is_admin": user.IsAdmin,
			},
		})
	}
}

func handleLogout(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		cookie, err := r.Cookie("session")
		if err == nil {
			DeleteSession(db, cookie.Value)
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   -1,
		})

		jsonResponse(w, http.StatusOK, map[string]bool{"success": true})
	}
}

func handleMe(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		cookie, err := r.Cookie("session")
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"user": nil})
			return
		}

		user, err := GetSessionUser(db, cookie.Value)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"user": nil})
			return
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"user": map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
				"email":    user.Email,
				"is_admin": user.IsAdmin,
			},
		})
	}
}

func setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 60 * 60,
	})
}
