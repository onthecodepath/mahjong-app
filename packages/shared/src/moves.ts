import type { Tile } from "./tiles";
import type { Seat } from "./deal";
import type { GameState, ClaimIntent } from "./game";
import { tilesEqual, isBonus } from "./tiles";

export type MoveError =
  | { code: "wrong_phase"; expected: "draw" | "act" | "claim" }
  | { code: "not_your_turn" }
  | { code: "tile_not_in_hand" }
  | { code: "wall_empty" }
  | { code: "discarder_cannot_claim" }
  | { code: "already_declared" };

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

  // The tile is NOT added to the discard pile yet. It lives in the claim
  // phase until the window resolves: if any seat claims it (pong/kong/chow/hu)
  // it goes to their meld; if all 3 non-discarders pass it goes to discards.
  return {
    ok: true,
    state: {
      ...state,
      hands: newHands,
      phase: { kind: "claim", discardSeat: seat, tile, intents: {} },
    },
  };
}

export function passClaim(state: GameState, seat: Seat): MoveResult<GameState> {
  if (state.phase.kind !== "claim") {
    return { ok: false, error: { code: "wrong_phase", expected: "claim" } };
  }
  if (state.phase.discardSeat === seat) {
    return { ok: false, error: { code: "discarder_cannot_claim" } };
  }
  if (state.phase.intents[seat] !== undefined) {
    return { ok: false, error: { code: "already_declared" } };
  }

  const newIntents: Partial<Record<Seat, ClaimIntent>> = {
    ...state.phase.intents,
    [seat]: { kind: "pass" },
  };

  // Window still open: other seats haven't responded yet.
  if (Object.keys(newIntents).length < 3) {
    return {
      ok: true,
      state: { ...state, phase: { ...state.phase, intents: newIntents } },
    };
  }

  // All 3 non-discarders submitted. Step 2 only accepts "pass" intents, so
  // the discard commits to the pile and play advances to the next seat.
  // Step 3 will add priority resolution for pong/kong/chow/hu.
  const discardSeat = state.phase.discardSeat;
  const tile = state.phase.tile;
  const newDiscards = [...state.discards] as GameState["discards"];
  newDiscards[discardSeat] = [...state.discards[discardSeat], tile];

  return {
    ok: true,
    state: {
      ...state,
      discards: newDiscards,
      phase: { kind: "draw", seat: NEXT_SEAT[discardSeat] },
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
