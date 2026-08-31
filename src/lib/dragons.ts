import { DRAGONS, getCatalogDragon } from "@/data/dragons";
import {
  clampReign,
  clampStar,
  emptySlots,
  filledCount,
  makePick,
  SLOT_IDS,
} from "@/lib/lineup";
import type {
  Dragon,
  Lineup,
  LineupKind,
  LineupPick,
  LineupSlots,
  OwnedDragon,
  PitState,
  SlotId,
} from "@/lib/types";

export function allDragons(custom: Dragon[]): Dragon[] {
  return [...DRAGONS, ...custom];
}

export function findDragon(
  dragonId: string,
  custom: Dragon[] = [],
): Dragon | undefined {
  return getCatalogDragon(dragonId) ?? custom.find((d) => d.id === dragonId);
}

export function powerScore(owned: OwnedDragon, ignoreLevel = false): number {
  return owned.starRank * 12 + (ignoreLevel ? 0 : owned.reignLevel);
}

export function slotList(
  lineup: Lineup,
): { slot: SlotId; pick: LineupPick | null }[] {
  return SLOT_IDS.map((slot) => ({ slot, pick: lineup.slots[slot] }));
}

export function filledSlots(lineup: Lineup): number {
  return filledCount(lineup);
}

export function lineupsUsingDragon(state: PitState, ownedId: string): Lineup[] {
  const owned = state.owned.find((o) => o.id === ownedId);
  if (!owned) return [];
  return state.lineups.filter((lineup) =>
    SLOT_IDS.some((slot) => lineup.slots[slot]?.dragonId === owned.dragonId),
  );
}

export function emptyPit(): PitState {
  return {
    version: 2,
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

function isPick(value: unknown): value is LineupPick {
  if (!value || typeof value !== "object") return false;
  const v = value as LineupPick;
  return typeof v.dragonId === "string";
}

function migrateSlots(
  raw: unknown,
  owned: OwnedDragon[],
): LineupSlots {
  const slots = emptySlots();
  if (!raw || typeof raw !== "object") return slots;
  const record = raw as Record<string, unknown>;
  for (const slot of SLOT_IDS) {
    const value = record[slot];
    if (!value) {
      slots[slot] = null;
      continue;
    }
    if (isPick(value)) {
      slots[slot] = makePick(
        value.dragonId,
        value.starRank ?? 1,
        value.reignLevel ?? 1,
      );
      continue;
    }
    if (typeof value === "string") {
      const found = owned.find((o) => o.id === value);
      slots[slot] = found
        ? makePick(found.dragonId, found.starRank, found.reignLevel)
        : null;
    }
  }
  return slots;
}

function migrateLineup(raw: unknown, owned: OwnedDragon[]): Lineup | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Partial<Lineup> & { kind?: string };
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;
  const kind: LineupKind = v.kind === "theory" ? "theory" : "pit";
  return {
    id: v.id,
    name: v.name,
    kind,
    mode: v.mode ?? "pvp",
    troop: v.troop ?? "shieldbearers",
    notes: typeof v.notes === "string" ? v.notes : "",
    slots: migrateSlots(v.slots, owned),
    ignoreLevel: Boolean(v.ignoreLevel),
    craftStars: clampStar(v.craftStars ?? 10),
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : nowIso(),
  };
}

export function normalizePitState(value: unknown): PitState | null {
  if (!value || typeof value !== "object") return null;
  const v = value as {
    version?: number;
    owned?: unknown;
    customDragons?: unknown;
    lineups?: unknown;
    teams?: unknown;
  };
  if (v.version !== 1 && v.version !== 2) return null;
  if (!Array.isArray(v.owned) || !Array.isArray(v.lineups) || !Array.isArray(v.teams)) {
    return null;
  }
  if (!Array.isArray(v.customDragons)) return null;
  const owned = v.owned as OwnedDragon[];
  const lineups = v.lineups
    .map((lineup) => migrateLineup(lineup, owned))
    .filter((lineup): lineup is Lineup => Boolean(lineup));
  return {
    version: 2,
    owned,
    customDragons: v.customDragons as Dragon[],
    lineups,
    teams: v.teams as PitState["teams"],
  };
}

export { clampStar, clampReign };
