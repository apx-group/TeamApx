package main

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"net/http"
	"time"
)

// ApxClient is an HTTP client for the ApxApi service.
type ApxClient struct {
	baseURL string
	apiKey  string
	http    *http.Client
}

func NewApxClient(baseURL, apiKey string) *ApxClient {
	return &ApxClient{
		baseURL: baseURL,
		apiKey:  apiKey,
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

func (c *ApxClient) req(method, path string, payload any) (*http.Response, error) {
	var body *bytes.Reader
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("marshal: %w", err)
		}
		body = bytes.NewReader(b)
	} else {
		body = bytes.NewReader(nil)
	}
	r, err := http.NewRequestWithContext(context.Background(), method, c.baseURL+path, body)
	if err != nil {
		return nil, err
	}
	if payload != nil {
		r.Header.Set("Content-Type", "application/json")
	}
	r.Header.Set("X-Api-Key", c.apiKey)
	return c.http.Do(r)
}

// decodeData unwraps {"data": ...} into dest.
func decodeData(resp *http.Response, dest any) error {
	defer resp.Body.Close()
	var wrapper struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&wrapper); err != nil {
		return err
	}
	if dest == nil {
		return nil
	}
	return json.Unmarshal(wrapper.Data, dest)
}

func (c *ApxClient) get(path string, dest any) error {
	resp, err := c.req(http.MethodGet, path, nil)
	if err != nil {
		return err
	}
	if resp.StatusCode == http.StatusNotFound {
		resp.Body.Close()
		return errNotFound
	}
	if resp.StatusCode >= 400 {
		resp.Body.Close()
		return fmt.Errorf("http %d: GET %s", resp.StatusCode, path)
	}
	return decodeData(resp, dest)
}

func (c *ApxClient) post(path string, payload any, dest any) error {
	resp, err := c.req(http.MethodPost, path, payload)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		resp.Body.Close()
		return fmt.Errorf("http %d: POST %s", resp.StatusCode, path)
	}
	if dest == nil {
		resp.Body.Close()
		return nil
	}
	return decodeData(resp, dest)
}

func (c *ApxClient) patch(path string, payload any) error {
	resp, err := c.req(http.MethodPatch, path, payload)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("http %d: PATCH %s", resp.StatusCode, path)
	}
	return nil
}

func (c *ApxClient) patchGet(path string, payload any, dest any) error {
	resp, err := c.req(http.MethodPatch, path, payload)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		resp.Body.Close()
		return fmt.Errorf("http %d: PATCH %s", resp.StatusCode, path)
	}
	return decodeData(resp, dest)
}

func (c *ApxClient) put(path string, payload any) error {
	resp, err := c.req(http.MethodPut, path, payload)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("http %d: PUT %s", resp.StatusCode, path)
	}
	return nil
}

func (c *ApxClient) del(path string) error {
	resp, err := c.req(http.MethodDelete, path, nil)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("http %d: DELETE %s", resp.StatusCode, path)
	}
	return nil
}

func (c *ApxClient) delBody(path string, payload any) error {
	resp, err := c.req(http.MethodDelete, path, payload)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("http %d: DELETE %s", resp.StatusCode, path)
	}
	return nil
}

var errNotFound = fmt.Errorf("not found")

func randHex(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = byte(rand.IntN(256))
	}
	return hex.EncodeToString(b)
}

// ── Auth / Sessions ──────────────────────────────────────────────────────────

func (c *ApxClient) GetSessionUser(token string) (*User, error) {
	var u User
	if err := c.get("/auth/sessions/validate/"+token, &u); err != nil {
		return nil, err
	}
	if u.SocialLinks == nil {
		u.SocialLinks = []string{}
	}
	return &u, nil
}

func (c *ApxClient) CreateSession(userID int64) (string, error) {
	var result struct {
		Token string `json:"token"`
	}
	if err := c.post("/auth/sessions", map[string]any{"user_id": userID}, &result); err != nil {
		return "", err
	}
	return result.Token, nil
}

func (c *ApxClient) DeleteSession(token string) error {
	return c.del("/auth/sessions/" + token)
}

// ── Email Verifications ──────────────────────────────────────────────────────

