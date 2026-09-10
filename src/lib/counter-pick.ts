import { troopLabels, troopShort } from "@/lib/labels";
import type { Dragon, TroopType } from "@/lib/types";

function troopQueryHit(dragon: Dragon, q: string): boolean {
  if (q.length < 2) return false;
  return dragon.affinities.some((troop) => {
    const short = troopShort[troop].toLowerCase();
    const label = troopLabels[troop].toLowerCase();
    return (
      troop.startsWith(q) ||
      short === q ||
      short.startsWith(q) ||
      label.startsWith(q)
    );
  });
}

function haystack(dragon: Dragon): string {
  return [
    dragon.name,
    dragon.id,
    dragon.epithet,
    dragon.breed,
    ...dragon.tags,
    ...dragon.affinities.map(
      (troop) => `${troop} ${troopShort[troop]} ${troopLabels[troop]}`,
    ),
  ]
    .join(" ")
    .toLowerCase();
}

/** Lower is a better match. 99 means no match. */
export function dragonPickScore(dragon: Dragon, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 50;
  const name = dragon.name.toLowerCase();
  const id = dragon.id.toLowerCase();
  const epithet = dragon.epithet.toLowerCase();
  if (name === q || id === q) return 0;
  if (name.startsWith(q) || id.startsWith(q)) return 1;
  if (name.includes(q) || id.includes(q)) return 2;
  if (epithet.startsWith(q) || epithet.includes(q)) return 3;
  if (dragon.breed.startsWith(q) || dragon.breed.includes(q)) return 4;
  if (troopQueryHit(dragon, q)) return 5;
  if (q.length >= 3 && dragon.tags.some((tag) => tag.toLowerCase().includes(q))) {
    return 6;
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => haystack(dragon).includes(token))) {
    return 7;
  }
  return 99;
}

export function matchesDragonPick(dragon: Dragon, query: string): boolean {
  return dragonPickScore(dragon, query) < 99;
}

export function sortDragonPicks(
  rows: Dragon[],
  query: string,
  ownedIds: Iterable<string>,
): Dragon[] {
  const owned = new Set(ownedIds);
  return [...rows].sort((a, b) => {
    const as = dragonPickScore(a, query);
    const bs = dragonPickScore(b, query);
    if (as !== bs) return as - bs;
    const ao = owned.has(a.id) ? 0 : 1;
    const bo = owned.has(b.id) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });
}

export function filterDragonPicks(
  rows: Dragon[],
  opts: {
    query: string;
    troop?: TroopType | "all";
    ownedOnly?: boolean;
    ownedIds?: Iterable<string>;
  },
): Dragon[] {
  const owned = new Set(opts.ownedIds ?? []);
  const troop = opts.troop ?? "all";
  const filtered = rows.filter((row) => {
    if (opts.ownedOnly && !owned.has(row.id)) return false;
    if (troop !== "all" && !row.affinities.includes(troop)) return false;
    return matchesDragonPick(row, opts.query);
  });
  return sortDragonPicks(filtered, opts.query, owned);
}

export function starsForCounterPick(
  dragonId: string,
  ownedStars: ReadonlyMap<string, number>,
  fallback: number,
): number {
  return ownedStars.get(dragonId) ?? fallback;
}
