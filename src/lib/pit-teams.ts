import { placedInLineup } from "@/lib/lineup";
import type { Lineup, OwnedDragon, PitState } from "@/lib/types";

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
