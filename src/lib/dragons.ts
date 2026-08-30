import { DRAGONS, getCatalogDragon } from "@/data/dragons";
import type { Dragon, Lineup, OwnedDragon, PitState, SlotId } from "@/lib/types";

export function allDragons(custom: Dragon[]): Dragon[] {
  return [...DRAGONS, ...custom];
}

export function findDragon(
  dragonId: string,
  custom: Dragon[] = [],
): Dragon | undefined {
  return getCatalogDragon(dragonId) ?? custom.find((d) => d.id === dragonId);
}

export function powerScore(owned: OwnedDragon): number {
  return owned.starRank * 12 + owned.reignLevel;
}

export function slotList(lineup: Lineup): { slot: SlotId; ownedId: string | null }[] {
  return [
    { slot: "left", ownedId: lineup.slots.left },
    { slot: "vanguard", ownedId: lineup.slots.vanguard },
    { slot: "right", ownedId: lineup.slots.right },
  ];
}

export function filledSlots(lineup: Lineup): number {
  return slotList(lineup).filter((s) => s.ownedId).length;
}

export function lineupsUsingDragon(state: PitState, ownedId: string): Lineup[] {
  return state.lineups.filter(
    (lineup) =>
      lineup.slots.left === ownedId ||
      lineup.slots.vanguard === ownedId ||
      lineup.slots.right === ownedId,
  );
}

export function emptyPit(): PitState {
  return {
    version: 1,
    owned: [],
    customDragons: [],
    lineups: [],
    teams: [],
  };
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
