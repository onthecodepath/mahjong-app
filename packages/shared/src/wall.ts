import type { Tile, Suit, Wind, Dragon } from "./tiles";

const SUITS: Suit[]     = ["characters", "circles", "bamboo"];
const WINDS: Wind[]     = ["east", "south", "west", "north"];
const DRAGONS: Dragon[] = ["red", "green", "white"];
const COPIES = 4;

export function buildWall(): Tile[] {
  const tiles: Tile[] = [];

  for (const suit of SUITS) {
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < COPIES; i++) {
        tiles.push({ kind: "suited", suit, value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 });
      }
    }
  }

  for (const wind of WINDS) {
    for (let i = 0; i < COPIES; i++) {
      tiles.push({ kind: "wind", wind });
    }
  }

  for (const dragon of DRAGONS) {
    for (let i = 0; i < COPIES; i++) {
      tiles.push({ kind: "dragon", dragon });
    }
  }

  // 4 flowers + 4 seasons (one copy each)
  for (let n = 1; n <= 4; n++) {
    tiles.push({ kind: "flower", flower: n as 1 | 2 | 3 | 4 });
    tiles.push({ kind: "season", season: n as 1 | 2 | 3 | 4 });
  }

  return tiles; // 144 tiles total
}

// Fisher-Yates shuffle. Accepts an optional rng for deterministic tests.
export function shuffle<T>(tiles: T[], rng: () => number = Math.random): T[] {
  const arr = [...tiles];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
