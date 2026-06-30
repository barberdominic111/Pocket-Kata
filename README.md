# Kata Improvement Board

A pocket-sized A3 for Toyota Kata–style improvement work. Define a problem, map your current and target conditions, run a 9 Whys root cause analysis, prioritize countermeasures on an impact/effort matrix, and log every experiment — all organized like a OneNote notebook (Notebooks → Pages), and saved locally in your browser.

## Features

- **Notebooks & Pages** — organize multiple problems like OneNote: notebooks group related pages, each page is its own A3
- **Board tab** — Problem statement, Current Condition and Target Condition as indented process maps (step / decision / note nodes, BOM-style numbering)
- **Obstacles** — track blockers with status (Open → Working → Resolved) and a "how will you measure it" field
- **RCA tab** — 9 Whys (Liberating Structures) guided root cause analysis, one space per why to log your answer
- **Cm tab** — Countermeasures scored by Impact and Effort, with a live scatter-plot matrix (Quick Win / Big Bet / Fill In / Hard Sell quadrants)
- **Ex tab** — Experimenting Record: hypothesis → action → result → outcome (Learned / Confirmed / Invalidated)
- **Installable PWA** — add to your home screen on mobile or desktop; works offline since data is local
- **Persistent storage** — everything saved to `localStorage`, no backend or account needed

## Deploy to Vercel (2 minutes)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Vercel auto-detects Vite — click **Deploy**

## Local Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Tech Stack

- React 18 + Vite
- `recharts` for the impact/effort matrix
- `lucide-react` for icons
- `vite-plugin-pwa` for installability
- `localStorage` for persistence — no backend, no database

## Data & Privacy

All data stays in your browser's `localStorage`. Nothing is sent anywhere. Clearing your browser data or switching devices will lose your boards unless you export/back them up manually (consider adding an export-to-JSON feature if you need this).
