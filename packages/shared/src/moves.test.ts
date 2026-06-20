import { describe, it, expect } from "vitest";
import { discard, drawFromWall, passClaim } from "./moves";
import type { GameState } from "./game";
import type { Tile } from "./tiles";

function makeState(overrides: Partial<GameState> = {}): GameState {
  const dummy: Tile = { kind: "suited", suit: "circles", value: 5 };
  const targetTile: Tile = { kind: "wind", wind: "east" };
  const eastHand: Tile[] = [targetTile, ...Array.from({ length: 13 }, () => ({ ...dummy }))];
  return {
    hands:    [eastHand, [], [], []],
    bonus:    [[], [], [], []],
    discards: [[], [], [], []],
    melds:    [[], [], [], []],
    wall:     [],
    phase:    { kind: "act", seat: 0 },
    ...overrides,
  };
}

describe("discard", () => {
  const targetTile: Tile = { kind: "wind", wind: "east" };

  it("removes the tile from hand but does not commit it to discards yet", () => {
    const state = makeState();
    const result = discard(state, 0, targetTile);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.hands[0]).toHaveLength(13);
    // The tile is in the claim phase, not in the discard pile.
    expect(result.state.discards[0]).toEqual([]);
  });

  it("transitions to the claim phase with the discarded tile in limbo", () => {
    const result = discard(makeState(), 0, targetTile);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.phase).toEqual({
      kind: "claim",
      discardSeat: 0,
      tile: targetTile,
      intents: {},
    });
  });

  it("rejects when the phase is not 'act'", () => {
    const state = makeState({ phase: { kind: "draw", seat: 0 } });
    const result = discard(state, 0, targetTile);
    expect(result).toEqual({ ok: false, error: { code: "wrong_phase", expected: "act" } });
  });

  it("rejects when a non-active seat tries to discard", () => {
    const state = makeState({ phase: { kind: "act", seat: 0 } });
    const result = discard(state, 1, targetTile);
    expect(result).toEqual({ ok: false, error: { code: "not_your_turn" } });
  });

  it("rejects when the tile is not in the player's hand", () => {
    const state = makeState();
    const missingTile: Tile = { kind: "dragon", dragon: "red" };
    const result = discard(state, 0, missingTile);
    expect(result).toEqual({ ok: false, error: { code: "tile_not_in_hand" } });
  });

  it("does not mutate the original state", () => {
    const state = makeState();
    const beforeHand = [...state.hands[0]];
    const beforeDiscards = [...state.discards[0]];
    discard(state, 0, targetTile);
    expect(state.hands[0]).toEqual(beforeHand);
    expect(state.discards[0]).toEqual(beforeDiscards);
    expect(state.phase).toEqual({ kind: "act", seat: 0 });
  });
});

