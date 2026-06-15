export type Suit = "characters" | "circles" | "bamboo";
export type Wind = "east" | "south" | "west" | "north";
export type Dragon = "red" | "green" | "white";
export type Flower = 1 | 2 | 3 | 4;
export type Season = 1 | 2 | 3 | 4;

export type SuitedTile = {
  kind: "suited";
  suit: Suit;
  value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
};
export type WindTile   = { kind: "wind";   wind: Wind };
export type DragonTile = { kind: "dragon"; dragon: Dragon };
export type FlowerTile = { kind: "flower"; flower: Flower };
export type SeasonTile = { kind: "season"; season: Season };

export type BonusTile = FlowerTile | SeasonTile;
export type Tile = SuitedTile | WindTile | DragonTile | BonusTile;

export function isBonus(tile: Tile): tile is BonusTile {
  return tile.kind === "flower" || tile.kind === "season";
}

export function tileId(tile: Tile): string {
  switch (tile.kind) {
    case "suited":  return `${tile.suit}-${tile.value}`;
    case "wind":    return `wind-${tile.wind}`;
    case "dragon":  return `dragon-${tile.dragon}`;
    case "flower":  return `flower-${tile.flower}`;
    case "season":  return `season-${tile.season}`;
  }
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  return tileId(a) === tileId(b);
}
