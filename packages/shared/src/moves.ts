import type { Tile } from "./tiles";
import type { Seat } from "./deal";
import type { GameState } from "./game";
import { tilesEqual, isBonus } from "./tiles";

export type MoveError =
  | { code: "wrong_phase"; expected: "draw" | "act" }
  | { code: "not_your_turn" }
  | { code: "tile_not_in_hand" }
  | { code: "wall_empty" };

export type MoveResult<T> =
  | { ok: true;  state: T }
  | { ok: false; error: MoveError };

const NEXT_SEAT: Record<Seat, Seat> = { 0: 1, 1: 2, 2: 3, 3: 0 };

export function discard(
  state: GameState,
  seat: Seat,
  tile: Tile,
): MoveResult<GameState> {
  if (state.phase.kind !== "act") {
    return { ok: false, error: { code: "wrong_phase", expected: "act" } };
  }
  if (state.phase.seat !== seat) {
    return { ok: false, error: { code: "not_your_turn" } };
  }

  const handIndex = state.hands[seat].findIndex((t) => tilesEqual(t, tile));
  if (handIndex === -1) {
    return { ok: false, error: { code: "tile_not_in_hand" } };
  }

  const newHand = [...state.hands[seat]];
  newHand.splice(handIndex, 1);

  const newHands = [...state.hands] as GameState["hands"];
  newHands[seat] = newHand;

  const newDiscards = [...state.discards] as GameState["discards"];
  newDiscards[seat] = [...state.discards[seat], tile];

  return {
    ok: true,
    state: {
      ...state,
      hands: newHands,
      discards: newDiscards,
      // TODO: transition to "claim" phase when meld claims are added.
      phase: { kind: "draw", seat: NEXT_SEAT[seat] },
    },
  };
}

export function drawFromWall(
  state: GameState,
  seat: Seat,
): MoveResult<GameState> {
  if (state.phase.kind !== "draw") {
    return { ok: false, error: { code: "wrong_phase", expected: "draw" } };
  }
  if (state.phase.seat !== seat) {
    return { ok: false, error: { code: "not_your_turn" } };
  }
  if (state.wall.length === 0) {
    return { ok: false, error: { code: "wall_empty" } };
  }

  const newWall = [...state.wall];
  const collectedBonus: Tile[] = [];
  let drawn: Tile = newWall.shift()!;

  // If we drew a bonus tile, set it aside and draw a replacement from the
  // BACK of the wall (dead wall convention). Repeat until non-bonus.
  while (isBonus(drawn)) {
    collectedBonus.push(drawn);
    if (newWall.length === 0) {
      return { ok: false, error: { code: "wall_empty" } };
    }
    drawn = newWall.pop()!;
  }

  const newHands = [...state.hands] as GameState["hands"];
  newHands[seat] = [...state.hands[seat], drawn];

  const newBonusAll = [...state.bonus] as GameState["bonus"];
  newBonusAll[seat] = [...state.bonus[seat], ...collectedBonus];

  return {
    ok: true,
    state: {
      ...state,
      wall: newWall,
      hands: newHands,
      bonus: newBonusAll,
      phase: { kind: "act", seat },
    },
  };
}
