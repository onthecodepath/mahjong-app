import type { Tile } from "./tiles";
import type { Seat } from "./deal";

// A meld is a set of tiles that's been exposed (face-up in front of the player)
// or declared as a concealed kong. Once melded, those tiles are committed: they
// can't return to the hidden hand.
export type Meld =
  | { kind: "pong"; tile: Tile; claimedFrom: Seat }
  | { kind: "kong"; tile: Tile; source: KongSource }
  | { kind: "chow"; tiles: [Tile, Tile, Tile]; claimedFrom: Seat; claimedTile: Tile };

// How a kong came to be:
// - claimed:   discarded by another seat, claimant grabbed the 4th
// - concealed: claimant drew the 4th themselves, keeps it hidden (4 face-down)
// - added:     claimant already had an exposed pong, drew or claimed the 4th
export type KongSource =
  | { kind: "claimed";   from: Seat }
  | { kind: "concealed" }
  | { kind: "added";     from: Seat };

// What a non-discarder may declare during a claim window.
// (For now, only "pass" is wired up. The pong/kong/chow/hu variants are
// declared in the type so we don't reshape it later, but their move
// functions are added in step 3.)
export type ClaimIntent =
  | { kind: "pass" }
  | { kind: "hu" }
  | { kind: "kong" }
  | { kind: "pong" }
  | { kind: "chow"; using: [Tile, Tile] };  // which 2 tiles from hand complete the sequence

// The phase the game is in. Each variant carries the data relevant to that
// phase, so impossible states (e.g. an "act" phase with no active seat) are
// not representable.
export type Phase =
  | { kind: "draw"; seat: Seat }                                  // active player must draw from wall
  | { kind: "act"; seat: Seat }                                   // active player has 14 tiles, must discard,
                                                                  // declare concealed kong, added kong, or hu
  | { kind: "claim"; discardSeat: Seat; tile: Tile; intents: Partial<Record<Seat, ClaimIntent>> };
  // claim: a tile was just discarded; other seats may pong/kong/chow/hu or pass.
  // The discarded tile lives in `tile` (in limbo) until the window resolves.

export type GameState = {
  hands:    [Tile[], Tile[], Tile[], Tile[]];
  bonus:    [Tile[], Tile[], Tile[], Tile[]];
  discards: [Tile[], Tile[], Tile[], Tile[]];
  melds:    [Meld[], Meld[], Meld[], Meld[]];  // exposed/concealed melds
  wall:     Tile[];
  phase:    Phase;
};
