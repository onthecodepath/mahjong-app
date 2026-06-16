import type { Tile } from "./tiles";
import type { Seat } from "./deal";

// The phase the game is in. Each variant carries the data relevant to that
// phase, so impossible states (e.g. an "act" phase with no active seat) are
// not representable.
export type Phase =
  | { kind: "draw"; seat: Seat }  // active player must draw from wall
  | { kind: "act"; seat: Seat };  // active player has 14 tiles, must discard,
                                  // declare concealed kong, added kong, or hu
  // Note: a "claim" variant will be added when we wire up pong/kong/chow.
  // For now, after a discard we transition directly to the next seat's draw.

export type GameState = {
  hands:    [Tile[], Tile[], Tile[], Tile[]];
  bonus:    [Tile[], Tile[], Tile[], Tile[]];
  discards: [Tile[], Tile[], Tile[], Tile[]];
  wall:     Tile[];
  phase:    Phase;
};
