# PubSub Viewer — Design Spec

**Date:** 2026-06-09  
**Status:** Approved

## Overview

A local developer tool for monitoring Google Cloud Pub/Sub subscriptions in real time. The app polls a chosen subscription using the `gcloud` CLI, displays incoming messages as structured cards, and never sends ACKs — so messages remain on the subscription/topic.

---

## Architecture

Two processes launched together via a single `npm run dev` command at the repo root (using `concurrently`):

```
PubSubViewer/
├── package.json         # root — runs both processes
├── frontend/            # Vite + React + TypeScript + Tailwind CSS
└── backend/             # Node.js + Express (TypeScript)
```

**Request flow:**
1. On load, frontend calls `GET /api/project` → backend runs `gcloud config get-value project` → returns active project ID
2. Frontend calls `GET /api/subscriptions` → backend runs `gcloud pubsub subscriptions list --format=json` → returns list of subscription names
3. User selects a subscription from a dropdown
4. User clicks **Start** → frontend begins a 2-second polling loop calling `GET /api/messages?subscription=<name>`
5. Backend runs `gcloud pubsub subscriptions pull --no-auto-ack --limit=10 --format=json` and returns the message array
6. Frontend prepends new messages to its local list (capped at 200, newest first), skipping duplicates by `messageId`

---

## Backend

**Stack:** Node.js + Express + TypeScript  
**Port:** 3001. The Vite dev server (port 5173) proxies `/api/*` to `http://localhost:3001` so the frontend makes same-origin requests.

**Three routes:**

| Route | gcloud command | Returns |
|---|---|---|
| `GET /api/project` | `gcloud config get-value project` | `{ project: string }` |
| `GET /api/subscriptions` | `gcloud pubsub subscriptions list --format=json` | `{ subscriptions: string[] }` |
| `GET /api/messages?subscription=<name>` | `gcloud pubsub subscriptions pull --no-auto-ack --limit=10 --format=json` | `{ messages: PubSubMessage[] }` |

**Subscription names:** `gcloud pubsub subscriptions list` returns full resource paths (`projects/<id>/subscriptions/<name>`). The backend extracts the short name (the part after the last `/`) for display in the dropdown, but passes the full resource path to the pull command.

Errors: if `gcloud` is not found, return `500` with `"gcloud CLI not found"`. If `gcloud` exits non-zero, return `500` with the stderr content. No retries.

---

## Frontend

**Stack:** Vite + React + TypeScript + Tailwind CSS

### Shared Type

```ts
interface PubSubMessage {
  messageId: string
  publishTime: string
  data: string                        // base64-decoded string
  attributes: Record<string, string>
}
```

### Components

**`App`** — top-level layout and state owner:
```ts
project: string
subscriptions: string[]
selectedSubscription: string | null
messages: PubSubMessage[]             // capped at 200, newest first
isPolling: boolean
error: string | null
```

**`SubscriptionSelector`** — dropdown to pick a subscription, Start/Stop button, displays current project name.

**`MessageList`** — scrollable list of `MessageCard` components, shows total message count, has a Clear button.

**`MessageCard`** — renders one message:
- Header: message ID + publish timestamp
- Data: JSON pretty-printed (if valid JSON) or plain decoded string
- Attributes: key-value table (hidden if empty)

---

## Data Flow & State

- All state lives in `App`, passed down as props. No external state library.
- **Start polling:** sets `isPolling = true`, starts a `setInterval` at 2000ms
- **Each tick:** calls `/api/messages`, base64-decodes `data`, prepends non-duplicate messages, trims list to 200
- **Duplicate detection:** skip any message whose `messageId` already exists in the list
- **Stop polling:** clears the interval, sets `isPolling = false`
- **Switching subscriptions:** auto-stops polling and clears the message list

---

## Error Handling

**Backend:** surfaces `gcloud` errors (not found, auth failure, bad subscription) as `500` with a descriptive message string.

**Frontend:**
- Dismissible error banner at the top of the page
- If `/api/project` or `/api/subscriptions` fails on load → show banner, disable selector
- If a poll tick fails → show banner, stop polling automatically
- Banner clears when the user starts a new poll or dismisses it manually

---

## Manual Smoke Test Checklist

- [ ] `gcloud` not on PATH → error banner shown, app does not crash
- [ ] No active gcloud project configured → error banner shown
- [ ] Subscription list loads and populates the dropdown
- [ ] Start polling → messages appear as cards with decoded data and attributes
- [ ] Duplicate messages (same `messageId`) are not re-rendered
- [ ] Stop polling → interval stops, no further requests
- [ ] Switching subscriptions stops polling and clears the message list
- [ ] 200-message cap → oldest messages are dropped when exceeded
- [ ] Messages with no attributes → attributes section is hidden on the card
- [ ] Messages with invalid JSON data → data shown as plain string, no crash