func (c *ApxClient) CreateEmailVerification(email, username, nickname, hashedPw, code string, expiresAt time.Time) error {
	return c.post("/auth/verifications", map[string]any{
		"email": email, "username": username, "nickname": nickname,
		"password": hashedPw, "code": code, "expires_at": expiresAt,
	}, nil)
}

func (c *ApxClient) GetEmailVerification(email string) (*EmailVerification, error) {
	var v EmailVerification
	if err := c.get("/auth/verifications/"+email, &v); err != nil {
		return nil, err
	}
	return &v, nil
}

func (c *ApxClient) DeleteEmailVerification(email string) {
	_ = c.del("/auth/verifications/" + email)
}

// ── Email Change Requests ────────────────────────────────────────────────────

func (c *ApxClient) CreateEmailChangeRequest(userID int64, newEmail, code string, expiresAt time.Time) error {
	return c.post("/auth/email-changes", map[string]any{
		"user_id": userID, "new_email": newEmail, "code": code, "expires_at": expiresAt,
	}, nil)
}

func (c *ApxClient) GetEmailChangeRequest(userID int64) (*EmailChangeRequest, error) {
	var r EmailChangeRequest
	if err := c.get(fmt.Sprintf("/auth/email-changes/%d", userID), &r); err != nil {
		return nil, err
	}
	return &r, nil
}

func (c *ApxClient) DeleteEmailChangeRequest(userID int64) {
	_ = c.del(fmt.Sprintf("/auth/email-changes/%d", userID))
}

// ── 2FA Pending ──────────────────────────────────────────────────────────────

func (c *ApxClient) CreateLogin2FAPending(userID int64, code string) (string, error) {
	token := randHex(16)
	expiresAt := time.Now().Add(10 * time.Minute)
	if err := c.post("/auth/2fa/pending", map[string]any{
		"token": token, "user_id": userID, "code": code, "expires_at": expiresAt,
	}, nil); err != nil {
		return "", err
	}
	return token, nil
}

func (c *ApxClient) GetLogin2FAPending(token string) (int64, string, error) {
	var result struct {
		UserID int64  `json:"user_id"`
		Code   string `json:"code"`
	}
	if err := c.get("/auth/2fa/pending/"+token, &result); err != nil {
		return 0, "", err
	}
	return result.UserID, result.Code, nil
}

func (c *ApxClient) DeleteLogin2FAPending(token string) {
	_ = c.del("/auth/2fa/pending/" + token)
}

// ── Trusted Devices ──────────────────────────────────────────────────────────

func (c *ApxClient) CreateTrustedDevice(userID int64, deviceName, ip, location string) (string, error) {
	token := randHex(32)
	expiresAt := time.Now().Add(30 * 24 * time.Hour)
	if err := c.post("/auth/devices", map[string]any{
		"token": token, "user_id": userID, "device_name": deviceName,
		"ip": ip, "location": location, "expires_at": expiresAt,
	}, nil); err != nil {
		return "", err
	}
	return token, nil
}

func (c *ApxClient) GetTrustedDeviceUserID(token string) (int64, error) {
	var result struct {
		UserID int64 `json:"user_id"`
	}
	if err := c.get("/auth/devices/by-token/"+token, &result); err != nil {
		return 0, err
	}
	return result.UserID, nil
}

func (c *ApxClient) GetTrustedDevices(userID int64) ([]TrustedDevice, error) {
	var devices []TrustedDevice
	if err := c.get(fmt.Sprintf("/auth/devices/user/%d", userID), &devices); err != nil {
		return nil, err
	}
	if devices == nil {
		devices = []TrustedDevice{}
	}
	return devices, nil
}

func (c *ApxClient) DeleteTrustedDevice(token string, userID int64) error {
	return c.delBody("/auth/devices/"+token, map[string]any{"user_id": userID})
}

// ── OAuth States ─────────────────────────────────────────────────────────────

func (c *ApxClient) CreateOAuthState(state string, userID int64, codeVerifier string, expiresAt time.Time) error {
	return c.post("/auth/oauth-states", map[string]any{
		"state": state, "user_id": userID, "code_verifier": codeVerifier, "expires_at": expiresAt,
	}, nil)
}

