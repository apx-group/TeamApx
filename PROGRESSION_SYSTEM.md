# Progression System — Dokumentation

Gebaut in: `main` branch
Datum: 2026-03-16
Status: Phase 3 ✅ Go REST API | Phase 4 ✅ React Website | Rang-Sync ✅

---

## Übersicht

Nach S-Rank (Level 500) ein vollständiger Progression-Layer:
- Eigene Währung (Coins) — farmbar via Discord
- Kisten mit Seltenheitssystem
- Items (Kosmetik, XP-Boosts, Level-Tokens, Titel)
- Alles auf der Website dargestellt

**Architektur:**
```
Discord Bot  ──POST──►  Go Backend (users.db)  ──GET──►  React Website
   (Bot ist Event-Producer)    (Source of Truth)         (Darstellung)
```

---

## Datenbank — `users.db`

### Migration `020_progression.sql`
`backend/cmd/migrations/users/020_progression.sql`

| Tabelle | Inhalt |
|---|---|
| `progression_users` | Level, XP, Coin-Balance pro User (verknüpft via Discord-ID) |
| `progression_inventory` | Bot-verwaltete Items mit Bot-eigener `inventory_id` |

```sql
-- progression_users
user_id          INTEGER PRIMARY KEY   -- users.id
discord_id       TEXT                  -- Discord-User-ID (für Lookup)
level            INTEGER DEFAULT 0
xp               INTEGER DEFAULT 0
currency_balance INTEGER DEFAULT 0
updated_at       DATETIME

-- progression_inventory
id           INTEGER PRIMARY KEY AUTOINCREMENT
user_id      INTEGER                   -- users.id
inventory_id INTEGER                   -- Bot's eigene ID (UNIQUE per user)
item_id      INTEGER
name         TEXT
rarity       TEXT                      -- common|uncommon|rare|epic|legendary
item_type    TEXT                      -- cosmetic|boost_xp|boost_coin|title|frame
asset_key    TEXT
sell_price   INTEGER DEFAULT 0
equipped     INTEGER DEFAULT 0
obtained_at  DATETIME
UNIQUE(user_id, inventory_id)
```

---

## Go Backend

### Neue Datei: `backend/cmd/progression.go`

#### Auth-Middleware (intern)
```go
// Header prüfen
key := r.Header.Get("X-Api-Key")
if key != os.Getenv("INTERNAL_API_KEY") {
    w.WriteHeader(http.StatusUnauthorized)
    return
}
```

#### `.env` — neue Variable
```env
INTERNAL_API_KEY=dein-geheimer-key   # Selbst gewähltes Passwort, muss auch im Bot stehen
```

---

### Interne Endpoints — Bot → Go

Alle gesichert durch `X-Api-Key` Header.

#### `POST /api/internal/progression/user-sync`
Wird vom Bot aufgerufen wenn sich Level, XP oder Coins ändern.

**Request:**
```json
{
  "user_id": "123456789",
  "guild_id": "935593651696963585",
  "level": 47,
  "xp": 0,
  "currency_balance": 1500
}
```

**Response (Discord nicht verknüpft):**
```json
{ "success": true, "linked": false }
```

**Response (verknüpft):**
```json
{ "success": true, "linked": true }
```

→ Upsert in `progression_users`. Kein Fehler wenn User noch kein Discord verknüpft hat.

---

#### `POST /api/internal/progression/inventory-add`
Wird aufgerufen wenn User ein Item erhält (Kiste, Kauf, Admin-Give).

**Request:**
```json
{
  "user_id": "123456789",
  "guild_id": "935593651696963585",
  "inventory_id": 42,
  "item_id": 3,
  "name": "Gold Frame",
  "rarity": "rare",
  "item_type": "cosmetic",
  "asset_key": "frame_gold",
  "sell_price": 120
}
```

→ Insert in `progression_inventory`. ON CONFLICT → Update.

---

#### `POST /api/internal/progression/inventory-remove`
Wird aufgerufen wenn User ein Item verkauft oder es entfernt wird.

**Request:**
```json
{
  "user_id": "123456789",
  "guild_id": "935593651696963585",
  "inventory_id": 42
}
```

