import { describe, it, expect } from "vitest";
import { buildWall, shuffle } from "./wall";
import { tileId, isBonus } from "./tiles";

describe("buildWall", () => {
  it("produces exactly 144 tiles", () => {
    expect(buildWall()).toHaveLength(144);
  });

  it("has 108 suited, 16 winds, 12 dragons, 8 bonus", () => {
    const wall = buildWall();
    const count = (k: string) => wall.filter((t) => t.kind === k).length;
    expect(count("suited")).toBe(108);
    expect(count("wind")).toBe(16);
    expect(count("dragon")).toBe(12);
    expect(wall.filter(isBonus)).toHaveLength(8);
  });

  it("has exactly 4 copies of each non-bonus tile and 1 of each bonus", () => {
    const counts = new Map<string, number>();
    for (const t of buildWall()) {
      counts.set(tileId(t), (counts.get(tileId(t)) ?? 0) + 1);
    }
    expect(counts.get("characters-5")).toBe(4);
    expect(counts.get("wind-east")).toBe(4);
    expect(counts.get("dragon-red")).toBe(4);
    expect(counts.get("flower-1")).toBe(1);
    expect(counts.get("season-4")).toBe(1);
  });
});

describe("shuffle", () => {
  it("preserves the multiset of tiles", () => {
    const wall = buildWall();
    const shuffled = shuffle(wall);
    expect(shuffled).toHaveLength(wall.length);

    const sortedIds = (ts: typeof wall) => ts.map(tileId).sort();
    expect(sortedIds(shuffled)).toEqual(sortedIds(wall));
  });

  it("does not mutate the original array", () => {
    const wall = buildWall();
    const before = wall.map(tileId);
    shuffle(wall, () => 0.5);
    expect(wall.map(tileId)).toEqual(before);
  });

  it("is deterministic with a fixed rng", () => {
    const wall = buildWall();
    const rng = () => 0.42;
    expect(shuffle(wall, rng).map(tileId)).toEqual(shuffle(wall, rng).map(tileId));
  });
});
