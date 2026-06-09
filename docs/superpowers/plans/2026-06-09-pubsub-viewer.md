# PubSub Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local developer tool with a Vite/React/TypeScript/Tailwind frontend and an Express/TypeScript backend that polls a chosen Google Pub/Sub subscription via `gcloud` CLI and displays messages as structured cards without ever ACKing.

**Architecture:** Two processes (backend on port 3001, Vite dev server on port 5173) are launched together from the repo root via `concurrently`. The Vite dev server proxies `/api/*` to the backend so the frontend makes same-origin requests. The backend shells out to `gcloud` CLI for all Pub/Sub operations.

**Tech Stack:** Node.js + Express + TypeScript (backend), Vite + React + TypeScript + Tailwind CSS v3 (frontend), concurrently (root), gcloud CLI (external dependency)

---

## File Map

```
PubSubViewer/
├── package.json                          # root: concurrently dev script
├── .gitignore
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                      # Express app, route mounting, server start
│       ├── gcloud.ts                     # execSync wrapper for gcloud commands
│       └── routes/
│           ├── project.ts                # GET /api/project
│           ├── subscriptions.ts          # GET /api/subscriptions
│           └── messages.ts              # GET /api/messages
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts                    # proxy /api → localhost:3001
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── index.css                     # Tailwind directives
        ├── types.ts                      # PubSubMessage interface
        ├── api.ts                        # fetch wrappers for 3 endpoints
        ├── App.tsx                       # state owner, polling logic
        └── components/
            ├── MessageCard.tsx           # single message card
            ├── MessageList.tsx           # scrollable list + clear button
            └── SubscriptionSelector.tsx  # dropdown + start/stop button
```

---

