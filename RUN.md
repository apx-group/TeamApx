# TeamApx — Lokales & Produktives Starten

## Systemanforderungen

### Lokal entwickeln
- **Node.js** ≥ 18 (für Frontend)
- **Go** ≥ 1.21 (für Backend)
- **Git** (für Versionskontrolle)

### Produktion (Docker)
- **Docker** ≥ 20.10
- **Docker Compose** ≥ 2.0

---

## 🚀 Lokale Entwicklung

### Linux / macOS

#### 1. Repository clonen
```bash
git clone https://github.com/apx-group/TeamApx.git
cd TeamApx
```

#### 2. Umgebungsvariablen einrichten
```bash
cp .env.linux .env
# .env editieren und erforderliche Variablen setzen:
# - ADMIN_PASSWORD
# - SMTP_HOST/PORT/USER/PASS/FROM (optional, für Email)
# - DISCORD_CLIENT_ID/SECRET/REDIRECT_URI
# - APX_API_URL=http://localhost:3000
# - APX_API_KEY=your-api-key
```

#### 3. Backend starten (Terminal 1)
```bash
cd backend/cmd
go run .
# Output: Backend listening on :8080
```

#### 4. Frontend starten (Terminal 2)
```bash
cd frontend
npm install
npm run dev
# Output: http://localhost:5173
```

#### 5. Browser öffnen
```
http://localhost:5173
```

**Das ist alles!** Vite proxyt automatisch `/api`, `/auth`, `/public` zu `http://localhost:8080`.

---

### Windows (PowerShell)

#### 1. Repository clonen
```powershell
git clone https://github.com/apx-group/TeamApx.git
cd TeamApx
```

#### 2. Umgebungsvariablen einrichten
```powershell
Copy-Item .env.linux .env
# .env im Editor öffnen und erforderliche Variablen setzen
notepad .env
```

#### 3. Backend starten (PowerShell Terminal 1)
```powershell
cd backend/cmd
go run .
# Output: Backend listening on :8080
```

#### 4. Frontend starten (PowerShell Terminal 2)
```powershell
cd frontend
npm install
npm run dev
# Output: http://localhost:5173
```

#### 5. Browser öffnen
```
http://localhost:5173
```

---

## 🐳 Produktionsdeployment (Docker)

### Linux / macOS / Windows

#### 1. Repository auf Server clonen
```bash
git clone https://github.com/apx-group/TeamApx.git
cd TeamApx
```

#### 2. Umgebungsdatei erstellen
```bash
cp deployment/docker/.env.example .env
# .env editieren mit Production-Variablen:
```

**.env Beispiel (Production):**
```bash
# Admin
ADMIN_PASSWORD=SecurePassword123!

# SMTP (für Email-Verifikation)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@teamapx.gg

# OAuth (Discord, etc.)
DISCORD_CLIENT_ID=your-id
DISCORD_CLIENT_SECRET=your-secret
DISCORD_REDIRECT_URI=https://teamapx.gg/auth/discord/callback

# ApxApi Connection
APX_API_URL=http://apx-stats-backend:8080
APX_API_KEY=your-api-key

# Datenbank-Pfade (im Container)
USER_DB_PATH=/data/users.db
DATA_DB_PATH=/data/data.db
UPLOAD_DIR=/app/public/uploads

# App-Basis-URL
APP_BASE_URL=https://teamapx.gg

# Master Password (für sensitive Admin-Operationen)
MASTERPASSWORD=AnotherSecurePassword456!
```

#### 3. Frontend bauen
```bash
cd frontend
npm install
npm run build
# Output: frontend/dist/
```

#### 4. Docker Compose starten
```bash
cd deployment/docker
docker-compose up -d
# oder mit Rebuild:
docker-compose up -d --build
```

#### 5. Logs überprüfen
```bash
docker-compose logs -f backend
```

#### 6. Stoppen
```bash
docker-compose down
```

---

## Umgebungsvariablen

