import { allDragons, findDragon } from "@/lib/dragons";
import { suggestFullLine } from "@/lib/suggest";
import type { AiLine } from "@/lib/ai/prompt";
import type { RosterCard } from "@/lib/ai/roster";
import type { Lineup, PitState } from "@/lib/types";

/** Deterministic local ranker. Same composition rules as Suggest. */
export function localComboLines(
  lineup: Lineup,
  state: PitState,
  roster: RosterCard[],
  extraExclude: string[] = [],
): AiLine[] {
  const allowed = new Set(roster.map((card) => card.id));
  const troopMatches = roster.filter((card) =>
    card.aff.split("+").includes(lineup.troop),
  );
  const enforceTroop = troopMatches.length >= 3;
  const notInRoster = allDragons(state.customDragons)
    .map((dragon) => dragon.id)
    .filter((id) => {
      if (!allowed.has(id)) return true;
      if (!enforceTroop) return false;
      const dragon = findDragon(id, state.customDragons);
      return Boolean(dragon && !dragon.affinities.includes(lineup.troop));
    });
  const seatedElsewhere = roster
    .filter((card) => card.otherTeam)
    .map((card) => card.id);
  // Pit marches are always exclusive. `excludeUsed` now only exists for
  // backward compatibility with old saves; it cannot permit double-booking.
  const skipUsed = lineup.kind === "pit";
  const blocked = new Set([
    ...notInRoster,
    ...(skipUsed ? seatedElsewhere : []),
    ...extraExclude,
  ]);
  const working: Lineup = {
    ...lineup,
    kind:
      lineup.kind === "pit" && roster.every((card) => card.owned)
        ? "pit"
        : "theory",
    slots: { left: null, vanguard: null, right: null },
  };
  const lines: AiLine[] = [];

  for (let i = 0; i < 3; i++) {
    const picks = suggestFullLine(working, state, {
      replace: true,
      excludeIds: blocked,
    });
    if (picks.length < 3) break;
    const bySlot = {
      left: picks.find((pick) => pick.slot === "left")?.dragon,
      vanguard: picks.find((pick) => pick.slot === "vanguard")?.dragon,
      right: picks.find((pick) => pick.slot === "right")?.dragon,
    };
    if (!bySlot.left || !bySlot.vanguard || !bySlot.right) break;
    for (const pick of picks) blocked.add(pick.dragon.id);
    lines.push({
      name: i === 0 ? "Ranked core" : `Alternate ${i + 1}`,
      troop: lineup.troop,
      mode: lineup.mode,
      left: bySlot.left.id,
      vanguard: bySlot.vanguard.id,
      right: bySlot.right.id,
      why: `${bySlot.vanguard.name} in Vanguard, ${bySlot.left.name} left, ${bySlot.right.name} right — healer, soak, then damage when the pit allows.`,
    });
  }

  if (
    lines.length === 0 &&
    roster.filter((card) => !card.otherTeam).length >= 3
  ) {
    const free = roster.filter((card) => !card.otherTeam);
    lines.push({
      name: "First three",
      troop: lineup.troop,
      mode: lineup.mode,
      left: free[0].id,
      vanguard: free[1].id,
      right: free[2].id,
      why: "Not enough ranked leftovers; seated the first three roster names.",
    });
  }

  return lines.filter((line) =>
    [line.left, line.vanguard, line.right].every((id) => findDragon(id)),
  );
}