## Task 1: Root scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd C:\Data\Repos\PubSubViewer
git init
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "pubsub-viewer",
  "private": true,
  "scripts": {
    "dev": "concurrently -n backend,frontend -c bgBlue,bgGreen \"npm --prefix backend run dev\" \"npm --prefix frontend run dev\"",
    "install:all": "npm install && npm --prefix backend install && npm --prefix frontend install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
.env
```

- [ ] **Step 4: Install root dependencies**

```bash
npm install
```

Expected: `node_modules/` created, `concurrently` installed.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore package-lock.json
git commit -m "chore: root scaffold with concurrently"
```

---

## Task 2: Backend scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "pubsub-viewer-backend",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `backend/src/index.ts`**

```typescript
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})

export default app
```

- [ ] **Step 4: Install backend dependencies**

```bash
npm --prefix backend install
```

Expected: `backend/node_modules/` created.

- [ ] **Step 5: Verify backend starts**

```bash
npm --prefix backend run dev
```

Expected output: `Backend running on http://localhost:3001`

Press `Ctrl+C` to stop.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: backend scaffold with Express + TypeScript"
```

---

## Task 3: gcloud helper

**Files:**
- Create: `backend/src/gcloud.ts`

- [ ] **Step 1: Create `backend/src/gcloud.ts`**

```typescript
import { execSync } from 'child_process'

export function runGcloud(args: string[]): string {
  try {
    return execSync(`gcloud ${args.join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error('gcloud CLI not found')
    }
    const stderr = err.stderr?.toString().trim()
    throw new Error(stderr || err.message)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm --prefix backend run build
```

Expected: `backend/dist/` created, no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/gcloud.ts
git commit -m "feat: gcloud CLI helper"
```

---

## Task 4: Project route

**Files:**
- Create: `backend/src/routes/project.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/src/routes/project.ts`**

```typescript
import { Router } from 'express'
import { runGcloud } from '../gcloud'

const router = Router()

router.get('/', (_req, res) => {
  try {
    const project = runGcloud(['config', 'get-value', 'project'])
    res.json({ project })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 2: Mount route in `backend/src/index.ts`**

Replace the contents of `backend/src/index.ts`:

```typescript
import express from 'express'
import cors from 'cors'
import projectRouter from './routes/project'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/project', projectRouter)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})

export default app
```

- [ ] **Step 3: Verify route works**

Start the backend:
```bash
npm --prefix backend run dev
```

In a second terminal, test the route:
```bash
curl http://localhost:3001/api/project
```

Expected: `{"project":"your-gcp-project-id"}`

Stop the backend with `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/project.ts backend/src/index.ts
git commit -m "feat: GET /api/project route"
```

---

## Task 5: Subscriptions route

**Files:**
- Create: `backend/src/routes/subscriptions.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/src/routes/subscriptions.ts`**

```typescript
import { Router } from 'express'
import { runGcloud } from '../gcloud'

const router = Router()

interface GcloudSubscription {
  name: string
}

router.get('/', (_req, res) => {
  try {
    const output = runGcloud(['pubsub', 'subscriptions', 'list', '--format=json'])
    const raw: GcloudSubscription[] = output ? JSON.parse(output) : []
    const subscriptions = raw.map(s => s.name)
    res.json({ subscriptions })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 2: Mount route in `backend/src/index.ts`**

```typescript
import express from 'express'
import cors from 'cors'
import projectRouter from './routes/project'
import subscriptionsRouter from './routes/subscriptions'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/project', projectRouter)
app.use('/api/subscriptions', subscriptionsRouter)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})

export default app
```

- [ ] **Step 3: Verify route works**

```bash
npm --prefix backend run dev
```

```bash
curl http://localhost:3001/api/subscriptions
```

Expected: `{"subscriptions":["projects/your-project/subscriptions/your-sub", ...]}`

Stop with `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/subscriptions.ts backend/src/index.ts
git commit -m "feat: GET /api/subscriptions route"
```

---

## Task 6: Messages route

**Files:**
- Create: `backend/src/routes/messages.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/src/routes/messages.ts`**

```typescript
import { Router } from 'express'
import { runGcloud } from '../gcloud'

const router = Router()

interface GcloudMessage {
  ackId: string
  message: {
    messageId: string
    publishTime: string
    data?: string
    attributes?: Record<string, string>
  }
}

interface NormalizedMessage {
  messageId: string
  publishTime: string
  data: string
  attributes: Record<string, string>
}

router.get('/', (req, res) => {
  const subscription = req.query.subscription as string
  if (!subscription) {
    return res.status(400).json({ error: 'subscription query param required' })
  }
  try {
    const output = runGcloud([
      'pubsub', 'subscriptions', 'pull', subscription,
      '--no-auto-ack',
      '--limit=10',
      '--format=json'
    ])
    const raw: GcloudMessage[] = output ? JSON.parse(output) : []
    const messages: NormalizedMessage[] = raw.map(item => ({
      messageId: item.message.messageId,
      publishTime: item.message.publishTime,
      data: item.message.data
        ? Buffer.from(item.message.data, 'base64').toString('utf-8')
        : '',
      attributes: item.message.attributes ?? {}
    }))
    res.json({ messages })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 2: Mount route in `backend/src/index.ts`**

```typescript
import express from 'express'
import cors from 'cors'
import projectRouter from './routes/project'
import subscriptionsRouter from './routes/subscriptions'
import messagesRouter from './routes/messages'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/project', projectRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/messages', messagesRouter)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})

export default app
```

- [ ] **Step 3: Verify route works**

```bash
npm --prefix backend run dev
```

```bash
curl "http://localhost:3001/api/messages?subscription=projects/your-project/subscriptions/your-sub"
```

Expected: `{"messages":[...]}` (empty array is fine if no messages pending)

Stop with `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/messages.ts backend/src/index.ts
git commit -m "feat: GET /api/messages route with no-ack pull"
```

---

## Task 7: Frontend scaffold

**Files:**
- Create: `frontend/` (via Vite scaffold)
- Modify: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

Run from `C:\Data\Repos\PubSubViewer`:
```bash
npm create vite@latest frontend -- --template react-ts
```

- [ ] **Step 2: Install Tailwind CSS**

```bash
npm --prefix frontend install -D tailwindcss postcss autoprefixer
cd frontend && npx tailwindcss init -p && cd ..
```

This creates `frontend/tailwind.config.js` and `frontend/postcss.config.js`.

- [ ] **Step 3: Configure `frontend/tailwind.config.js`**

Replace the contents:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {}
  },
  plugins: []
}
```

- [ ] **Step 4: Replace `frontend/src/index.css` with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Configure Vite proxy in `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

- [ ] **Step 6: Verify frontend starts**

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Expected: Vite dev server starts at `http://localhost:5173`. Open in browser — default Vite+React page appears.

Stop with `Ctrl+C`.

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: frontend scaffold with Vite + React + TypeScript + Tailwind"
```

---

## Task 8: Types and API client

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api.ts`

- [ ] **Step 1: Create `frontend/src/types.ts`**

```typescript
export interface PubSubMessage {
  messageId: string
  publishTime: string
  data: string
  attributes: Record<string, string>
}
```

- [ ] **Step 2: Create `frontend/src/api.ts`**

```typescript
import type { PubSubMessage } from './types'

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`)
  return data as T
}

export const fetchProject = () =>
  apiFetch<{ project: string }>('/project')

export const fetchSubscriptions = () =>
  apiFetch<{ subscriptions: string[] }>('/subscriptions')

export const fetchMessages = (subscription: string) =>
  apiFetch<{ messages: PubSubMessage[] }>(
    `/messages?subscription=${encodeURIComponent(subscription)}`
  )
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm --prefix frontend run build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api.ts
git commit -m "feat: shared PubSubMessage type and API client"
```

---

## Task 9: MessageCard component

**Files:**
- Create: `frontend/src/components/MessageCard.tsx`

- [ ] **Step 1: Create `frontend/src/components/MessageCard.tsx`**

```typescript
import type { PubSubMessage } from '../types'

interface Props {
  message: PubSubMessage
}

export default function MessageCard({ message }: Props) {
  let parsedData: unknown = null
  let isJson = false
  try {
    parsedData = JSON.parse(message.data)
    isJson = true
  } catch {
    isJson = false
  }

  const hasAttributes = Object.keys(message.attributes).length > 0

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-center mb-3 text-xs text-gray-400">
        <span className="font-mono">ID: {message.messageId}</span>
        <span>{new Date(message.publishTime).toLocaleString()}</span>
      </div>

      <div className="mb-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Data</p>
        <pre className="bg-gray-900 rounded p-3 text-sm text-gray-200 overflow-x-auto whitespace-pre-wrap break-all font-mono">
          {isJson ? JSON.stringify(parsedData, null, 2) : message.data}
        </pre>
      </div>

      {hasAttributes && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Attributes</p>
          <table className="text-xs w-full">
            <tbody>
              {Object.entries(message.attributes).map(([k, v]) => (
                <tr key={k} className="border-t border-gray-700">
                  <td className="py-1 pr-4 text-gray-400 font-mono">{k}</td>
                  <td className="py-1 text-gray-200 font-mono">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm --prefix frontend run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/MessageCard.tsx
git commit -m "feat: MessageCard component"
```

---

## Task 10: SubscriptionSelector component

**Files:**
- Create: `frontend/src/components/SubscriptionSelector.tsx`

- [ ] **Step 1: Create `frontend/src/components/SubscriptionSelector.tsx`**

```typescript
interface Props {
  subscriptions: string[]
  selected: string | null
  isPolling: boolean
  disabled: boolean
  onSelect: (sub: string) => void
  onStart: () => void
  onStop: () => void
}

function shortName(full: string): string {
  return full.split('/').pop() ?? full
}

export default function SubscriptionSelector({
  subscriptions,
  selected,
  isPolling,
  disabled,
  onSelect,
  onStart,
  onStop
}: Props) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <select
        value={selected ?? ''}
        onChange={e => onSelect(e.target.value)}
        disabled={isPolling || disabled}
        className="bg-gray-800 border border-gray-600 text-gray-100 rounded px-3 py-2 text-sm min-w-72 disabled:opacity-50"
      >
        <option value="" disabled>Select a subscription…</option>
        {subscriptions.map(sub => (
          <option key={sub} value={sub}>{shortName(sub)}</option>
        ))}
      </select>

      <button
        onClick={isPolling ? onStop : onStart}
        disabled={!selected || disabled}
        className={`px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isPolling
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {isPolling ? 'Stop' : 'Start'}
      </button>

      {isPolling && (
        <span className="text-xs text-green-400 animate-pulse">● Polling</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm --prefix frontend run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SubscriptionSelector.tsx
git commit -m "feat: SubscriptionSelector component"
```

---

## Task 11: MessageList component

**Files:**
- Create: `frontend/src/components/MessageList.tsx`

- [ ] **Step 1: Create `frontend/src/components/MessageList.tsx`**

```typescript
import type { PubSubMessage } from '../types'
import MessageCard from './MessageCard'

interface Props {
  messages: PubSubMessage[]
  onClear: () => void
}

export default function MessageList({ messages, onClear }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </span>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-12">
          No messages yet. Select a subscription and click Start.
        </p>
      ) : (
        <div>
          {messages.map(m => (
            <MessageCard key={m.messageId} message={m} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm --prefix frontend run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/MessageList.tsx
git commit -m "feat: MessageList component"
```

---

## Task 12: App component

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx` (ensure index.css is imported)

- [ ] **Step 1: Replace `frontend/src/App.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react'
import { fetchProject, fetchSubscriptions, fetchMessages } from './api'
import type { PubSubMessage } from './types'
import SubscriptionSelector from './components/SubscriptionSelector'
import MessageList from './components/MessageList'

const MAX_MESSAGES = 200
const POLL_INTERVAL = 2000

export default function App() {
  const [project, setProject] = useState('')
  const [subscriptions, setSubscriptions] = useState<string[]>([])
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null)
  const [messages, setMessages] = useState<PubSubMessage[]>([])
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seenIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchProject()
      .then(({ project }) => setProject(project))
      .catch(err => setError(err.message))

    fetchSubscriptions()
      .then(({ subscriptions }) => setSubscriptions(subscriptions))
      .catch(err => setError(err.message))
  }, [])

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
  }

  function startPolling() {
    if (!selectedSubscription) return
    setError(null)
    setIsPolling(true)
    intervalRef.current = setInterval(async () => {
      try {
        const { messages: incoming } = await fetchMessages(selectedSubscription)
        const unique = incoming.filter(m => !seenIds.current.has(m.messageId))
        unique.forEach(m => seenIds.current.add(m.messageId))
        if (unique.length > 0) {
          setMessages(prev => [...unique, ...prev].slice(0, MAX_MESSAGES))
        }
      } catch (err: any) {
        setError(err.message)
        stopPolling()
      }
    }, POLL_INTERVAL)
  }

  function handleSelectSubscription(sub: string) {
    stopPolling()
    setMessages([])
    seenIds.current.clear()
    setSelectedSubscription(sub)
  }

  function handleClear() {
    setMessages([])
    seenIds.current.clear()
  }

  const loadError = !project && !subscriptions.length && !!error

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">PubSub Viewer</h1>
        {project && (
          <p className="text-sm text-gray-400 mt-1">Project: {project}</p>
        )}
      </header>

      {error && (
        <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-300 hover:text-red-100 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      <SubscriptionSelector
        subscriptions={subscriptions}
        selected={selectedSubscription}
        isPolling={isPolling}
        disabled={loadError}
        onSelect={handleSelectSubscription}
        onStart={startPolling}
        onStop={stopPolling}
      />

      <MessageList messages={messages} onClear={handleClear} />
    </div>
  )
}
```

- [ ] **Step 2: Delete the scaffolded `frontend/src/App.css`**

The Vite template generates `App.css` which is no longer imported or needed:
```bash
del frontend\src\App.css
```

- [ ] **Step 3: Verify `frontend/src/main.tsx` imports `index.css`**

Open `frontend/src/main.tsx`. It should contain:
```typescript
import './index.css'
```

If it doesn't, add that import at the top of the file (Vite's default template includes it, but confirm).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm --prefix frontend run build
```

Expected: no errors. A `frontend/dist/` directory is created.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx
git rm frontend/src/App.css
git commit -m "feat: App component with polling state and error handling"
```

---

## Task 13: Full integration smoke test

**Goal:** Run both processes together and verify end-to-end behavior against a real Pub/Sub subscription.

- [ ] **Step 1: Start both processes**

From the repo root:
```bash
npm run dev
```

Expected: two processes start — backend logs `Backend running on http://localhost:3001`, Vite logs `Local: http://localhost:5173`.

- [ ] **Step 2: Open the app**

Navigate to `http://localhost:5173` in a browser.

Expected:
- Page title "PubSub Viewer" appears
- Project ID is shown below the title
- Subscription dropdown is populated

- [ ] **Step 3: Run through smoke test checklist**

Work through each item from the spec:

- [ ] Select a subscription from the dropdown and click **Start** → "● Polling" indicator appears, messages arrive as cards within a few seconds
- [ ] Each card shows: message ID, timestamp, decoded data (JSON pretty-printed if applicable), attributes table (or hidden if empty)
- [ ] Click **Stop** → polling indicator disappears, no new network requests
- [ ] Switch to a different subscription → message list clears, polling stops
- [ ] Click **Clear** → message list empties
- [ ] Verify duplicates don't appear (same message ID should not create two cards even after multiple poll cycles)

- [ ] **Step 4: Test error cases**

To test the gcloud-not-found error: temporarily rename `gcloud` or disconnect from auth (`gcloud auth revoke`) and reload. The error banner should appear and the selector should be disabled. Re-auth and reload to restore.

- [ ] **Step 5: Final commit**

```bash
git add docs/
git commit -m "docs: add spec and implementation plan"
```
