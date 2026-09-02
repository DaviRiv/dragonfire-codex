import { getCatalogDragon } from "@/data/dragons";
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

export const SLOT_IDS: SlotId[] = ["left", "vanguard", "right"];

export function emptySlots(): LineupSlots {
  return { left: null, vanguard: null, right: null };
}

export function clampStar(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n) || 1));
}

export function clampReign(n: number): number {
  return Math.min(80, Math.max(1, Math.round(n) || 1));
}

export function makePick(
  dragonId: string,
  starRank: number,
  reignLevel: number,
): LineupPick {
  return {
    dragonId,
    starRank: clampStar(starRank),
    reignLevel: clampReign(reignLevel),
  };
}

export function investmentScore(
  starRank: number,
  reignLevel: number,
  ignoreLevel?: boolean,
): number {
  return starRank * 12 + (ignoreLevel ? 0 : reignLevel);
}

export interface ResolvedSlot {
  slot: SlotId;
  dragon: Dragon;
  pick: LineupPick;
  owned: OwnedDragon | null;
  starRank: number;
  reignLevel: number;
}

export function slotPick(
  lineup: Lineup,
  slot: SlotId,
): LineupPick | null {
  return lineup.slots[slot];
}

export function resolveSlot(
  lineup: Lineup,
  state: PitState,
  slot: SlotId,
): ResolvedSlot | null {
  const stored = lineup.slots[slot];
  if (!stored) return null;
  const dragon =
    getCatalogDragon(stored.dragonId) ??
    state.customDragons.find((d) => d.id === stored.dragonId);
  if (!dragon) return null;
  const owned =
    state.owned.find((o) => o.dragonId === stored.dragonId) ?? null;

  if (lineup.kind === "pit") {
    if (!owned) return null;
    return {
      slot,
      dragon,
      pick: stored,
      owned,
      starRank: owned.starRank,
      reignLevel: owned.reignLevel,
    };
  }

  return {
    slot,
    dragon,
    pick: stored,
    owned,
    starRank: stored.starRank,
    reignLevel: stored.reignLevel,
  };
}

export function placedInLineup(
  lineup: Lineup,
  state: PitState,
): ResolvedSlot[] {
  const result: ResolvedSlot[] = [];
  for (const slot of SLOT_IDS) {
    const resolved = resolveSlot(lineup, state, slot);
    if (resolved) result.push(resolved);
  }
  return result;
}

export function slottedDragonIds(
  lineup: Lineup,
  state: PitState,
): Set<string> {
  return new Set(placedInLineup(lineup, state).map((p) => p.dragon.id));
}

export function dragonsUsedOnOtherPitTeams(
  state: PitState,
  exceptLineupId?: string,
): Set<string> {
  const ids = new Set<string>();
  for (const lineup of state.lineups) {
    if (lineup.id === exceptLineupId) continue;
    if (lineup.kind !== "pit") continue;
    for (const row of placedInLineup(lineup, state)) {
      ids.add(row.dragon.id);
    }
  }
  return ids;
}

export function slotOfDragon(
  lineup: Lineup,
  state: PitState,
  dragonId: string,
): SlotId | undefined {
  return placedInLineup(lineup, state).find((p) => p.dragon.id === dragonId)
    ?.slot;
}

export function filledCount(lineup: Lineup, state?: PitState): number {
  if (!state) {
    return SLOT_IDS.filter((slot) => lineup.slots[slot]).length;
  }
  return placedInLineup(lineup, state).length;
}

export function clearDragonFromSlots(
  slots: LineupSlots,
  dragonId: string,
): LineupSlots {
  const next = { ...slots };
  for (const slot of SLOT_IDS) {
    if (next[slot]?.dragonId === dragonId) next[slot] = null;
  }
  return next;
}

export function formatInvestment(
  starRank: number,
  reignLevel: number,
  opts?: { ignoreLevel?: boolean; kind?: LineupKind },
): string {
  if (opts?.kind === "theory" || opts?.ignoreLevel) return `★${starRank}`;
  return `★${starRank} · R${reignLevel}`;
}

export function skipsUsedDragons(lineup: Lineup): boolean {
  return lineup.kind === "pit" && lineup.excludeUsed !== false;
}

export function lineupKindLabel(kind: LineupKind): string {
  return kind === "theory" ? "Theory" : "Pit";
}
