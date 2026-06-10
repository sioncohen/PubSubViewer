# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands are run from the repo root unless noted.

**Install all dependencies (root + backend + frontend):**
```
npm run install:all
```

**Run in dev mode (backend + frontend, no Electron window):**
```
npm run dev
```

**Run in dev mode with Electron window:**
```
npm run dev:electron
```

**Build Windows installer:**
```
npm run build:win
```

**Backend only (from `backend/`):**
```
npm run dev      # ts-node-dev with hot reload
npm run build    # compile TypeScript to dist/
```

**Frontend only (from `frontend/`):**
```
npm run dev      # Vite dev server on port 5173
npm run build    # tsc + Vite production build
npm run lint     # ESLint
```

There are no automated tests.

## Architecture

PubSub Viewer is a local desktop tool for monitoring Google Cloud Pub/Sub subscriptions. It polls via the `gcloud` CLI and never sends ACKs, so messages remain on the subscription.

### Process structure

```
PubSubViewer/
├── electron/main.js       # Electron shell (wraps app for desktop)
├── frontend/              # Vite + React 19 + TypeScript + Tailwind CSS
└── backend/               # Node.js + Express + TypeScript
```

The root `package.json` uses `concurrently` to launch backend and frontend together. In production, Electron loads the built `frontend/dist/index.html` and starts the backend in-process.

### Backend (port 3001)

Three routes, each executing a `gcloud` CLI command via `backend/src/gcloud.ts`:

| Route | gcloud command |
|---|---|
| `GET /api/project` | `gcloud config get-value project` |
| `GET /api/subscriptions` | `gcloud pubsub subscriptions list --format=json` |
| `GET /api/messages?subscription=<name>` | `gcloud pubsub subscriptions pull --no-auto-ack --limit=10 --format=json` |

`gcloud.ts` routes through `cmd.exe /c gcloud` on Windows because `.cmd` executables can't be spawned directly.

### Frontend (port 5173 in dev)

All state lives in `App.tsx`. No external state library. The Vite dev server proxies `/api/*` → `http://localhost:3001`. In the packaged Electron build (loaded via `file://`), `frontend/src/api.ts` detects the protocol and hits `http://localhost:3001` directly.

Key behaviors:
- Polls every 2 seconds when started; stops on error
- Deduplicates by `messageId` using a `useRef<Set>` — messages use `--no-auto-ack` so the same messages reappear on each pull
- Message list is capped at 200, newest first
- Switching subscriptions stops polling and clears the list

### Electron packaging

`electron-builder` bundles the app into a one-click NSIS installer for Windows. The packaged build includes `electron/main.js`, `frontend/dist/`, `backend/dist/`, and `backend/node_modules/`. The backend is started in-process by `electron/main.js` after `require('../backend/dist/index.js')`.