func (c *ApxClient) GetAndDeleteOAuthState(state string) (*OAuthState, error) {
	var result struct {
		UserID       int64  `json:"user_id"`
		CodeVerifier string `json:"code_verifier"`
	}
	if err := c.post("/auth/oauth-states/consume", map[string]any{"state": state}, &result); err != nil {
		return nil, err
	}
	return &OAuthState{UserID: result.UserID, CodeVerifier: result.CodeVerifier}, nil
}

// ── Users ────────────────────────────────────────────────────────────────────

func (c *ApxClient) CreateUser(username, nickname, email, hashedPw string) (int64, error) {
	var result struct {
		ID int64 `json:"id"`
	}
	if err := c.post("/users/create-with-hash", map[string]any{
		"username": username, "nickname": nickname, "email": email, "password_hash": hashedPw,
	}, &result); err != nil {
		return 0, err
	}
	return result.ID, nil
}

func (c *ApxClient) GetUserByEmail(email string) (*User, error) {
	var u User
	if err := c.get("/users/by-email/"+email, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (c *ApxClient) GetUserByUsername(username string) (*User, error) {
	var u User
	if err := c.get("/users/by-username/"+username, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (c *ApxClient) GetUserByUsernameAny(username string) (*User, error) {
	var u User
	if err := c.get("/users/by-username-any/"+username, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (c *ApxClient) GetLinkedAccounts(userID int64) ([]LinkedAccount, error) {
	var accounts []LinkedAccount
	if err := c.get(fmt.Sprintf("/users/%d/linked-accounts", userID), &accounts); err != nil {
		return nil, err
	}
	if accounts == nil {
		accounts = []LinkedAccount{}
	}
	return accounts, nil
}

func (c *ApxClient) UpsertLinkedAccount(userID int64, service, serviceID, username, avatarURL, profileURL string) error {
	return c.post(fmt.Sprintf("/users/%d/linked-account", userID), map[string]any{
		"service": service, "service_id": serviceID, "username": username,
		"avatar_url": avatarURL, "profile_url": profileURL,
	}, nil)
}

func (c *ApxClient) DeleteLinkedAccount(userID int64, service string) error {
	return c.del(fmt.Sprintf("/users/%d/linked-account/%s", userID, service))
}

func (c *ApxClient) UpdateLinkedAccountField(userID int64, service, field, value string) error {
	return c.patch(fmt.Sprintf("/users/%d/linked-account/%s/%s", userID, service, field),
		map[string]any{"value": value})
}

func (c *ApxClient) UpdateUserProfile(userID int64, username, nickname, email, avatarURL, bannerURL, bio string) error {
	updates := map[string]any{}
	if username != "" {
		updates["username"] = username
	}
	if nickname != "" {
		updates["nickname"] = nickname
	}
	if email != "" {
		updates["email"] = email
	}
	updates["avatar_url"] = avatarURL
	updates["banner_url"] = bannerURL
	updates["bio"] = bio
	return c.patch(fmt.Sprintf("/users/%d", userID), updates)
}

func (c *ApxClient) UpdateProfileSettings(userID int64, timezone string, showLocalTime bool, socialLinks []string) error {
	if socialLinks == nil {
		socialLinks = []string{}
	}
	linksJSON, _ := json.Marshal(socialLinks)
	return c.patch(fmt.Sprintf("/users/%d", userID), map[string]any{
		"timezone": timezone, "show_local_time": showLocalTime, "social_links": string(linksJSON),
	})
}

func (c *ApxClient) GetAllUsernames() ([]string, error) {
	var names []string
	if err := c.get("/users/all-usernames", &names); err != nil {
		return nil, err
	}
	if names == nil {
		names = []string{}
	}
	return names, nil
}

func (c *ApxClient) SearchUsers(query string) ([]User, error) {
	var users []User
	if err := c.get("/users/search?q="+query, &users); err != nil {
		return nil, err
	}
	if users == nil {
		users = []User{}
	}
	return users, nil
}

func (c *ApxClient) CheckUserConflict(username, email string) (bool, error) {
	var result struct {
		Conflict bool `json:"conflict"`
	}
	if err := c.post("/users/check-conflict", map[string]any{"username": username, "email": email}, &result); err != nil {
		return false, err
	}
	return result.Conflict, nil
}

func (c *ApxClient) EnsureAdminUser(hashedPw string) error {
	return c.post("/users/ensure-admin", map[string]any{"hashed_pw": hashedPw}, nil)
}

func (c *ApxClient) DeactivateUser(userID int64) error {
	return c.patch(fmt.Sprintf("/users/%d/deactivate", userID), map[string]any{})
}

func (c *ApxClient) DeactivateUserByUsername(username string) error {
	return c.patch("/users/deactivate-by-username/"+username, map[string]any{})
}

func (c *ApxClient) DeleteUserByUsername(username string) error {
	resp, err := c.req(http.MethodDelete, "/users/by-username/"+username, nil)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return fmt.Errorf("user not found")
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("http %d", resp.StatusCode)
	}
	return nil
}

func (c *ApxClient) SetUserEventAccess(userID int64, enabled bool) error {
	return c.patch(fmt.Sprintf("/users/%d/event-access", userID), map[string]any{"enabled": enabled})
}

func (c *ApxClient) SetUserEventAccessByUsername(username string, enabled bool) error {
	u, err := c.GetUserByUsernameAny(username)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}
	return c.SetUserEventAccess(u.ID, enabled)
}

func (c *ApxClient) SetUser2FAEnabled(userID int64, enabled bool) error {
	return c.patch(fmt.Sprintf("/users/%d/2fa", userID), map[string]any{"enabled": enabled})
}

func (c *ApxClient) SetUserTrustDevices(userID int64, enabled bool) error {
	return c.patch(fmt.Sprintf("/users/%d/trust-devices", userID), map[string]any{"enabled": enabled})
}

func (c *ApxClient) ToggleUser2FA(username string) (bool, error) {
	var result struct {
		TwoFAEnabled bool `json:"two_fa_enabled"`
	}
	if err := c.post("/users/toggle-2fa", map[string]any{"username": username}, &result); err != nil {
		return false, err
	}
	return result.TwoFAEnabled, nil
}

func (c *ApxClient) GetUserTwoFASettings(userID int64) (twoFAEnabled, trustDevices bool) {
	var result struct {
		TwoFAEnabled bool `json:"two_fa_enabled"`
		TrustDevices bool `json:"trust_devices"`
	}
	_ = c.get(fmt.Sprintf("/users/%d/2fa-settings", userID), &result)
	return result.TwoFAEnabled, result.TrustDevices
}

func (c *ApxClient) UpdateUserEmail(userID int64, newEmail string) error {
	return c.patch(fmt.Sprintf("/users/%d/email", userID), map[string]any{"email": newEmail})
}

func (c *ApxClient) ActivateByUsername(username string) error {
	return c.patch("/users/activate-by-username/"+username, map[string]any{})
}

func (c *ApxClient) GetUserAvatarByUsername(username string) string {
	u, err := c.GetUserByUsername(username)
	if err != nil {
		return ""
	}
	return u.AvatarURL
}

func (c *ApxClient) GetUserNicknameByUsername(username string) string {
	u, err := c.GetUserByUsername(username)
	if err != nil {
		return ""
	}
	if u.Nickname != "" {
		return u.Nickname
	}
	return u.Username
}

func (c *ApxClient) GetUserIDByUsername(username string) (int64, error) {
	u, err := c.GetUserByUsername(username)
	if err != nil {
		return 0, err
	}
	return u.ID, nil
}

func (c *ApxClient) UpdateBotUserApxID(discordID string, apxID int64) error {
	return c.patch("/bot/user/"+discordID+"/apx-id", map[string]any{"apx_id": apxID})
}

// ── Team ─────────────────────────────────────────────────────────────────────

func (c *ApxClient) GetTeamMembers() ([]TeamMember, error) {
	var result struct {
		Members []TeamMember `json:"members"`
	}
	if err := c.get("/team", &result); err != nil {
		return nil, err
	}
	if result.Members == nil {
		result.Members = []TeamMember{}
	}
	return result.Members, nil
}

func (c *ApxClient) AddTeamMember(name, username, atkRole, defRole string, isMainRoster bool) (int64, error) {
	var result struct {
		ID int64 `json:"id"`
	}
	if err := c.post("/team", map[string]any{
		"name": name, "username": username, "atk_role": atkRole,
		"def_role": defRole, "is_main_roster": isMainRoster,
	}, &result); err != nil {
		return 0, err
	}
	return result.ID, nil
}

func (c *ApxClient) UpdateTeamMember(m TeamMember) error {
	return c.put(fmt.Sprintf("/team/%d", m.ID), m)
}

func (c *ApxClient) DeleteTeamMember(id int64) error {
	return c.del(fmt.Sprintf("/team/%d", id))
}

func (c *ApxClient) CountMainRoster(excludeID int64) (int, error) {
	var result struct {
		Count int `json:"count"`
	}
	if err := c.get(fmt.Sprintf("/team/main-roster-count?exclude_id=%d", excludeID), &result); err != nil {
		return 0, err
	}
	return result.Count, nil
}

func (c *ApxClient) EnsureTeamPlayers() error {
	return c.post("/team/ensure-players", map[string]any{}, nil)
}

// ── Staff ─────────────────────────────────────────────────────────────────────

func (c *ApxClient) GetStaffMembers() ([]StaffMember, error) {
	var result struct {
		Staff []StaffMember `json:"staff"`
	}
	if err := c.get("/staff", &result); err != nil {
		return nil, err
	}
	if result.Staff == nil {
		result.Staff = []StaffMember{}
	}
	return result.Staff, nil
}

func (c *ApxClient) AddStaffMember(name, role, username string) (int64, error) {
	var result struct {
		ID int64 `json:"id"`
	}
	if err := c.post("/staff", map[string]any{"name": name, "role": role, "username": username}, &result); err != nil {
		return 0, err
	}
	return result.ID, nil
}

func (c *ApxClient) UpdateStaffMember(id int64, name, role, username string) error {
	return c.put(fmt.Sprintf("/staff/%d", id), map[string]any{"name": name, "role": role, "username": username})
}

func (c *ApxClient) DeleteStaffMember(id int64) error {
	return c.del(fmt.Sprintf("/staff/%d", id))
}

// ── Badges ───────────────────────────────────────────────────────────────────

func (c *ApxClient) GetAllBadges() ([]Badge, error) {
	var badges []Badge
	if err := c.get("/badges/all", &badges); err != nil {
		return nil, err
	}
	if badges == nil {
		badges = []Badge{}
	}
	return badges, nil
}

func (c *ApxClient) CreateBadge(name, description, info, imageURL, category string, maxLevel int) (int64, error) {
	var result struct {
		ID int64 `json:"id"`
	}
	if err := c.post("/badges", map[string]any{
		"name": name, "description": description, "info": info,
		"image_url": imageURL, "category": category, "max_level": maxLevel,
	}, &result); err != nil {
		return 0, err
	}
	return result.ID, nil
}

func (c *ApxClient) UpdateBadge(id int64, name, description, info, imageURL, category string, maxLevel int, available bool) error {
	return c.put(fmt.Sprintf("/badges/%d", id), map[string]any{
		"name": name, "description": description, "info": info,
		"image_url": imageURL, "category": category, "max_level": maxLevel, "available": available,
	})
}

func (c *ApxClient) DeleteBadge(id int64) error {
	return c.del(fmt.Sprintf("/badges/%d", id))
}

func (c *ApxClient) GetUserBadges(userID int64) ([]UserBadge, error) {
	var badges []UserBadge
	if err := c.get(fmt.Sprintf("/badges/users/%d", userID), &badges); err != nil {
		return nil, err
	}
	if badges == nil {
		badges = []UserBadge{}
	}
	return badges, nil
}

func (c *ApxClient) EnsureApxMemberBadge() error {
	return c.post("/badges/ensure-member", map[string]any{}, nil)
}

func (c *ApxClient) GetBadgeIDByName(name string) (int64, error) {
	var result struct {
		ID int64 `json:"id"`
	}
	if err := c.get("/badges/by-name/"+name, &result); err != nil {
		return 0, err
	}
	return result.ID, nil
}

func (c *ApxClient) UpsertUserBadge(userID, badgeID int64, level int) error {
	return c.post(fmt.Sprintf("/badges/users/%d", userID), map[string]any{
		"badge_id": badgeID, "level": level,
	}, nil)
}

func (c *ApxClient) RemoveUserBadge(userID, badgeID int64) error {
	return c.del(fmt.Sprintf("/badges/users/%d/%d", userID, badgeID))
}

// ── Items ─────────────────────────────────────────────────────────────────────

func (c *ApxClient) GetAllItems() ([]Item, error) {
	var items []Item
	if err := c.get("/items", &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []Item{}
	}
	return items, nil
}

func (c *ApxClient) CreateItem(item *Item) error {
	return c.post("/items", item, nil)
}

func (c *ApxClient) DeleteItem(itemID string) error {
	return c.del("/items/" + itemID)
}

func (c *ApxClient) GetUserItems(userID int64) ([]ProgressionInventoryItem, error) {
	var items []ProgressionInventoryItem
	if err := c.get(fmt.Sprintf("/progression/inventory/%d", userID), &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []ProgressionInventoryItem{}
	}
	return items, nil
}

// ── Events ───────────────────────────────────────────────────────────────────

func (c *ApxClient) GetAllEvents() ([]Event, error) {
	var events []Event
	if err := c.get("/events", &events); err != nil {
		return nil, err
	}
	if events == nil {
		events = []Event{}
	}
	return events, nil
}

func (c *ApxClient) GetEventByID(id string) (*Event, error) {
	var e Event
	if err := c.get("/events/"+id, &e); err != nil {
		return nil, err
	}
	return &e, nil
}

func (c *ApxClient) IsEventParticipant(userID int64, eventID string) (bool, error) {
	var result struct {
		IsParticipant bool `json:"is_participant"`
	}
	if err := c.get(fmt.Sprintf("/events/%s/is-participant?user_id=%d", eventID, userID), &result); err != nil {
		return false, err
	}
	return result.IsParticipant, nil
}

func (c *ApxClient) JoinEvent(userID int64, eventID string) error {
	return c.post(fmt.Sprintf("/events/%s/service-join", eventID), map[string]any{"user_id": userID}, nil)
}

func (c *ApxClient) LeaveEvent(userID int64, eventID string) error {
	return c.delBody(fmt.Sprintf("/events/%s/service-leave", eventID), map[string]any{"user_id": userID})
}

func (c *ApxClient) CreateEvent(in CreateEventInput) (*Event, error) {
	var e Event
	if err := c.post("/events/service-create", in, &e); err != nil {
		return nil, err
	}
	return &e, nil
}

func (c *ApxClient) UpdateEvent(e *Event) error {
	return c.put("/events/"+e.ID, e)
}

func (c *ApxClient) DeleteEvent(id string) error {
	return c.del("/events/" + id)
}

func (c *ApxClient) GetEventParticipants(eventID string) ([]EventParticipant, error) {
	var participants []EventParticipant
	if err := c.get("/events/"+eventID+"/participants", &participants); err != nil {
		return nil, err
	}
	if participants == nil {
		participants = []EventParticipant{}
	}
	return participants, nil
}

// ── Log (Team News) ───────────────────────────────────────────────────────────

func (c *ApxClient) GetAllLogEntries() ([]LogEntry, error) {
	var entries []LogEntry
	if err := c.get("/log", &entries); err != nil {
		return nil, err
	}
	if entries == nil {
		entries = []LogEntry{}
	}
	return entries, nil
}

func (c *ApxClient) CreateLogEntry(entry *LogEntry) error {
	return c.post("/log", entry, nil)
}

func (c *ApxClient) UpdateLogEntry(entry *LogEntry) error {
	return c.put(fmt.Sprintf("/log/%d", entry.ID), entry)
}

func (c *ApxClient) DeleteLogEntry(id int64) error {
	return c.del(fmt.Sprintf("/log/%d", id))
}

// ── Applications ─────────────────────────────────────────────────────────────

func (c *ApxClient) CreateApplication(app ApplicationRecord) (int64, error) {
	var result struct {
		ID int64 `json:"id"`
	}
	if err := c.post("/applications", app, &result); err != nil {
		return 0, err
	}
	return result.ID, nil
}

func (c *ApxClient) GetApplications() ([]ApplicationRecord, error) {
	var apps []ApplicationRecord
	if err := c.get("/applications", &apps); err != nil {
		return nil, err
	}
	if apps == nil {
		apps = []ApplicationRecord{}
	}
	return apps, nil
}

func (c *ApxClient) GetApplicationByUserID(userID int64) (*ApplicationRecord, error) {
	var app ApplicationRecord
	if err := c.get(fmt.Sprintf("/applications/user/%d", userID), &app); err != nil {
		return nil, err
	}
	return &app, nil
}

func (c *ApxClient) UpdateApplicationByUserID(userID int64, app ApplicationRecord) error {
	return c.put(fmt.Sprintf("/applications/user/%d", userID), app)
}

// ── Progression ───────────────────────────────────────────────────────────────

func (c *ApxClient) ResolveUserIDByDiscord(discordID string) (int64, error) {
	var result struct {
		UserID int64 `json:"user_id"`
	}
	if err := c.post("/progression/resolve-discord", map[string]any{"discord_id": discordID}, &result); err != nil {
		return 0, err
	}
	return result.UserID, nil
}

func (c *ApxClient) UpsertProgressionUser(userID int64, discordID string, level, xp, balance int) error {
	return c.post("/progression/users", map[string]any{
		"user_id": userID, "discord_id": discordID,
		"level": level, "xp": xp, "currency_balance": balance,
	}, nil)
}

func (c *ApxClient) InsertInventoryItem(userID int64, invID, itemID int, name, rarity, itemType, assetKey string, sellPrice int) error {
	return c.post("/progression/inventory", map[string]any{
		"user_id": userID, "inventory_id": invID, "item_id": itemID,
		"name": name, "rarity": rarity, "item_type": itemType,
		"asset_key": assetKey, "sell_price": sellPrice,
	}, nil)
}

func (c *ApxClient) DeleteInventoryItem(userID int64, inventoryID int) error {
	return c.del(fmt.Sprintf("/progression/inventory/%d/%d", userID, inventoryID))
}

func (c *ApxClient) UpdateProgressionUserRank(userID int64, discordID, rank string) error {
	return c.patch(fmt.Sprintf("/progression/users/by-discord/%s/rank", discordID),
		map[string]any{"user_id": userID, "rank": rank})
}

func (c *ApxClient) EquipInventoryItem(userID int64, inventoryID int, itemType string, equipped bool) error {
	return c.patch(fmt.Sprintf("/progression/inventory/%d/%d/equip", userID, inventoryID),
		map[string]any{"equipped": equipped, "item_type": itemType})
}

func (c *ApxClient) GetProgressionUser(userID int64) (*ProgressionUser, error) {
	var u ProgressionUser
	if err := c.get(fmt.Sprintf("/progression/users/%d", userID), &u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (c *ApxClient) GetEquippedItems(userID int64) ([]ProgressionInventoryItem, error) {
	var items []ProgressionInventoryItem
	if err := c.get(fmt.Sprintf("/progression/equipped/%d", userID), &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []ProgressionInventoryItem{}
	}
	return items, nil
}

func (c *ApxClient) GetBotLeaderboard(guildID string, limit int) ([]BotUser, error) {
	var users []BotUser
	if err := c.get(fmt.Sprintf("/bot/leaderboard?guild_id=%s&limit=%d", guildID, limit), &users); err != nil {
		return nil, err
	}
	if users == nil {
		users = []BotUser{}
	}
	return users, nil
}

func (c *ApxClient) GetBotUser(discordID, guildID string) (*BotUser, error) {
	var u BotUser
	if err := c.get(fmt.Sprintf("/bot/user/%s/%s", discordID, guildID), &u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (c *ApxClient) DeleteAllTrustedDevices(userID int64) {
	devices, err := c.GetTrustedDevices(userID)
	if err != nil {
		return
	}
	for _, d := range devices {
		_ = c.DeleteTrustedDevice(d.Token, userID)
	}
}

func (c *ApxClient) DeleteUserSessions(userID int64) error {
	return c.del(fmt.Sprintf("/users/%d/sessions", userID))
}
