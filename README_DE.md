<h1 align="center">
    <a href="https://apx.team.com">
        <img src="./frontend/public/github/logo.png" alt="TeamApx Logo" width="50">
        <br>
        TeamApx Website
    </a>
</h1>

# [English version](README.md)

Offizielle Website des **TeamApx E-Sport Teams** und seiner Community.
Ziel der Seite ist es, einen zentralen Raum für Teaminfos, Community-Updates, Bewerbungen und wöchentliche Statistiken zu schaffen — alles übersichtlich und intuitiv dargestellt.

---

## Live

[https://apx-team.com](https://apx-team.com)

## Inhalt / Features

- **Teamübersicht** — alle Mitglieder, Rollen und Infos auf einen Blick
- **Online Bewerbungsformular** — Bewerbungen direkt über die Website einreichen
- **Events** — kommende Turniere, Matches und Veranstaltungen
- **Wöchentliche Statistiken & Updates** — Team- und Community-Performance
- **Social Links** — Zugriff auf unsere Social-Media-Kanäle
- **About Us** — Hintergrundinfos zum Team
- **Mehrsprachigkeit** — Deutsch & Englisch
- **Login-System** — für Bewerber und interne Features

---

## Technologie Stack

- **Frontend:** React, TypeScript, Vite, React Router, Axios, plain CSS
- **Backend:** Go (net/http)
- **Datenbank:** SQLite (users.db, data.db)
- **Build & Deployment:** Docker (optional), Nginx auf eigenem Server
- **Hosting:** Privater Server mit eigener Domain

---

## Projektstruktur (Highlights)

- **Templates (aktiv):** `frontend/src/templates/layout/` (Navbar, Footer, AccountLayout, Sidebar)
- **Templates (Snippets):** `frontend/src/templates/library/` (Copy-&-Paste Markdown-Snippets)
- **Seiten:** `frontend/src/pages/`
- **Styles:** `frontend/src/styles/`

---

## Entwicklung / Lokales Testen

1. Repository klonen:

```bash
git clone https://github.com/apx-group/TeamApx.git
cd TeamApx
```

2. Backend starten:

```bash
cd backend/cmd
cp ../../.env.linux ../../.env   # erforderliche Variablen setzen
go run .
```

3. Frontend starten (separates Terminal):

```bash
cd frontend
npm install
npm run dev
```

---

## Lizenz

Dieses Projekt ist unter der **MIT Lizenz** lizenziert — siehe LICENSE.

## Kontakt

- **E-Mail:** team.apx.r6@gmail.com
- **TeamApx:** https://apx-team.com
- **Entwickler / Maintainer:** LIXH
