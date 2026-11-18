import { placedInLineup } from "@/lib/lineup";
import type { Lineup, LineupPick, OwnedDragon, PitState, SlotId } from "@/lib/types";

export const MAX_PIT_TEAMS = 5;

export function pitLineups(state: PitState): Lineup[] {
  return state.lineups.filter((lineup) => lineup.kind === "pit");
}

/** Map of dragonId -> saved pit team name(s) for dragons already marching. */
export function usedOnPitTeams(
  state: PitState,
  exceptLineupId?: string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const lineup of pitLineups(state)) {
    if (exceptLineupId && lineup.id === exceptLineupId) continue;
    for (const row of placedInLineup(lineup, state)) {
      const prev = map.get(row.dragon.id);
      map.set(row.dragon.id, prev ? `${prev}, ${lineup.name}` : lineup.name);
    }
  }
  return map;
}

export function availablePitOwned(
  state: PitState,
  exceptLineupId?: string,
): OwnedDragon[] {
  const used = usedOnPitTeams(state, exceptLineupId);
  return state.owned.filter((row) => !used.has(row.dragonId));
}

/**
 * Pit marches are exclusive: the first saved occurrence keeps the dragon and
 * every later occurrence is cleared. Theory lines may repeat because they are
 * planning boards, not active marches.
 */
export function enforceUniquePitDragons(state: PitState): PitState {
  const seen = new Set<string>();
  let changed = false;
  const lineups = state.lineups.map((lineup) => {
    if (lineup.kind !== "pit") return lineup;
    let slots = lineup.slots;
    for (const slot of ["left", "vanguard", "right"] as SlotId[]) {
      const pick = slots[slot] as LineupPick | null;
      if (!pick) continue;
      if (seen.has(pick.dragonId)) {
        if (slots === lineup.slots) slots = { ...lineup.slots };
        slots[slot] = null;
        changed = true;
      } else {
        seen.add(pick.dragonId);
      }
    }
    return slots === lineup.slots ? lineup : { ...lineup, slots };
  });
  return changed ? { ...state, lineups } : state;
}

export function repeatedPitDragons(state: PitState): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const lineup of pitLineups(state)) {
    for (const row of placedInLineup(lineup, state)) {
      if (seen.has(row.dragon.id)) repeated.add(row.dragon.id);
      seen.add(row.dragon.id);
    }
  }
  return [...repeated];
}
