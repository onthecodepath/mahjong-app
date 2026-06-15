import type { Tile } from "./tiles";
import { isBonus } from "./tiles";

export type Seat = 0 | 1 | 2 | 3; // 0=East (dealer), 1=South, 2=West, 3=North

export type DealtHands = {
  hands: [Tile[], Tile[], Tile[], Tile[]]; // East=14, others=13 (no bonus tiles)
  bonus: [Tile[], Tile[], Tile[], Tile[]]; // bonus tiles set aside per player
  wall: Tile[];                            // remaining draw pile
};

export function dealHands(wall: Tile[]): DealtHands {
  const remaining = [...wall];
  const hands: [Tile[], Tile[], Tile[], Tile[]] = [[], [], [], []];
  const bonus: [Tile[], Tile[], Tile[], Tile[]] = [[], [], [], []];

  const draw = (): Tile => remaining.shift()!;

  // ── Phase 1: deal initial hands ──────────────────────────────
  // Bonus tiles are dealt into hands as-is here; nobody replaces yet.
  // 3 rounds of 4 tiles → 12 each.
  for (let round = 0; round < 3; round++) {
    for (let seat = 0; seat < 4; seat++) {
      for (let i = 0; i < 4; i++) hands[seat].push(draw());
    }
  }
  // Final round: East (dealer) takes 2 → 14, others take 1 → 13.
  hands[0].push(draw(), draw());
  hands[1].push(draw());
  hands[2].push(draw());
  hands[3].push(draw());

  // ── Phase 2: replacement rounds ──────────────────────────────
  // Each round, every seat in turn (East→North) pulls any bonus tiles out of
  // its hand, sets them aside, and draws that many replacements. If a
  // replacement is itself a bonus tile, it is NOT redrawn immediately — it
  // stays in hand and is handled on the next round, after every other seat
  // has had its turn. Repeat until no hand holds a bonus tile.
  let pending = true;
  while (pending) {
    pending = false;
    for (let seat = 0; seat < 4; seat++) {
      const keep: Tile[] = [];
      let need = 0;
      for (const tile of hands[seat]) {
        if (isBonus(tile)) {
          bonus[seat].push(tile);
          need++;
        } else {
          keep.push(tile);
        }
      }
      if (need > 0) {
        pending = true; // found bonus this round → re-check after this pass
        hands[seat] = keep;
        for (let i = 0; i < need; i++) hands[seat].push(draw());
      }
    }
  }

  return { hands, bonus, wall: remaining };
}
