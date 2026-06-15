import { describe, it, expect } from "vitest";
import { buildWall, shuffle } from "./wall";
import { dealHands } from "./deal";
import { isBonus, tileId, type Tile } from "./tiles";

describe("dealHands", () => {
  it("gives the dealer 14 tiles and others 13", () => {
    const { hands } = dealHands(shuffle(buildWall()));
    expect(hands[0]).toHaveLength(14);
    expect(hands[1]).toHaveLength(13);
    expect(hands[2]).toHaveLength(13);
    expect(hands[3]).toHaveLength(13);
  });

  it("leaves no bonus tiles in any hand", () => {
    const { hands } = dealHands(shuffle(buildWall()));
    for (const hand of hands) {
      expect(hand.some(isBonus)).toBe(false);
    }
  });

  it("conserves every tile (hands + bonus + wall = original)", () => {
    const wall = shuffle(buildWall());
    const { hands, bonus, wall: rest } = dealHands(wall);
    const all: Tile[] = [...hands.flat(), ...bonus.flat(), ...rest];
    expect(all).toHaveLength(wall.length);

    const sortedIds = (ts: Tile[]) => ts.map(tileId).sort();
    expect(sortedIds(all)).toEqual(sortedIds(wall));
  });

  it("attributes bonus tiles to players and draws replacements", () => {
    // Craft a wall where the first dealt tile is a flower, forcing one
    // replacement. Place a flower at position 0, fill the rest with safe tiles.
    const safe: Tile = { kind: "suited", suit: "circles", value: 5 };
    const flower: Tile = { kind: "flower", flower: 1 };
    const wall: Tile[] = [flower, ...Array.from({ length: 143 }, () => ({ ...safe }))];

    const { hands, bonus } = dealHands(wall);
    // The flower was dealt to East (seat 0) first, then set aside.
    expect(bonus[0]).toHaveLength(1);
    expect(bonus[0][0]).toEqual(flower);
    // East still ends with a full 14-tile hand, all non-bonus.
    expect(hands[0]).toHaveLength(14);
    expect(hands[0].some(isBonus)).toBe(false);
  });
});
