package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"net/smtp"
	"os"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var (
	usernameRe = regexp.MustCompile(`^[a-zA-Z0-9._-]{3,30}$`)
	emailRe    = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
)

type registerRequest struct {
	Username        string `json:"username"`
	Nickname        string `json:"nickname"`
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
}

type loginRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type verifyEmailRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
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
		req.Nickname = strings.TrimSpace(req.Nickname)
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		if !usernameRe.MatchString(req.Username) {
			jsonError(w, http.StatusBadRequest, "Benutzername muss 3-30 Zeichen lang sein (Buchstaben, Zahlen, . _ -)")
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

		conflict, err := CheckUserConflict(db, req.Username, req.Email)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if conflict {
			jsonError(w, http.StatusConflict, "Benutzername oder E-Mail bereits vergeben")
			return
		}

		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		code := generateVerificationCode()
		expiresAt := time.Now().Add(15 * time.Minute)

		if err := CreateEmailVerification(db, req.Email, req.Username, req.Nickname, string(hashed), code, expiresAt); err != nil {
			log.Printf("CreateEmailVerification error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		if err := sendVerificationEmail(req.Email, req.Username, code); err != nil {
			log.Printf("sendVerificationEmail error: %v", err)
			jsonError(w, http.StatusInternalServerError, "E-Mail konnte nicht gesendet werden")
			return
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{"pending": true})
	}
}

func handleVerifyEmail(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req verifyEmailRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		req.Email = strings.TrimSpace(strings.ToLower(req.Email))
		req.Code = strings.TrimSpace(req.Code)

		if req.Email == "" || req.Code == "" {
			jsonError(w, http.StatusBadRequest, "E-Mail und Code sind erforderlich")
			return
		}

		v, err := GetEmailVerification(db, req.Email)
		if err != nil || v.Code != req.Code {
			jsonError(w, http.StatusBadRequest, "Ungültiger oder abgelaufener Code")
			return
		}

		conflict, err := CheckUserConflict(db, v.Username, v.Email)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if conflict {
			DeleteEmailVerification(db, v.Email)
			jsonError(w, http.StatusConflict, "Benutzername oder E-Mail bereits vergeben")
			return
		}

		userID, err := CreateUser(db, v.Username, v.Nickname, v.Email, v.Password)
		if err != nil {
			if strings.Contains(err.Error(), "UNIQUE") {
				jsonError(w, http.StatusConflict, "Benutzername oder E-Mail bereits vergeben")
				return
			}
			log.Printf("CreateUser error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		DeleteEmailVerification(db, v.Email)

		token, err := CreateSession(db, userID)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		setSessionCookie(w, token)
		jsonResponse(w, http.StatusCreated, map[string]interface{}{
			"user": map[string]interface{}{
				"id":       userID,
				"username": v.Username,
				"email":    v.Email,
				"is_admin": false,
			},
		})
	}
}

func handleChangeEmail(db *sql.DB) http.HandlerFunc {
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
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		var req struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		newEmail := strings.TrimSpace(strings.ToLower(req.Email))

		if !emailRe.MatchString(newEmail) {
			jsonError(w, http.StatusBadRequest, "Ungültige E-Mail Adresse")
			return
		}
		if newEmail == strings.ToLower(user.Email) {
			jsonError(w, http.StatusBadRequest, "Die neue E-Mail ist identisch mit der aktuellen")
			return
		}

		// Check if new email is already taken
		var count int
		if err := db.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", newEmail).Scan(&count); err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if count > 0 {
			jsonError(w, http.StatusConflict, "Diese E-Mail Adresse ist bereits vergeben")
			return
		}

		code := generateVerificationCode()
		expiresAt := time.Now().Add(15 * time.Minute)

		if err := CreateEmailChangeRequest(db, user.ID, newEmail, code, expiresAt); err != nil {
			log.Printf("CreateEmailChangeRequest error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		if err := sendVerificationEmail(newEmail, user.Username, code); err != nil {
			log.Printf("sendVerificationEmail (change) error: %v", err)
			jsonError(w, http.StatusInternalServerError, "E-Mail konnte nicht gesendet werden")
			return
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{"pending": true})
	}
}

