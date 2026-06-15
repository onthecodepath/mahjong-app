# Mahjong App — Architecture & Build Plan

## Overview

A cross-platform multiplayer mahjong game with iOS, Android, and web clients backed by a single authoritative server. Supports both real-time and async (hours/days per turn) play.

---

## Repo Structure

One monorepo. All platforms live together so shared game logic can be imported by both the server and web client without duplication.

```
mahjong/
├── apps/
│   ├── ios/              # Swift / SwiftUI
│   ├── android/          # Kotlin (future)
│   └── web/              # React + TypeScript
├── server/               # Node.js + Fastify + ws
└── packages/
    └── shared/           # Rules engine, types, constants (TypeScript)
```

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript (server + web + shared) | One language across the stack; shared rules engine |
| Server framework | Fastify | Faster and better TS support than Express |
| WebSockets | `ws` (Node) | Raw, lightweight, no vendor lock-in |
| Database | PostgreSQL via Neon | Managed Postgres, generous free tier, portable |
| ORM / query builder | Drizzle | Thin, close to SQL, great TS inference, talks to Postgres via standard wire protocol (connection string, not vendor SDK) |
| Auth | Managed provider (Clerk or Supabase Auth) + own `users` table | Provider handles login/tokens; your DB is keyed by provider user ID so you can swap providers later |
| Web hosting | Vercel | Free tier, trivially portable |
| Server hosting | Railway | Great DX for iteration; Dockerfile means you can move to Fly.io or Render later |
| Containerization | Docker | All server deploys via Dockerfile — portable across any host |
| iOS | Swift / SwiftUI | Native |
| Android | Kotlin (future phase) | Native |
| Push notifications | APNs (iOS), FCM (Android) | Required for async "your turn" notifications |

---

## Key Architectural Decisions

### The server is authoritative
All move validation runs on the server using the shared rules engine. Clients never decide whether a move is legal — they send intent, the server validates and broadcasts the result. This prevents cheating and keeps all clients in sync.

### Database is the source of truth for game state
Because games can last hours or days, game state lives in Postgres — not in server memory. Memory is wiped on every deploy. When a player returns after two days, the server reads current state from the DB and resumes.

### WebSockets are a live sync channel, not the source of truth
WebSockets push state to players who are currently online. When a player is offline, they get an APNs/FCM push notification ("it's your turn"). When they open the app, the client fetches current game state from the DB via HTTP, then upgrades to a WebSocket for live updates.

### In-memory state first, Redis later
Active game sessions can be cached in server memory for performance. Add Redis only when you need multiple server instances (for zero-downtime deploys or horizontal scale). Structure game state access behind a small interface so the swap is a contained change, not a rewrite.

### Auth is isolated from your data model
Your `users` table is keyed by the auth provider's user ID (`provider_user_id`). All your app's data (games, moves, scores) references your internal user ID. If you switch auth providers, only the login flow changes — your entire data model stays untouched.

### Drizzle over Postgres wire protocol
Drizzle connects via a plain connection string (`postgres://user:pass@host:5432/db`). Point it at local Postgres in dev, Neon in production. Changing hosts = changing one environment variable. No vendor SDK calls in your data layer.

---

## Database Schema (Initial)

```sql
-- Users (keyed by auth provider ID)
users
  id              uuid primary key
  provider_user_id  text unique not null   -- from Clerk / Supabase Auth
  display_name    text not null
  created_at      timestamptz default now()

-- Games
games
  id              uuid primary key
  status          text not null            -- 'waiting' | 'active' | 'finished'
  state           jsonb not null           -- serialized game state (tiles, hands, wall, discards)
  current_turn    uuid references users(id)
  created_at      timestamptz default now()
  updated_at      timestamptz default now()

-- Game participants
game_players
  game_id         uuid references games(id)
  user_id         uuid references users(id)
  seat            int not null             -- 0-3 (East/South/West/North)
  primary key (game_id, user_id)

-- Move history (audit trail, replay, debugging)
moves
  id              uuid primary key
  game_id         uuid references games(id)
  user_id         uuid references users(id)
  move_type       text not null            -- 'draw' | 'discard' | 'pong' | 'kong' | 'chow' | 'win'
  payload         jsonb not null           -- move details
  created_at      timestamptz default now()
```

---

## WebSocket Message Protocol

All messages are JSON with a `type` field.

### Client → Server
```json
{ "type": "join_game",   "gameId": "..." }
{ "type": "make_move",   "gameId": "...", "move": { "type": "discard", "tile": "..." } }
{ "type": "ping" }
```

### Server → Client
```json
{ "type": "game_state",  "state": { ... } }        // full state on connect / rejoin
{ "type": "move_made",   "move": { ... }, "state": { ... } }  // after each valid move
{ "type": "your_turn",   "timeoutAt": "..." }
{ "type": "error",       "message": "..." }
{ "type": "pong" }
```

### Connection flow
1. Client opens WebSocket, sends auth token in the initial HTTP upgrade request header.
2. Server verifies token before the connection is accepted.
3. Server sends `game_state` with full current state (player rejoining after hours gets caught up immediately).
4. Game proceeds via `make_move` / `move_made` exchanges.
5. If a player disconnects mid-game, their slot stays reserved. On reconnect, step 3 replays.