describe("drawFromWall", () => {
  function drawState(overrides: Partial<GameState> = {}): GameState {
    const dummy: Tile = { kind: "suited", suit: "circles", value: 5 };
    const eastHand = Array.from({ length: 13 }, () => ({ ...dummy }));
    return {
      hands:    [eastHand, [], [], []],
      bonus:    [[], [], [], []],
      discards: [[], [], [], []],
      melds:    [[], [], [], []],
      wall:     [{ kind: "wind", wind: "east" } as Tile],
      phase:    { kind: "draw", seat: 0 },
      ...overrides,
    };
  }

  it("adds the next wall tile to the player's hand and transitions to act", () => {
    const expectedTile: Tile = { kind: "wind", wind: "east" };
    const result = drawFromWall(drawState(), 0);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.hands[0]).toHaveLength(14);
    expect(result.state.hands[0][13]).toEqual(expectedTile);
    expect(result.state.wall).toHaveLength(0);
    expect(result.state.phase).toEqual({ kind: "act", seat: 0 });
  });

  it("replaces bonus tiles by drawing from the back of the wall", () => {
    const filler: Tile = { kind: "suited", suit: "circles", value: 5 };
    const flower: Tile = { kind: "flower", flower: 1 };
    const replacement: Tile = { kind: "dragon", dragon: "red" };
    const wall: Tile[] = [flower, filler, filler, replacement];

    const result = drawFromWall(drawState({ wall }), 0);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.bonus[0]).toEqual([flower]);
    expect(result.state.hands[0][13]).toEqual(replacement);
    expect(result.state.wall).toEqual([filler, filler]);
  });

  it("handles multiple bonus draws in a row", () => {
    const filler: Tile = { kind: "suited", suit: "circles", value: 5 };
    const flower1: Tile = { kind: "flower", flower: 1 };
    const flower2: Tile = { kind: "flower", flower: 2 };
    const replacement: Tile = { kind: "dragon", dragon: "red" };
    // Front: flower1 (drawn). Back replacement: flower2 (also bonus).
    // Next back replacement: replacement (non-bonus, kept).
    const wall: Tile[] = [flower1, filler, replacement, flower2];

    const result = drawFromWall(drawState({ wall }), 0);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.bonus[0]).toEqual([flower1, flower2]);
    expect(result.state.hands[0][13]).toEqual(replacement);
    expect(result.state.wall).toEqual([filler]);
  });

  it("rejects when the phase is not 'draw'", () => {
    const state = drawState({ phase: { kind: "act", seat: 0 } });
    const result = drawFromWall(state, 0);
    expect(result).toEqual({ ok: false, error: { code: "wrong_phase", expected: "draw" } });
  });

  it("rejects when a non-active seat tries to draw", () => {
    const result = drawFromWall(drawState(), 1);
    expect(result).toEqual({ ok: false, error: { code: "not_your_turn" } });
  });

  it("rejects when the wall is empty", () => {
    const result = drawFromWall(drawState({ wall: [] }), 0);
    expect(result).toEqual({ ok: false, error: { code: "wall_empty" } });
  });

  it("does not mutate the original state", () => {
    const state = drawState();
    const beforeWall = [...state.wall];
    const beforeHand = [...state.hands[0]];
    drawFromWall(state, 0);
    expect(state.wall).toEqual(beforeWall);
    expect(state.hands[0]).toEqual(beforeHand);
  });
});

describe("passClaim", () => {
  const limboTile: Tile = { kind: "wind", wind: "east" };

  function claimState(overrides: Partial<GameState> = {}): GameState {
    const dummy: Tile = { kind: "suited", suit: "circles", value: 5 };
    return {
      hands:    [Array.from({ length: 13 }, () => ({ ...dummy })), [], [], []],
      bonus:    [[], [], [], []],
      discards: [[], [], [], []],
      melds:    [[], [], [], []],
      wall:     [],
      phase:    { kind: "claim", discardSeat: 0, tile: limboTile, intents: {} },
      ...overrides,
    };
  }

  it("records a pass intent for the claiming seat", () => {
    const result = passClaim(claimState(), 1);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.phase).toEqual({
      kind: "claim",
      discardSeat: 0,
      tile: limboTile,
      intents: { 1: { kind: "pass" } },
    });
    // Tile is not yet in discards
    expect(result.state.discards[0]).toEqual([]);
  });

  it("commits the tile and advances to next draw after all 3 non-discarders pass", () => {
    let state = claimState();
    for (const seat of [1, 2, 3] as const) {
      const r = passClaim(state, seat);
      if (!r.ok) throw new Error(`pass ${seat} failed`);
      state = r.state;
    }
    expect(state.discards[0]).toEqual([limboTile]);
    expect(state.phase).toEqual({ kind: "draw", seat: 1 });
  });

  it("rejects when the phase is not 'claim'", () => {
    const state = claimState({ phase: { kind: "draw", seat: 0 } });
    const result = passClaim(state, 1);
    expect(result).toEqual({ ok: false, error: { code: "wrong_phase", expected: "claim" } });
  });

  it("rejects when the discarder tries to pass on their own discard", () => {
    const result = passClaim(claimState(), 0);
    expect(result).toEqual({ ok: false, error: { code: "discarder_cannot_claim" } });
  });

  it("rejects when the seat has already declared an intent", () => {
    const first = passClaim(claimState(), 1);
    if (!first.ok) throw new Error("expected ok");
    const second = passClaim(first.state, 1);
    expect(second).toEqual({ ok: false, error: { code: "already_declared" } });
  });

  it("does not mutate the original state", () => {
    const state = claimState();
    const beforePhase = JSON.parse(JSON.stringify(state.phase));
    passClaim(state, 1);
    expect(state.phase).toEqual(beforePhase);
  });
});
