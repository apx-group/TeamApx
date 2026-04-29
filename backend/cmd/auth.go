package main

import (
	"crypto/rand"
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

func handleRegister(apx *ApxClient) http.HandlerFunc {
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

		conflict, err := apx.CheckUserConflict(req.Username, req.Email)
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

		if err := apx.CreateEmailVerification(req.Email, req.Username, req.Nickname, string(hashed), code, expiresAt); err != nil {
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

func handleVerifyEmail(apx *ApxClient) http.HandlerFunc {
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

		v, err := apx.GetEmailVerification(req.Email)
		if err != nil || v.Code != req.Code {
			jsonError(w, http.StatusBadRequest, "Ungültiger oder abgelaufener Code")
			return
		}

		conflict, err := apx.CheckUserConflict(v.Username, v.Email)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if conflict {
			apx.DeleteEmailVerification(v.Email)
			jsonError(w, http.StatusConflict, "Benutzername oder E-Mail bereits vergeben")
			return
		}

		userID, err := apx.CreateUser(v.Username, v.Nickname, v.Email, v.Password)
		if err != nil {
			if strings.Contains(err.Error(), "409") {
				jsonError(w, http.StatusConflict, "Benutzername oder E-Mail bereits vergeben")
				return
			}
			log.Printf("CreateUser error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		apx.DeleteEmailVerification(v.Email)

		token, err := apx.CreateSession(userID)
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

func handleChangeEmail(apx *ApxClient) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
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

		if _, err := apx.GetUserByEmail(newEmail); err == nil {
			jsonError(w, http.StatusConflict, "Diese E-Mail Adresse ist bereits vergeben")
			return
		}

		code := generateVerificationCode()
		expiresAt := time.Now().Add(15 * time.Minute)

		if err := apx.CreateEmailChangeRequest(user.ID, newEmail, code, expiresAt); err != nil {
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

func handleVerifyEmailChange(apx *ApxClient) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
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

		pending, err := apx.GetEmailChangeRequest(user.ID)
		if err != nil || pending.Code != strings.TrimSpace(req.Code) {
			jsonError(w, http.StatusBadRequest, "Ungültiger oder abgelaufener Code")
			return
		}

		if err := apx.UpdateUserEmail(user.ID, pending.NewEmail); err != nil {
			if strings.Contains(err.Error(), "409") {
				jsonError(w, http.StatusConflict, "Diese E-Mail Adresse ist bereits vergeben")
				return
			}
			log.Printf("UpdateUserEmail error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}

		apx.DeleteEmailChangeRequest(user.ID)
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

	plainBody := fmt.Sprintf(
		"Hi %s,\r\n\r\n"+
			"Your Team Apx verification code:\r\n\r\n"+
			"    %s\r\n\r\n"+
			"This code expires in 15 minutes.\r\n\r\n"+
			"If you did not request this code, you can safely ignore this email.\r\n\r\n"+
			"— Team Apx\r\n\r\n"+
			"Contact us: team.apx.r6@gmail.com",
		username, code,
	)

	htmlBody := fmt.Sprintf(
		`
<html>
<body style="font-family:Arial,sans-serif; line-height:1.6; color:#111;">

<table>
<tr>
<td style="font-size:18px; font-weight:bold;">
Hi %s
</td>

<td style="padding-left:10px;">
<img src="https://apx-team.com/assets/icons/TEAM_APX-120x120.png" width="50" alt="Team Apx">
</td>
</tr>
</table>

<p>Your Team Apx verification code:</p>

<h2 style="letter-spacing:3px;">%s</h2>

<p>This code expires in 15 minutes.</p>

<p>If you did not request this code, you can safely ignore this email.</p>

<p>— Team Apx</p>

<hr>

<p><u>Contact us:</u> team.apx.r6@gmail.com</p>

</body>
</html>
	`, username, code)
	boundary := "apx-boundary-123"

	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + to + "\r\n" +
			"Subject: Team Apx - E-Mail Verifizierung\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: multipart/alternative; boundary=" + boundary + "\r\n\r\n" +
			"--" + boundary + "\r\n" +
			"Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
			plainBody + "\r\n\r\n" +
			"--" + boundary + "\r\n" +
			"Content-Type: text/html; charset=UTF-8\r\n\r\n" +
			htmlBody + "\r\n\r\n" +
			"--" + boundary + "--",
	)

	auth := smtp.PlainAuth("", user, pass, host)
	return smtp.SendMail(host+":"+port, auth, from, []string{to}, msg)
}

func handleLogin(apx *ApxClient) http.HandlerFunc {
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

		user, err := apx.GetUserByEmail(strings.ToLower(req.Login))
		if err != nil {
			user, err = apx.GetUserByUsername(req.Login)
		}
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Ungültige Anmeldedaten")
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			jsonError(w, http.StatusUnauthorized, "Ungültige Anmeldedaten")
			return
		}

		twoFAEnabled, _ := apx.GetUserTwoFASettings(user.ID)

		if user.Username == "admin" {
			twoFAEnabled = false
		}

		if twoFAEnabled {
			skip := false
			if tdCookie, err := r.Cookie("td_token"); err == nil && tdCookie.Value != "" {
				if tdUserID, err := apx.GetTrustedDeviceUserID(tdCookie.Value); err == nil && tdUserID == user.ID {
					skip = true
				}
			}
			if !skip {
				code := generateVerificationCode()
				pendingToken, err := apx.CreateLogin2FAPending(user.ID, code)
				if err != nil {
					jsonError(w, http.StatusInternalServerError, "internal error")
					return
				}
				if err := sendVerificationEmail(user.Email, user.Username, code); err != nil {
					log.Printf("send 2FA email error: %v", err)
					jsonError(w, http.StatusInternalServerError, "E-Mail konnte nicht gesendet werden")
					return
				}
				jsonResponse(w, http.StatusOK, map[string]interface{}{"twofa": true, "token": pendingToken, "email": user.Email})
				return
			}
		}

		token, err := apx.CreateSession(user.ID)
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

func getClientIP(r *http.Request) string {
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("X-Forwarded-For")
		if idx := strings.Index(ip, ","); idx != -1 {
			ip = strings.TrimSpace(ip[:idx])
		}
	}
	if ip == "" {
		host := r.RemoteAddr
		if idx := strings.LastIndex(host, ":"); idx != -1 {
			ip = host[:idx]
		} else {
			ip = host
		}
	}
	return strings.TrimSpace(ip)
}

func getLocation(ip string) string {
	if ip == "" || ip == "127.0.0.1" || ip == "::1" ||
		strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") {
		return ""
	}
	type geoResp struct {
		City    string `json:"city"`
		Country string `json:"country"`
		Status  string `json:"status"`
	}
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://ip-api.com/json/" + ip + "?fields=status,city,country")
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	var g geoResp
	if err := json.NewDecoder(resp.Body).Decode(&g); err != nil {
		return ""
	}
	if g.Status != "success" {
		return ""
	}
	if g.City != "" && g.Country != "" {
		return g.City + ", " + g.Country
	}
	return g.Country
}

func handleLoginVerify2FA(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req struct {
			Token      string `json:"token"`
			Code       string `json:"code"`
			DeviceName string `json:"device_name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		req.Token = strings.TrimSpace(req.Token)
		req.Code = strings.TrimSpace(req.Code)
		req.DeviceName = strings.TrimSpace(req.DeviceName)

		userID, expectedCode, err := apx.GetLogin2FAPending(req.Token)
		if err != nil || expectedCode != req.Code {
			jsonError(w, http.StatusUnauthorized, "Ungültiger oder abgelaufener Code")
			return
		}

		apx.DeleteLogin2FAPending(req.Token)

		token, err := apx.CreateSession(userID)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		setSessionCookie(w, token)

		if req.DeviceName != "" {
			ip := getClientIP(r)
			location := getLocation(ip)
			if tdToken, err := apx.CreateTrustedDevice(userID, req.DeviceName, ip, location); err == nil {
				http.SetCookie(w, &http.Cookie{
					Name:     "td_token",
					Value:    tdToken,
					Path:     "/",
					HttpOnly: true,
					SameSite: http.SameSiteLaxMode,
					MaxAge:   30 * 24 * 60 * 60,
				})
			}
		}

		user, err := apx.GetSessionUser(token)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})
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

func handle2FASettings(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
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

		switch r.Method {
		case http.MethodGet:
			twoFAEnabled, _ := apx.GetUserTwoFASettings(user.ID)
			jsonResponse(w, http.StatusOK, map[string]bool{"two_fa_enabled": twoFAEnabled})
		case http.MethodPut:
			var req struct {
				TwoFAEnabled bool `json:"two_fa_enabled"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if err := apx.SetUser2FAEnabled(user.ID, req.TwoFAEnabled); err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if !req.TwoFAEnabled {
				apx.DeleteAllTrustedDevices(user.ID)
				http.SetCookie(w, &http.Cookie{
					Name:   "td_token",
					Value:  "",
					Path:   "/",
					MaxAge: -1,
				})
			} else {
				ip := getClientIP(r)
				location := getLocation(ip)
				if tdToken, err := apx.CreateTrustedDevice(user.ID, "Dieses Gerät", ip, location); err == nil {
					http.SetCookie(w, &http.Cookie{
						Name:     "td_token",
						Value:    tdToken,
						Path:     "/",
						HttpOnly: true,
						SameSite: http.SameSiteLaxMode,
						MaxAge:   30 * 24 * 60 * 60,
					})
				}
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})
		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

func handleDevices(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
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

		switch r.Method {
		case http.MethodGet:
			currentToken := ""
			if tdCookie, err := r.Cookie("td_token"); err == nil {
				currentToken = tdCookie.Value
			}
			devices, err := apx.GetTrustedDevices(user.ID)
			if err != nil {
				jsonError(w, http.StatusInternalServerError, "internal error")
				return
			}
			type deviceResp struct {
				Token      string `json:"token"`
				DeviceName string `json:"device_name"`
				Location   string `json:"location"`
				CreatedAt  string `json:"created_at"`
				IsCurrent  bool   `json:"is_current"`
			}
			resp := make([]deviceResp, 0, len(devices))
			for _, d := range devices {
				resp = append(resp, deviceResp{
					Token:      d.Token,
					DeviceName: d.DeviceName,
					Location:   d.Location,
					CreatedAt:  d.CreatedAt,
					IsCurrent:  d.Token == currentToken,
				})
			}
			jsonResponse(w, http.StatusOK, map[string]interface{}{"devices": resp})

		case http.MethodDelete:
			token := r.URL.Query().Get("token")
			if token == "" {
				jsonError(w, http.StatusBadRequest, "missing token")
				return
			}
			if err := apx.DeleteTrustedDevice(token, user.ID); err != nil {
				jsonError(w, http.StatusNotFound, "Gerät nicht gefunden")
				return
			}
			if tdCookie, err := r.Cookie("td_token"); err == nil && tdCookie.Value == token {
				http.SetCookie(w, &http.Cookie{Name: "td_token", Value: "", Path: "/", MaxAge: -1})
			}
			jsonResponse(w, http.StatusOK, map[string]bool{"success": true})

		default:
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

func handleLogout(apx *ApxClient) http.HandlerFunc {
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
			_ = apx.DeleteSession(cookie.Value)
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

func handleMe(apx *ApxClient) http.HandlerFunc {
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

		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"user": nil})
			return
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"user": map[string]interface{}{
				"id":              user.ID,
				"username":        user.Username,
				"nickname":        user.Nickname,
				"email":           user.Email,
				"is_admin":        user.IsAdmin,
				"event_access":    user.EventAccess,
				"avatar_url":      user.AvatarURL,
				"banner_url":      user.BannerURL,
				"timezone":        user.Timezone,
				"show_local_time": user.ShowLocalTime,
				"social_links":    user.SocialLinks,
				"bio":             user.Bio,
			},
		})
	}
}

func handleProfile(apx *ApxClient, uploadDir string) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		var username, nickname, bio string
		var avatarURL, bannerURL = user.AvatarURL, user.BannerURL

		contentType := r.Header.Get("Content-Type")
		if strings.HasPrefix(contentType, "application/json") {
			var req struct {
				Username string `json:"username"`
				Nickname string `json:"nickname"`
				Bio      string `json:"bio"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid json")
				return
			}
			username = strings.TrimSpace(req.Username)
			nickname = strings.TrimSpace(req.Nickname)
			bio = strings.TrimSpace(req.Bio)
		} else {
			if err := r.ParseMultipartForm(25 << 20); err != nil {
				jsonError(w, http.StatusBadRequest, "invalid form data")
				return
			}
			username = strings.TrimSpace(r.FormValue("username"))
			nickname = strings.TrimSpace(r.FormValue("nickname"))
			bio = strings.TrimSpace(r.FormValue("bio"))
		}
		if len([]rune(bio)) > 150 {
			jsonError(w, http.StatusBadRequest, "Bio darf maximal 150 Zeichen haben")
			return
		}

		if !usernameRe.MatchString(username) {
			jsonError(w, http.StatusBadRequest, "Benutzername muss 3-30 Zeichen lang sein (Buchstaben, Zahlen, . _ -)")
			return
		}

		log.Printf("[PROFILE] Content-Type: %s, username: %q, nickname: %q, bio: %q", contentType, username, nickname, bio)

		if !strings.HasPrefix(contentType, "application/json") {
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
		}

		log.Printf("[PROFILE] Calling UpdateUserProfile: user_id=%d, username=%q, nickname=%q, email=%q, avatarURL=%q, bannerURL=%q, bio=%q", user.ID, username, nickname, user.Email, avatarURL, bannerURL, bio)
		if err := apx.UpdateUserProfile(user.ID, username, nickname, user.Email, avatarURL, bannerURL, bio); err != nil {
			if strings.Contains(err.Error(), "409") {
				jsonError(w, http.StatusConflict, "Benutzername oder E-Mail bereits vergeben")
				return
			}
			log.Printf("UpdateUserProfile error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		log.Printf("[PROFILE] UpdateUserProfile succeeded")

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"success":    true,
			"avatar_url": avatarURL,
			"banner_url": bannerURL,
		})
	}
}

func handleDeactivateAccount(apx *ApxClient) http.HandlerFunc {
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
		user, err := apx.GetSessionUser(cookie.Value)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Nicht angemeldet")
			return
		}

		if err := apx.DeactivateUser(user.ID); err != nil {
			log.Printf("DeactivateUser error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
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

func handleDeleteAccount(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodDelete {
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

		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if req.Username != user.Username {
			jsonError(w, http.StatusBadRequest, "Benutzername stimmt nicht überein")
			return
		}

		u2, err := apx.GetUserByUsernameAny(user.Username)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(u2.Password), []byte(req.Password)); err != nil {
			jsonError(w, http.StatusUnauthorized, "Passwort ist falsch")
			return
		}

		if err := apx.DeleteUserByUsername(user.Username); err != nil {
			log.Printf("DeleteUserByUsername error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
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

func handleProfileSettings(apx *ApxClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		if r.Method != http.MethodPut {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req struct {
			Timezone      string   `json:"timezone"`
			ShowLocalTime bool     `json:"show_local_time"`
			SocialLinks   []string `json:"social_links"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.SocialLinks == nil {
			req.SocialLinks = []string{}
		}
		if err := apx.UpdateProfileSettings(user.ID, req.Timezone, req.ShowLocalTime, req.SocialLinks); err != nil {
			log.Printf("UpdateProfileSettings error: %v", err)
			jsonError(w, http.StatusInternalServerError, "internal error")
			return
		}
		jsonResponse(w, http.StatusOK, map[string]bool{"success": true})
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