### Erforderlich
| Variable | Beschreibung | Beispiel |
|----------|-------------|---------|
| `ADMIN_PASSWORD` | Passwort für Admin-Account | `admin1234` |
| `APX_API_URL` | ApxApi Server-URL | `http://localhost:3000` |
| `APX_API_KEY` | API-Key für ApxApi | `59207de64df...` |

### Optional (aber empfohlen)
| Variable | Beschreibung | Standard |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP Server für Emails | (dev-mode ohne Email) |
| `SMTP_PORT` | SMTP Port | `587` |
| `SMTP_USER` | SMTP Benutzername | |
| `SMTP_PASS` | SMTP Passwort | |
| `SMTP_FROM` | Email-Absender | `SMTP_USER` |
| `DISCORD_CLIENT_ID` | Discord OAuth ID | |
| `DISCORD_CLIENT_SECRET` | Discord OAuth Secret | |
| `DISCORD_REDIRECT_URI` | Discord Callback-URL | |
| `MASTERPASSWORD` | Master Password für Admin-Ops | |

---

## Authentifizierung testen

### Admin-Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin1234"}'

# Response:
# {"user":{"id":2,"username":"admin","email":"admin@teamapx.local","is_admin":true}}
```

### Me (aktueller User)
```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

---

## Troubleshooting

### Port bereits in Verwendung

**Linux/macOS:**
```bash
# Port 8080 freigeben
lsof -i :8080 | grep -v COMMAND | awk '{print $2}' | xargs kill -9

# Port 3000 freigeben
lsof -i :3000 | grep -v COMMAND | awk '{print $2}' | xargs kill -9
```

**Windows (PowerShell Admin):**
```powershell
# Port 8080 freigeben
Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess | Stop-Process -Force

# Port 3000 freigeben
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Datenbankfehler
```bash
# SQLite Dateien löschen (Reset)
rm users.db data.db

# Backend neu starten — DBs werden neu erstellt
cd backend/cmd && go run .
```

### ApxApi Connection Error
```bash
# Überprüfen, ob ApxApi läuft
curl -s http://localhost:3000/users/by-username/admin \
  -H "X-Api-Key: your-api-key"

# Wenn nicht, ApxApi starten:
cd ../ApxApi
docker-compose up -d
```

### Frontend-Build Fehler
```bash
# Dependencies neuinstallieren
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## Entwickler-Tipps

### Backend Hot-Reload (mit `air`)
```bash
# Air installieren
go install github.com/cosmtrek/air@latest

# Im backend/cmd Verzeichnis
air
```

### Frontend-Styles debuggen
```bash
# CSS liegt unter frontend/src/styles/
# Für Komponente XYZ: src/styles/xyz.css
# Nach Änderung wird Vite automatisch neu-geladen
```

### Admin-User in DB erstellen
```bash
# Nach dem Backend-Start
sqlite3 users.db "UPDATE users SET is_admin=1 WHERE username='admin';"
```

### Email-Verifizierungscode in Logs anschauen (Dev-Mode)
```bash
# Logs backend durchsuchen
tail -f /tmp/backend.log | grep "Verifizierungscode"
```

---

## Produktions-Checklist

- [ ] `.env` mit Production-Werten erstellt
- [ ] `MASTERPASSWORD` gesetzt
- [ ] SMTP konfiguriert
- [ ] OAuth Credentials gesetzt
- [ ] `APP_BASE_URL` auf Produktions-Domain gesetzt
- [ ] Frontend gebaut: `npm run build`
- [ ] Docker images gebaut: `docker-compose build`
- [ ] Volumes für `users.db`, `data.db`, `uploads/` persistent
- [ ] Nginx HTTPS konfiguriert (selbstsigniert oder Let's Encrypt)
- [ ] Backups der SQLite-Dateien eingerichtet

---

## Support

Bei Fragen oder Problemen:
- Überprüfe `/AGENTS.md` für technische Details
- Sieh in `backend/cmd/*.go` für API-Endpunkte
- Sieh in `frontend/src/` für UI-Komponenten