---

## Async / Long-Turn Play

For games where players have hours or days to move:

- Game state is always persisted to Postgres after every move.
- When it becomes a player's turn and they are **offline**, the server sends a push notification (APNs for iOS, FCM for Android).
- When the player opens the app, the client fetches the latest `game_state` via HTTP, then optionally upgrades to WebSocket for live play.
- There is no in-memory timeout or heartbeat required for offline players — the DB holds the state indefinitely.

---

## Scaling Path

| Stage | Setup |
|---|---|
| Dev / testing | Local Postgres, server runs locally |
| Friends & early users | Single Railway instance + Neon free tier |
| Always-on needed | Paid Railway instance (~$5–20/mo), Neon free or starter |
| Zero-downtime deploys | Add a second instance + Redis pub/sub for cross-instance WebSocket messaging |
| Significant scale | Migrate to Fly.io or own VPS; Redis Cluster; read replicas on Postgres |

---

## Build Order

Build in this sequence. Each phase produces something testable before moving on.

### Phase 1 — Shared Rules Engine
**Location:** `packages/shared`

Pure TypeScript. No server, no database, no UI. Just the game logic.

- Tile definitions and types
- Dealing a hand
- Wall / draw pile management
- Move validation (discard, pong, kong, chow, win declaration)
- Win detection
- Scoring

Write unit tests here. This is the riskiest domain logic (mahjong rules have edge cases) and the foundation everything else trusts. Both the server and web client import this package directly.

---

### Phase 2 — Minimal WebSocket Server
**Location:** `server/`

Fastify + `ws`. No database, no auth. Hardcoded game, hardcoded players.

Goals:
- WebSocket connection lifecycle (connect, message, disconnect, reconnect)
- `join_game` → `game_state` flow
- `make_move` → validate via shared engine → broadcast `move_made`
- Basic error handling (`error` message back to client)

This proves the message protocol works before adding any other moving parts.

---

### Phase 3 — Postgres + Drizzle
**Location:** `server/db/`

Add the database layer. Game state moves from memory to Postgres.

- Define schema (users, games, game_players, moves)
- Drizzle migrations
- Read/write game state on every move
- Games now survive server restarts
- Local Postgres in dev (Docker Compose is handy here)

---

### Phase 4 — Auth
Add a managed auth provider. Protect the WebSocket handshake.

- Client gets a token on login
- Token sent as a header on the WebSocket upgrade request
- Server verifies token before accepting the connection
- `users` table keyed by `provider_user_id`
- All game data references internal user ID

---

### Phase 5 — Thin Web Client
**Location:** `apps/web/`

React + TypeScript. Deliberately ugly — this is a dev tool and end-to-end test harness, not a polished product.

- Connect to WebSocket, authenticate
- Render a hand and the discard pile
- Clickable tiles to make moves
- Display game state updates in real time

This becomes your primary development environment for everything that follows. Iterating here is 10x faster than on a native app.

---

### Phase 6 — Lobby & Matchmaking
Replace hardcoded game/players with real flows:

- Create a game
- Invite players or join open games
- Start game when all seats are filled
- Handle a player leaving / disconnecting mid-game

---

### Phase 7 — Deploy (do this before iOS, not after)
Get it on the internet while it's still small and debuggable.

- Dockerize the server
- Deploy to Railway
- Point Drizzle at Neon
- Deploy web client to Vercel
- Play a real game end-to-end with a friend over the internet

Deploying early surfaces env var issues, CORS, WebSocket-over-TLS, and connection string problems while the project is small.

---

### Phase 8 — iOS Client
**Location:** `apps/ios/`

Swift / SwiftUI. Now that the server protocol is stable and proven via the web client, build the native app against the same backend.

- URLSessionWebSocketTask for WebSocket
- Auth token flow (Apple Sign-In or other)
- Game board UI
- Move input

---

### Phase 9 — Push Notifications
Make async play actually work.

- Server sends APNs notification when it becomes a player's turn and they are offline
- Notification opens the app and deep-links into the correct game
- APNs certificate / token setup (its own adventure — give it a dedicated session)

---

### Phase 10 — Android, Polish, Scale
- Android client (Kotlin)
- FCM push notifications for Android
- Redis pub/sub when you add a second server instance
- Performance tuning, UI polish
- Game history, stats, leaderboards

---

## Environment Variables

```
# Server
DATABASE_URL=postgres://user:pass@host:5432/mahjong
AUTH_PROVIDER_SECRET=...
PORT=3000

# Web client
NEXT_PUBLIC_WS_URL=wss://your-server.railway.app
NEXT_PUBLIC_AUTH_PUBLISHABLE_KEY=...
```

---

## Notes & Reminders

- **Never trust the client.** All move validation runs server-side via the shared engine.
- **Write the rules engine first.** Edge cases in mahjong scoring are numerous; find them in unit tests, not in production.
- **Deploy early.** Don't wait until Phase 8 to put it on the internet.
- **Keep auth isolated.** Your data model references `users.id`, never `provider_user_id`, after the `users` row is created.
- **Add Redis only when you have two instances.** Not before.
- **The Dockerfile is your portability guarantee.** Any host that runs Docker can run your server.
