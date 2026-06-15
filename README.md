# Cortex 3.0 — Personal OS

A personal productivity PWA. Works on phone, tablet, and laptop. Data stored in your Google Drive — login with Google to access your data from any device.

## Architecture

```
GitHub Pages (UI)  +  Google Drive (your data)  +  Firebase Auth (login)
```

- **UI**: React + Vite + TypeScript + Tailwind — hosted on GitHub Pages (free)
- **Data**: Google Drive API — your JSON files in your own Drive
- **Auth**: Firebase Auth (Google Sign-in) — one login unlocks Drive + Calendar
- **AI**: Gemini API (free, 1500 req/day) — works on phone without laptop
- **Phone**: PWA — add to home screen, works offline

## Setup on a New Machine

### Prerequisites
- [Node.js 20+](https://nodejs.org)
- [Git](https://git-scm.com)

### Steps
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME
cd YOUR_REPO_NAME
npm install
cp .env.example .env.local
# fill in .env.local with your Firebase credentials
npm run dev
```

Open `http://localhost:5173`

## Environment Variables

Create `.env.local` (never commit this — it's in .gitignore):

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_BASE_PATH=/
```

## GitHub Secrets (for auto-deploy)

In your GitHub repo → Settings → Secrets → Actions, add:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_BASE_PATH` (e.g. `/cortex/` if no custom domain)

Push to `main` → GitHub Actions builds + deploys automatically. No manual builds needed.

## Google Drive Folder Structure

Create this folder manually in your Google Drive before first use:

```
My Drive/
└── Cortex/
    ├── settings.json
    ├── todos.json
    ├── notes.json
    ├── habits.json
    ├── goals.json
    ├── health.json
    ├── finance.json
    ├── vocab.json
    ├── books.json
    ├── tolearn.json
    ├── links.json
    ├── journal.json
    └── language.json
```

## Required Google APIs (enable in Google Cloud Console)
- Google Drive API
- Google Calendar API

## Dev Commands

```bash
npm run dev      # start dev server (http://localhost:5173)
npm run build    # production build
npm run preview  # preview production build locally
```

## Current Build Status

- [x] All pages: Todos, Notes, Projects, Habits, Goals, Health, Finance, Vocab, News, Books, Language, AI Chat, Focus Timer, Links, Journal, Settings
- [x] 5 themes (Dark, Light, Nebula, Ember, Glacier)
- [x] GitHub Actions auto-deploy pipeline
- [ ] Firebase Auth + Google Sign-in
- [ ] Google Drive data storage
- [ ] PWA manifest + service worker (phone install)
- [ ] Google Calendar sync
- [ ] Gemini AI globally wired
