import { LINE_BOOK, NAMED_CORES, type BookEntry } from "@/data/line-book";
import { getCatalogDragon } from "@/data/dragons";
import type { BoardLine } from "@/lib/boards";
import type { EnemyLine } from "@/lib/counter";
import type { LineupMode, TroopType } from "@/lib/types";

export function trioKeyOf(ids: readonly string[]): string {
  return [...ids].slice().sort().join("|");
}

export function namedCoreOf(ids: readonly string[]): string | null {
  const key = trioKeyOf(ids);
  for (const [name, seats] of Object.entries(NAMED_CORES)) {
    if (trioKeyOf(seats) === key) return name;
  }
  return null;
}

export function bookSeats(entry: BookEntry): [string, string, string] {
  return [entry.left, entry.vanguard, entry.right];
}

export function boardFromBook(
  entry: BookEntry,
  pin?: { id: string; stars: number },
  partnerStars = 1,
): BoardLine | null {
  const left = getCatalogDragon(entry.left);
  const vanguard = getCatalogDragon(entry.vanguard);
  const right = getCatalogDragon(entry.right);
  if (!left || !vanguard || !right) return null;
  if (new Set(bookSeats(entry)).size !== 3) return null;
  const star = (id: string) =>
    pin && id === pin.id ? pin.stars : partnerStars;
  return {
    name: `${left.name} · ${vanguard.name} · ${right.name}`,
    why: entry.why,
    troop: entry.troop,
    mode: entry.mode,
    left: entry.left,
    vanguard: entry.vanguard,
    right: entry.right,
    leftStars: star(entry.left),
    vanguardStars: star(entry.vanguard),
    rightStars: star(entry.right),
  };
}

function sharesAny(entry: BookEntry, ids: Iterable<string>): boolean {
  const taken = new Set(ids);
  return bookSeats(entry).some((id) => taken.has(id));
}

export function bookAround(
  dragonId: string,
  troop: TroopType,
  mode: LineupMode = "pvp",
): BookEntry[] {
  const seen = new Set<string>();
  const out: BookEntry[] = [];
  for (const entry of LINE_BOOK) {
    if (entry.troop !== troop || entry.mode !== mode) continue;
    if (!bookSeats(entry).includes(dragonId)) continue;
    const key = trioKeyOf(bookSeats(entry)) + `|${entry.left}|${entry.vanguard}|${entry.right}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

export function bookAgainst(
  enemy: Pick<EnemyLine, "left" | "vanguard" | "right" | "troop">,
  troop: TroopType,
): BookEntry[] {
  const enemyIds = [enemy.left, enemy.vanguard, enemy.right];
  const core = namedCoreOf(enemyIds);
  const seen = new Set<string>();
  const out: BookEntry[] = [];
  for (const entry of LINE_BOOK) {
    if (entry.troop !== troop) continue;
    if (sharesAny(entry, enemyIds)) continue;
    const seating = `${entry.left}|${entry.vanguard}|${entry.right}`;
    if (seen.has(seating)) continue;
    const answersCore = Boolean(core && entry.answers?.includes(core));
    const beatsTroop = Boolean(entry.beats?.includes(enemy.troop));
    const general =
      entry.kind !== "counter" &&
      !entry.answers?.length &&
      !entry.beats?.length;
    if (!answersCore && !beatsTroop && !general) continue;
    seen.add(seating);
    out.push(entry);
  }
  out.sort((a, b) => {
    const aHit = Number(Boolean(core && a.answers?.includes(core))) * 2 +
      Number(Boolean(a.beats?.includes(enemy.troop)));
    const bHit = Number(Boolean(core && b.answers?.includes(core))) * 2 +
      Number(Boolean(b.beats?.includes(enemy.troop)));
    return bHit - aHit || a.name.localeCompare(b.name);
  });
  return out;
}

export function assertLineBook(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entry of LINE_BOOK) {
    if (ids.has(entry.id)) errors.push(`duplicate book id ${entry.id}`);
    ids.add(entry.id);
    const seats = bookSeats(entry);
    if (new Set(seats).size !== 3) {
      errors.push(`${entry.id} repeats a seat`);
    }
    for (const id of seats) {
      if (!getCatalogDragon(id)) errors.push(`${entry.id} unknown dragon ${id}`);
    }
    if (entry.answers) {
      for (const name of entry.answers) {
        if (!NAMED_CORES[name]) errors.push(`${entry.id} unknown core ${name}`);
      }
    }
  }
  return errors;
}
