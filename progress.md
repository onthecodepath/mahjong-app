# Progress

Granular tracker for what's done and what's next within each phase. The high-level phase list lives in [README.md](README.md), the architecture and rationale in [mahjong-plan.md](mahjong-plan.md).

## Phase 1: Shared Rules Engine

Location: `packages/shared/`

### Done
- [x] Tile types (suited, wind, dragon, flower, season) with `tileId`, `tilesEqual`, `isBonus`
- [x] Wall builder (144 tiles) + Fisher-Yates shuffle with seedable rng
- [x] Dealing (two-phase: deal hands first, then replacement ceremony for bonus tiles)
- [x] Game state shape with discriminated-union `Phase` (`draw` | `act` | `claim`)
- [x] `Meld` and `KongSource` types, `melds` field on `GameState`
- [x] `ClaimIntent` type (pass/hu/kong/pong/chow shapes declared, only pass wired up)
- [x] Discard move (transitions to claim phase with tile in limbo)
- [x] Draw from wall (with bonus replacement from back of wall)
- [x] `passClaim` move (records pass intent, resolves when all 3 non-discarders submit)
- [x] Win detection for standard 4 sets + 1 pair (chicken hand)

### Next
- [ ] Claim moves: `claimPong`, `claimKong`, `claimChow` (declare intent for non-pass)
- [ ] Priority resolution when claim intents conflict (hu > kong/pong > chow)
- [ ] `resolveClaimWindow` for server-initiated timeout (treats missing intents as pass)
- [ ] Concealed kong (self-drawn act-phase move)
- [ ] Added kong (act-phase move, promoting an exposed pong)
- [ ] Hu (win declaration, both self-drawn and claimed)
- [ ] Extend `isWinningHand` to consider exposed melds
- [ ] Wall-empty game end (currently surfaces as a `wall_empty` error)

### Later (points version)
- [ ] Fan scoring engine
- [ ] Special hands (thirteen orphans, etc.)
- [ ] Minimum 3-fan rule enforcement on hu

## Phase 2: Minimal WebSocket Server
Not started.

## Phase 3: Postgres + Drizzle
Not started.

## Phase 4: Auth
Not started.

## Phase 5: Thin Web Client
Not started.

## Phase 6: Lobby & Matchmaking
Not started.

## Phase 7: Deploy
Not started.

## Phase 8: iOS Client
Not started.

## Phase 9: Push Notifications
Not started.

## Phase 10: Android, Polish, Scale
Not started.