→ DELETE by `(user_id, inventory_id)`.

---

#### `POST /api/internal/progression/inventory-equip`
Wird aufgerufen wenn User `/equip` oder `/unequip` ausführt.

**Request:**
```json
{
  "user_id": "123456789",
  "guild_id": "935593651696963585",
  "inventory_id": 42,
  "equipped": true,
  "item_type": "cosmetic"
}
```

**Logik:**
- `equipped: true` → erst alle anderen Items desselben `item_type` auf `equipped=0`, dann dieses auf `equipped=1`
- `equipped: false` → nur dieses Item auf `equipped=0`

---

### Öffentliche Endpoints — Go → Website

Kein Auth nötig (außer `/api/progression/me`).

#### `GET /api/progression/profile?u=<username>`

```json
{
  "username": "Betzh",
  "level": 47,
  "xp": 800,
  "currency_balance": 1500,
  "rank": "A",
  "equipped_items": [
    {
      "inventory_id": 42,
      "name": "Gold Frame",
      "rarity": "rare",
      "item_type": "cosmetic",
      "asset_key": "frame_gold"
    }
  ]
}
```

---

#### `GET /api/progression/me` — Auth: Session Cookie

```json
{
  "user_id": "123456789",
  "level": 47,
  "currency_balance": 1500,
  "inventory": [
    {
      "inventory_id": 42,
      "name": "Gold Frame",
      "rarity": "rare",
      "item_type": "cosmetic",
      "asset_key": "frame_gold",
      "equipped": true
    }
  ]
}
```

---

#### `GET /api/progression/leaderboard?limit=50&offset=0`

```json
[
  {
    "rank": 1,
    "username": "Betzh",
    "nickname": "BETZH",
    "avatar_url": "/public/uploads/...",
    "level": 420,
    "currency_balance": 12000,
    "equipped_frame": "frame_flame"
  }
]
```

Limit: max 100. Default: 50.

---

### Rang-System

**Primär: Discord-Rollen** (Server `935593651696963585`)

| Discord-Rollen-ID | Rang |
|---|---|
| `1387208154739376223` | E |
| `1387209340909387858` | D |
| `1387209465358712863` | C |
| `1391281919106355271` | B |
| `1391281906791747624` | A |
| `1391281999032877096` | S |

Der `discord_rank`-Wert in `progression_users` ist die authoritative Quelle. Wird gesetzt:
- Beim Discord-Verknüpfen (sofort)
- Über `POST /api/internal/progression/role-sync` (Bot, bei Rollenänderung)

**Fallback: Level-basiert** (`levelToRank`) — wenn kein `discord_rank` gesetzt:

| Level | Rang |
|---|---|
| 0–99 | D |
| 100–199 | C |
| 200–299 | B |
| 300–499 | A |
| 500+ | S |

---

### Routen in `main.go`

```go
// Öffentlich
http.HandleFunc("/api/progression/profile",     handleProgressionProfile(userDB))
http.HandleFunc("/api/progression/leaderboard", handleProgressionLeaderboard(userDB))
http.HandleFunc("/api/progression/me",          handleProgressionMe(userDB))

// Intern (Bot)
http.HandleFunc("/api/internal/progression/user-sync",       handleInternalUserSync(userDB))
http.HandleFunc("/api/internal/progression/inventory-add",   handleInternalInventoryAdd(userDB))
http.HandleFunc("/api/internal/progression/inventory-remove",handleInternalInventoryRemove(userDB))
http.HandleFunc("/api/internal/progression/inventory-equip", handleInternalInventoryEquip(userDB))
http.HandleFunc("/api/internal/progression/role-sync",       handleInternalRoleSync(userDB))
```

---

#### `POST /api/internal/progression/role-sync`
Wird aufgerufen wenn ein User eine Rang-Rolle erhält oder verliert.

**Request:**
```json
{
  "user_id": "123456789",
  "guild_id": "935593651696963585",
  "rank": "A-Rank"
}
```
→ `rank` kann auch als Einzelbuchstabe `"A"` gesendet werden (beide Formate akzeptiert).
→ `rank: ""` → löscht `discord_rank` (Fallback auf Level-Berechnung).

