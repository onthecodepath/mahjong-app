import type { Tile, Suit } from "./tiles";
import { tileId } from "./tiles";

// Checks whether a 14-tile hand forms 4 sets + 1 pair (the standard
// "chicken hand" win). Special hands (thirteen orphans, etc.) and fan
// requirements will be layered on later when we add scoring.
//
// TODO: extend to take exposed melds (pong/kong/chow claims and concealed
// kongs) once melds land in GameState. The hidden hand will then need to
// form (4 - exposedMelds.length) sets + 1 pair, and kongs in exposed melds
// each count as one set. The current 14-tile check is correct only when the
// player has no claimed melds and no concealed kongs.
export function isWinningHand(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;

  // Bonus tiles shouldn't appear in a hand.
  if (tiles.some((t) => t.kind === "flower" || t.kind === "season")) return false;

  const suitCounts: Record<Suit, number[]> = {
    characters: new Array(9).fill(0),
    circles:    new Array(9).fill(0),
    bamboo:     new Array(9).fill(0),
  };
  const honorCounts = new Map<string, number>();

  for (const tile of tiles) {
    if (tile.kind === "suited") {
      const current = suitCounts[tile.suit][tile.value - 1] ?? 0;
      suitCounts[tile.suit][tile.value - 1] = current + 1;
    } else {
      const k = tileId(tile);
      honorCounts.set(k, (honorCounts.get(k) ?? 0) + 1);
    }
  }

  // Try each tile with count >= 2 as the pair candidate.
  for (const [k, count] of honorCounts) {
    if (count < 2) continue;
    honorCounts.set(k, count - 2);
    const won = canDecomposeAll(suitCounts, honorCounts);
    honorCounts.set(k, count);
    if (won) return true;
  }

  const SUITS = ["characters", "circles", "bamboo"] as const;
  for (const suit of SUITS) {
    for (let v = 0; v < 9; v++) {
      const count = suitCounts[suit][v] ?? 0;
      if (count < 2) continue;
      suitCounts[suit][v] = count - 2;
      const won = canDecomposeAll(suitCounts, honorCounts);
      suitCounts[suit][v] = count;
      if (won) return true;
    }
  }

  return false;
}

function canDecomposeAll(
  suitCounts: Record<Suit, number[]>,
  honorCounts: Map<string, number>,
): boolean {
  for (const count of honorCounts.values()) {
    if (count !== 0 && count !== 3) return false;
  }
  const SUITS = ["characters", "circles", "bamboo"] as const;
  for (const suit of SUITS) {
    if (!canDecomposeSuit([...suitCounts[suit]])) return false;
  }
  return true;
}

function canDecomposeSuit(counts: number[]): boolean {
  let i = 0;
  while (i < counts.length && counts[i] === 0) i++;
  if (i === counts.length) return true;

  const a = counts[i] ?? 0;
  const b = counts[i + 1] ?? 0;
  const c = counts[i + 2] ?? 0;

  if (a >= 3) {
    counts[i] = a - 3;
    const won = canDecomposeSuit(counts);
    counts[i] = a;
    if (won) return true;
  }

  if (i + 2 < counts.length && b > 0 && c > 0) {
    counts[i]     = a - 1;
    counts[i + 1] = b - 1;
    counts[i + 2] = c - 1;
    const won = canDecomposeSuit(counts);
    counts[i]     = a;
    counts[i + 1] = b;
    counts[i + 2] = c;
    if (won) return true;
  }

  return false;
}
