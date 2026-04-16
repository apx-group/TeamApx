<h1 align="center">
    <a href="https://apx.team.com">
        <img src="./frontend/public/github/logo.png" alt="TeamApx Logo" width="50">
        <br>
        TeamApx Website
    </a>
</h1>

# [German Version](README_DE.md)

Official website of the **TeamApx E-Sports Team** and its community.
The goal of the site is to create a central hub for team information, community updates, applications, and weekly statistics — all presented in a clear and intuitive way.

---

## Live

[https://apx-team.com](https://apx-team.com)

## Content / Features

- **Team Overview** — all members, roles, and info at a glance
- **Online Application Form** — submit applications directly via the website
- **Events** — upcoming tournaments, matches, and events
- **Team Log** — news and announcements
- **Leaderboard** — community progression rankings
- **Organization Chart** — team structure at a glance
- **Shop & Inventory** — item shop with personal inventory
- **Weekly Statistics & Updates** — team and community performance
- **Social Links** — access to our social media channels
- **About Us** — background information about the team
- **Multilingual Support** — German & English
- **Login System** — for applicants and internal features

---

## Technology Stack

- **Frontend:** React, TypeScript, Vite, React Router, Axios, plain CSS
- **Backend:** Go (net/http)
- **Database:** SQLite (users.db, data.db)
- **Build & Deployment:** Docker (optional), Nginx on a private server
- **Hosting:** Private server with custom domain

---

## Project Structure Highlights

- **Templates (active):** `frontend/src/templates/layout/` (Navbar, Footer, AccountLayout, Sidebar)
- **Templates (snippets):** `frontend/src/templates/library/` (copy-&-paste Markdown snippets)
- **Pages:** `frontend/src/pages/`
- **Styles:** `frontend/src/styles/`

---

## Development / Local Testing

1. Clone the repository:

```bash
git clone https://github.com/apx-group/TeamApx.git
cd TeamApx
```

2. Start the backend:

```bash
cd backend/cmd
cp ../../.env.linux ../../.env   # fill in required vars
go run .
```

3. Start the frontend (separate terminal):

```bash
cd frontend
npm install
npm run dev
```

---

## License

This project is licensed under the **MIT License** — see LICENSE.

## Contact

- **E-Mail:** team.apx.r6@gmail.com
- **TeamApx:** https://apx-team.com
- **Developer / Maintainer:** LIXH