func handleVerifyEmailChange(db *sql.DB) http.HandlerFunc {
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
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}
		user, err := GetSessionUser(db, cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		var req struct {
			Code string `json:"code"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		pending, err := GetEmailChangeRequest(db, user.ID)
		if err != nil || pending.Code != strings.TrimSpace(req.Code) {
			jsonError(w, http.StatusBadRequest, "Ungültiger oder abgelaufener Code")
			return
		}

		if err := UpdateUserEmail(db, user.ID, pending.NewEmail); err != nil {
			if strings.Contains(err.Error(), "UNIQUE") {
				jsonError(w, http.StatusConflict, "Diese E-Mail Adresse ist bereits vergeben")
				return
			}
			log.Printf("UpdateUserEmail error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		DeleteEmailChangeRequest(db, user.ID)
		jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "email": pending.NewEmail})
	}
}

func generateVerificationCode() string {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "000000"
	}
	return fmt.Sprintf("%06d", n.Int64())
}

func sendVerificationEmail(to, username, code string) error {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		log.Printf("[DEV] E-Mail Verifizierungscode für %s (%s): %s", username, to, code)
		return nil
	}

	port := os.Getenv("SMTP_PORT")
	if port == "" {
		port = "587"
	}
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")
	if from == "" {
		from = user
	}

	body := fmt.Sprintf(
		"Hallo %s,\r\n\r\n"+
			"dein Verifizierungscode für Team Apx lautet:\r\n\r\n"+
			"    %s\r\n\r\n"+
			"Dieser Code ist 15 Minuten gültig.\r\n\r\n"+
			"Falls du kein Konto bei Team Apx erstellt hast, ignoriere diese E-Mail.\r\n\r\n"+
			"– Team Apx",
		username, code,
	)

	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + to + "\r\n" +
			"Subject: Team Apx - E-Mail Verifizierung\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/plain; charset=UTF-8\r\n" +
			"\r\n" +
			body,
	)

	auth := smtp.PlainAuth("", user, pass, host)
	return smtp.SendMail(host+":"+port, auth, from, []string{to}, msg)
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
				"id":         user.ID,
				"username":   user.Username,
				"nickname":   user.Nickname,
				"email":      user.Email,
				"is_admin":   user.IsAdmin,
				"avatar_url": user.AvatarURL,
				"banner_url": user.BannerURL,
			},
		})
	}
}

func handleProfile(db *sql.DB, uploadDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPut {
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

		if err := r.ParseMultipartForm(25 << 20); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid form data")
			return
		}

		username := strings.TrimSpace(r.FormValue("username"))
		nickname := strings.TrimSpace(r.FormValue("nickname"))
		email := strings.TrimSpace(strings.ToLower(r.FormValue("email")))

		if !usernameRe.MatchString(username) {
			jsonError(w, http.StatusBadRequest, "Benutzername muss 3-30 Zeichen lang sein (Buchstaben, Zahlen, . _ -)")
			return
		}
		if !emailRe.MatchString(email) {
			jsonError(w, http.StatusBadRequest, "Ungültige E-Mail Adresse")
			return
		}

		avatarURL := user.AvatarURL
		bannerURL := user.BannerURL

		if avatarFile, _, err := r.FormFile("avatar"); err == nil {
			defer avatarFile.Close()
			url, err := saveUploadedImage(avatarFile, uploadDir, "profile", fmt.Sprintf("%d", user.ID))
			if err != nil {
				log.Printf("Avatar upload error: %v", err)
				jsonError(w, http.StatusInternalServerError, "Profilbild konnte nicht gespeichert werden")
				return
			}
			avatarURL = url
		}

		if bannerFile, _, err := r.FormFile("banner"); err == nil {
			defer bannerFile.Close()
			url, err := saveUploadedImage(bannerFile, uploadDir, "banner", fmt.Sprintf("%d", user.ID))
			if err != nil {
				log.Printf("Banner upload error: %v", err)
				jsonError(w, http.StatusInternalServerError, "Banner konnte nicht gespeichert werden")
				return
			}
			bannerURL = url
		}

		if err := UpdateUserProfile(db, user.ID, username, nickname, email, avatarURL, bannerURL); err != nil {
			if strings.Contains(err.Error(), "UNIQUE") {
				jsonError(w, http.StatusConflict, "Benutzername oder E-Mail bereits vergeben")
				return
			}
			log.Printf("UpdateUserProfile error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"success":    true,
			"avatar_url": avatarURL,
			"banner_url": bannerURL,
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
