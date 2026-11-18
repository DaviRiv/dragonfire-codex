import { coachLines } from "@/lib/ai/coach";
import { lineupFromAiLine } from "@/lib/ai/coach";
import { makeSuggestRequest } from "@/lib/ai/prompt";
import { collectRoster, type RosterCard } from "@/lib/ai/roster";
import { findDragon } from "@/lib/dragons";
import { dragonsUsedOnOtherPitTeams, emptySlots, makePick, placedInLineup } from "@/lib/lineup";
import {
  MAX_PIT_TEAMS,
  availablePitOwned,
  pitLineups,
} from "@/lib/pit-teams";
import { dragonRoles, isTank } from "@/lib/roles";
import { suggestFullLine } from "@/lib/suggest";
import type { Lineup, LineupMode, PitState, SlotId, TroopType } from "@/lib/types";

export type PitTeamSlot = {
  index: number;
  lineup: Lineup | null;
};

/** Five march slots — one saved pit team each, in save order. */
export function pitTeamGrid(state: PitState): PitTeamSlot[] {
  const pit = pitLineups(state);
  return Array.from({ length: MAX_PIT_TEAMS }, (_, index) => ({
    index,
    lineup: pit[index] ?? null,
  }));
}

export function pitSetupReady(state: PitState, minOwned = 3): boolean {
  return state.owned.length >= minOwned;
}

export function filledPitTeamCount(state: PitState): number {
  return pitLineups(state).filter((lineup) =>
    placedInLineup(lineup, state).length === 3,
  ).length;
}

export function canAutoBuildPitTeam(state: PitState): boolean {
  if (pitLineups(state).length >= MAX_PIT_TEAMS) return false;
  return availablePitOwned(state).length >= 3;
}

function defaultTroopMode(state: PitState): {
  troop: TroopType;
  mode: LineupMode;
} {
  const last = pitLineups(state)[0];
  return {
    troop: last?.troop ?? "shieldbearers",
    mode: last?.mode ?? "pvp",
  };
}

/** Rank a full line from dragons not on other pit teams (Suggest engine). */
export function rankAutoPitLine(
  state: PitState,
  opts?: { troop?: TroopType; mode?: LineupMode; anchorId?: string | null },
) {
  if (!canAutoBuildPitTeam(state)) return null;
  const { troop, mode } = { ...defaultTroopMode(state), ...opts };
  const draft: Lineup = {
    id: "auto-draft",
    name: "auto",
    kind: "pit",
    mode,
    troop,
    notes: "",
    slots: emptySlots(),
    ignoreLevel: false,
    craftStars: 10,
    excludeUsed: true,
    updatedAt: "",
  };
  const excludeIds = dragonsUsedOnOtherPitTeams(state);
  const picks = suggestFullLine(draft, state, { excludeIds });
  if (picks.length < 3) return null;
  return { draft, picks, troop, mode };
}

/** Copilot-ranked line from the next best anchor in the free pool. */
export function rankCopilotPitLine(
  state: PitState,
  opts?: { troop?: TroopType; mode?: LineupMode; anchorId?: string | null },
) {
  if (!canAutoBuildPitTeam(state)) return null;
  const { troop, mode } = { ...defaultTroopMode(state), ...opts };
  const anchorId =
    opts?.anchorId ?? suggestCopilotAnchorForNextTeam(state) ?? null;
  const scratch: Lineup = {
    id: "coach-scratch",
    name: "Coach",
    kind: "pit",
    mode,
    troop,
    notes: "",
    slots: emptySlots(),
    ignoreLevel: false,
    craftStars: 10,
    excludeUsed: true,
    updatedAt: "",
  };
  const roster: RosterCard[] = collectRoster(state, scratch, "pit");
  const request = makeSuggestRequest(scratch, state, "pit", roster);
  const lines = coachLines({
    request,
    state,
    lineup: scratch,
    troop,
    mode,
    skip: [],
    anchorId,
    lockTroop: false,
  });
  const head = lines[0];
  if (!head) return null;
  return { line: head, anchorId: anchorId ?? head.vanguard, roster };
}

export function lineupFromAutoRank(
  state: PitState,
  pitIndex: number,
  rank: NonNullable<ReturnType<typeof rankAutoPitLine>>,
): Lineup {
  const name = `March ${pitIndex + 1}`;
  const slots = { ...emptySlots() };
  for (const pick of rank.picks) {
    const owned = state.owned.find((row) => row.dragonId === pick.dragon.id);
    slots[pick.slot] = makePick(
      pick.dragon.id,
      owned?.starRank ?? 1,
      owned?.reignLevel ?? 1,
    );
  }
  return {
    id: `march-${pitIndex}-${Date.now()}`,
    name,
    kind: "pit",
    mode: rank.mode,
    troop: rank.troop,
    notes: "Auto-builder",
    slots,
    ignoreLevel: false,
    craftStars: 10,
    excludeUsed: true,
    updatedAt: new Date().toISOString(),
  };
}

export function lineupFromCopilotRank(
  state: PitState,
  pitIndex: number,
  rank: NonNullable<ReturnType<typeof rankCopilotPitLine>>,
): Lineup {
  const base = lineupFromAiLine(rank.line, state, "pit");
  return {
    ...base,
    id: `march-${pitIndex}-${Date.now()}`,
    name: `March ${pitIndex + 1}`,
    notes: rank.line.why,
    excludeUsed: true,
  };
}

/** Best dragon to anchor the next Copilot team from unseated owned pit. */
export function suggestCopilotAnchorForNextTeam(state: PitState): string | null {
  const free = availablePitOwned(state);
  if (free.length === 0) return null;
  let best: { id: string; score: number } | null = null;
  for (const row of free) {
    const dragon = findDragon(row.dragonId, state.customDragons);
    if (!dragon) continue;
    let score = row.starRank * 10 + (row.reignLevel ?? 0);
    if (isTank(dragon)) score += 25;
    const roles = dragonRoles(dragon);
    if (roles.includes("healing")) score += 8;
    if (roles.includes("damage")) score += 6;
    if (!best || score > best.score) best = { id: dragon.id, score };
  }
  return best?.id ?? free[0].dragonId;
}

export type ShiftTarget = {
  lineupId: string;
  slot: SlotId;
  label: string;
};

/** Every pit seat you can move a dragon onto (swap when occupied). */
export function shiftTargetsFor(
  state: PitState,
  except?: { lineupId: string; slot: SlotId },
): ShiftTarget[] {
  const out: ShiftTarget[] = [];
  for (const lineup of pitLineups(state)) {
    for (const slot of ["left", "vanguard", "right"] as SlotId[]) {
      if (
        except &&
        except.lineupId === lineup.id &&
        except.slot === slot
      ) {
        continue;
      }
      out.push({
        lineupId: lineup.id,
        slot,
        label: `${lineup.name} · ${slot}`,
      });
    }
  }
  return out;
}