**Response:**
```json
{ "success": true, "linked": true }
```

---

## React Frontend

### Neue Dateien

| Datei | Beschreibung |
|---|---|
| `frontend/src/api/progression.ts` | Typisierte API-Calls |
| `frontend/src/pages/Leaderboard.tsx` | Leaderboard-Seite |
| `frontend/src/pages/Inventory.tsx` | Inventar-Seite (geschützt) |
| `frontend/src/styles/leaderboard.css` | Leaderboard-Styles |
| `frontend/src/styles/inventory.css` | Inventar-Styles |

### Geänderte Dateien

| Datei | Änderung |
|---|---|
| `frontend/src/pages/User.tsx` | Progression-Block auf öffentlichem Profil |
| `frontend/src/styles/user.css` | CSS für Progression-Block |
| `frontend/src/App.tsx` | 2 neue Routen |
| `frontend/src/contexts/I18nContext.tsx` | 8 neue Keys DE + EN |

---

### Neue Routen

| Route | Komponente | Auth |
|---|---|---|
| `/leaderboard` | `Leaderboard.tsx` | Nein |
| `/inventory` | `Inventory.tsx` | Ja (Session) |

---

### API-Modul `api/progression.ts`

```typescript
progressionApi.getProfile(username)   // GET /api/progression/profile?u=...
progressionApi.getMe()                // GET /api/progression/me
progressionApi.getLeaderboard(50, 0)  // GET /api/progression/leaderboard?limit=50&offset=0
```

---

### Leaderboard-Seite (`/leaderboard`)

- Top 50 nach Coin-Balance
- Top 3 mit Gold/Silber/Bronze-Medaillen
- Rang-Badge (D/C/B/A/S) pro Eintrag
- Klick auf Spieler → öffentliches Profil
- Coins-Spalte auf Mobile ausgeblendet

---

### Inventar-Seite (`/inventory`)

- Login erforderlich
- Zeigt eigene Level, Coins, alle Items
- Filter-Buttons nach Item-Typ
- Items sortiert nach Seltenheit (Legendary → Common)
- Ausgerüstete Items mit Gold-Glow-Border + "Ausgerüstet"-Badge

---

### Profil-Seite (`/user?u=...`) — Ergänzung

Neuer Block unter dem Avatar:
- Rang-Badge + Level-Zahl + Coin-Anzeige
- Ausgerüstete Items als Chips mit Seltenheits-Farbe
- Nur sichtbar wenn Level > 0 oder Items vorhanden

---

### Design-System

**Rang-Farben:**

| Rang | Farbe |
|---|---|
| D | grau (`#8888a0`) |
| C | teal (`#4fb3bf`) |
| B | blau (`#5b8dd9`) |
| A | lila (`#a855f7`) |
| S | gold (`#bea05d`) |

**Seltenheits-Farben:**

| Seltenheit | Farbe |
|---|---|
| common | grau (`#9e9e9e`) |
| uncommon | grün (`#66bb6a`) |
| rare | blau (`#42a5f5`) |
| epic | lila (`#ce93d8`) |
| legendary | orange (`#ffa726`) |

---

## Bot-Integration (Referenz)

Der Bot benötigt folgende `.env`-Variablen:
```env
INTERNAL_API_URL=http://localhost:8080
INTERNAL_API_KEY=<gleicher Wert wie in Go .env>
```

**Wann der Bot was aufruft:**

| Bot-Event | Endpoint |
|---|---|
| Level-Up, Coins geändert | `POST /api/internal/progression/user-sync` |
| Item erhalten (Kiste, Kauf) | `POST /api/internal/progression/inventory-add` |
| Item verkauft | `POST /api/internal/progression/inventory-remove` |
| `/equip` oder `/unequip` | `POST /api/internal/progression/inventory-equip` |

Wenn `INTERNAL_API_URL` leer ist → Bot ignoriert alle Pushes stillschweigend, kein Crash.

---

## Noch offen (Phase 5)

- XP-Boost-Aktivierung im Bot
- Kisten-Animation auf der Website
- Rate Limiting für interne Endpoints
