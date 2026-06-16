import { describe, it, expect } from "vitest";
import { isWinningHand } from "./win";
import type { Tile, Suit } from "./tiles";

const s = (suit: Suit, value: 1|2|3|4|5|6|7|8|9): Tile => ({ kind: "suited", suit, value });
const w = (wind: "east"|"south"|"west"|"north"): Tile => ({ kind: "wind", wind });
const d = (dragon: "red"|"green"|"white"): Tile => ({ kind: "dragon", dragon });
const x = (t: Tile, n: number): Tile[] => Array.from({ length: n }, () => ({ ...t }));

describe("isWinningHand", () => {
  it("rejects hands that are not 14 tiles", () => {
    expect(isWinningHand([])).toBe(false);
    expect(isWinningHand(x(s("circles", 1), 13))).toBe(false);
  });

  it("accepts 4 pungs + pair (one suit)", () => {
    const hand = [
      ...x(s("circles", 1), 3),
      ...x(s("circles", 2), 3),
      ...x(s("circles", 3), 3),
      ...x(s("circles", 4), 3),
      ...x(s("circles", 5), 2),
    ];
    expect(isWinningHand(hand)).toBe(true);
  });

  it("accepts 4 chows + pair", () => {
    const hand = [
      ...x(s("circles", 1), 4),
      ...x(s("circles", 2), 4),
      ...x(s("circles", 3), 4),
      ...x(s("circles", 4), 2),
    ];
    expect(isWinningHand(hand)).toBe(true);
  });

  it("accepts mixed pungs and chows across suits", () => {
    const hand: Tile[] = [
      s("circles", 1), s("circles", 2), s("circles", 3),
      ...x(s("circles", 5), 3),
      s("bamboo", 4), s("bamboo", 5), s("bamboo", 6),
      ...x(d("red"), 3),
      ...x(w("east"), 2),
    ];
    expect(isWinningHand(hand)).toBe(true);
  });

  it("accepts an honor pair", () => {
    const hand: Tile[] = [
      s("circles", 1), s("circles", 2), s("circles", 3),
      s("circles", 4), s("circles", 5), s("circles", 6),
      s("bamboo", 1), s("bamboo", 2), s("bamboo", 3),
      s("characters", 7), s("characters", 8), s("characters", 9),
      ...x(w("east"), 2),
    ];
    expect(isWinningHand(hand)).toBe(true);
  });

  it("rejects a random scatter of tiles", () => {
    const hand: Tile[] = [
      s("circles", 1), s("circles", 3), s("circles", 5), s("circles", 7), s("circles", 9),
      s("bamboo", 2), s("bamboo", 4), s("bamboo", 6), s("bamboo", 8),
      s("characters", 1), s("characters", 4),
      w("east"), w("south"), d("red"),
    ];
    expect(isWinningHand(hand)).toBe(false);
  });

  it("rejects 7-of-a-kind doublet (pung+pair leaves 2 extras)", () => {
    const hand = [
      ...x(s("circles", 1), 7),
      ...x(s("circles", 2), 7),
    ];
    expect(isWinningHand(hand)).toBe(false);
  });

  it("rejects undeclared 4-of-a-kind (kong must be declared first)", () => {
    const hand = [
      ...x(s("circles", 1), 4),
      ...x(s("circles", 2), 3),
      ...x(s("circles", 3), 3),
      ...x(s("circles", 4), 2),
    ];
    expect(isWinningHand(hand)).toBe(false);
  });

  it("rejects bonus tiles in hand", () => {
    const hand: Tile[] = [
      ...x(s("circles", 1), 3),
      ...x(s("circles", 2), 3),
      ...x(s("circles", 3), 3),
      ...x(s("circles", 4), 3),
      { kind: "flower", flower: 1 },
      s("circles", 5),
    ];
    expect(isWinningHand(hand)).toBe(false);
  });
});
