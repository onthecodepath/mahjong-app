# Mahjong App

A cross-platform multiplayer Hong Kong Mahjong game with iOS, Android, and web clients backed by a single authoritative server. Supports both real-time and async (hours/days per turn) play.

## Repo Structure

```
mahjong-app/
├── apps/
│   ├── ios/         # Swift / SwiftUI (Phase 8)
│   └── web/         # React + TypeScript (Phase 5)
├── server/          # Node.js + Fastify + WebSockets (Phase 2)
└── packages/
    └── shared/      # Rules engine, types, constants
```

## Stack

- **Shared logic** — TypeScript (rules engine imported by server + web)
- **Server** — Fastify + `ws` WebSockets, deployed via Docker on Railway
- **Database** — PostgreSQL via Neon, queried with Drizzle ORM
- **Auth** — Clerk or Supabase Auth (provider-agnostic user model)
- **Web** — React + TypeScript, deployed on Vercel
- **iOS** — Swift / SwiftUI
- **Push notifications** — APNs (iOS), FCM (Android)

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm

### Install dependencies
```
pnpm install
```

### Run tests
```
pnpm test
```

## Build Order

The app is being built in phases:

- [x] **Phase 1** — Shared rules engine (tile types, wall, dealing)
- [ ] **Phase 2** — Minimal WebSocket server
- [ ] **Phase 3** — Postgres + Drizzle
- [ ] **Phase 4** — Auth
- [ ] **Phase 5** — Thin web client
- [ ] **Phase 6** — Lobby & matchmaking
- [ ] **Phase 7** — Deploy
- [ ] **Phase 8** — iOS client
- [ ] **Phase 9** — Push notifications
- [ ] **Phase 10** — Android, polish, scale

## Rules

Hong Kong Mahjong. Minimum point play (3 fan) not enforced in initial version.
