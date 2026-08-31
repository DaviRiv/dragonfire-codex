import { allDragons, findDragon } from "@/lib/dragons";
import {
  emptySlots,
  investmentScore,
  makePick,
  placedInLineup,
  resolveSlot,
  slottedDragonIds,
  type ResolvedSlot,
} from "@/lib/lineup";
import { breedLabels, slotLabels, troopLabels } from "@/lib/labels";
import type { Dragon, Lineup, OwnedDragon, PitState, SlotId } from "@/lib/types";

export interface DragonSuggestion {
  dragon: Dragon;
  owned: OwnedDragon | null;
  score: number;
  reasons: string[];
  starRank: number;
  reignLevel: number;
}

function teammatesForSlot(
  lineup: Lineup,
  state: PitState,
  slot: SlotId,
): ResolvedSlot[] {
  return placedInLineup(lineup, state).filter((placed) => placed.slot !== slot);
}

function mateIn(
  teammates: ResolvedSlot[],
  slot: SlotId,
): ResolvedSlot | undefined {
  return teammates.find((placed) => placed.slot === slot);
}

function scoreDragon(
  dragon: Dragon,
  owned: OwnedDragon | null,
  lineup: Lineup,
  slot: SlotId,
  teammates: ResolvedSlot[],
): DragonSuggestion {
  let score = 0;
  const weighted: { text: string; weight: number }[] = [];
  const troopName = troopLabels[lineup.troop];
  const breedName = breedLabels[dragon.breed];
  const starRank =
    lineup.kind === "theory" ? lineup.craftStars : (owned?.starRank ?? 1);
  const reignLevel = owned?.reignLevel ?? 1;
  const takenBreeds = new Set(teammates.map((mate) => mate.dragon.breed));
  const left = mateIn(teammates, "left");
  const vanguard = mateIn(teammates, "vanguard");
  const right = mateIn(teammates, "right");

  function note(text: string, weight: number, points = 0) {
    score += points;
    if (!weighted.some((item) => item.text === text)) {
      weighted.push({ text, weight });
    }
  }

  if (dragon.affinities.includes(lineup.troop)) {
    note(
      teammates.length > 0
        ? `Matches ${troopName} with this team`
        : `Matches ${troopName}`,
      70,
      40,
    );
  }

  if (lineup.kind === "pit" && owned) {
    score += 8 + investmentScore(owned.starRank, owned.reignLevel, lineup.ignoreLevel) / 8;
  }

  if (lineup.kind === "theory" && owned) {
    score += 6;
  }

  if (teammates.length > 0 && !takenBreeds.has(dragon.breed)) {
    const have = [...takenBreeds].map((breed) => breedLabels[breed]).join(" + ");
    note(`Adds ${breedName} — you have ${have}`, 90, 20);
  } else if (teammates.length > 0 && takenBreeds.has(dragon.breed)) {
    score -= 6;
  }

  if (slot !== "right" && dragon.flankBonus === "right" && right) {
    note(`Buffs ${right.dragon.name} on the right`, 100, 24);
  } else if (slot !== "left" && dragon.flankBonus === "left" && left) {
    note(`Buffs ${left.dragon.name} on the left`, 100, 24);
  } else if (slot === "left" && dragon.flankBonus === "right") {
    note("Buffs the right from here", 55, 12);
  } else if (slot === "right" && dragon.flankBonus === "left") {
    note("Buffs the left from here", 55, 12);
  }

  if (slot === "right") {
    const feeder =
      left?.dragon.flankBonus === "right"
        ? left
        : vanguard?.dragon.flankBonus === "right"
          ? vanguard
          : null;
    if (feeder) {
      note(`Gets ${feeder.dragon.name}’s right-flank habit`, 85, 16);
    }
  }
  if (slot === "left") {
    const feeder =
      right?.dragon.flankBonus === "left"
        ? right
        : vanguard?.dragon.flankBonus === "left"
          ? vanguard
          : null;
    if (feeder) {
      note(`Gets ${feeder.dragon.name}’s left-flank habit`, 85, 16);
    }
  }

  if (slot === "vanguard") {
    if (dragon.tags.includes("Taunt")) {
      note(
        teammates.length ? "Taunt soak for this team" : "Taunt soak",
        80,
        28,
      );
    }
    if (dragon.breed === "warrior") {
      note("Front-line warrior", 50, 10);
    }
  } else if (
    !vanguard?.dragon.tags.includes("Taunt") &&
    dragon.tags.includes("Taunt")
  ) {
    note("Taunt is usually better in Vanguard", 25);
  }

  if (slot === "left" && dragon.breed === "sentinel") {
    note("Sentinel support on the left", 45, 8);
  }
  if (slot === "right" && dragon.breed === "hunter") {
    note("Hunter pressure on the right", 45, 8);
  }

  if (dragon.flankBonus === slot) {
    score -= 6;
  }

  const teamHasRecovery = teammates.some((mate) =>
    mate.dragon.tags.includes("Recovery"),
  );
  if (dragon.tags.includes("Recovery") && !teamHasRecovery) {
    note(
      teammates.length
        ? "Recovery your line is missing"
        : lineup.mode === "pve"
          ? "Recovery for PvE"
          : "Recovery",
      60,
      lineup.mode === "pve" ? 12 : 8,
    );
  }

  const fireMate = teammates.find((mate) =>
    mate.dragon.tags.includes("Fire Damage"),
  );
  if (fireMate && dragon.tags.includes("Fire Damage")) {
    note(`Fire kit with ${fireMate.dragon.name}`, 65, 10);
  }

  const physicalMate = teammates.find((mate) =>
    mate.dragon.tags.includes("Physical Damage"),
  );
  if (physicalMate && dragon.tags.includes("Physical Damage")) {
    note(`Physical kit with ${physicalMate.dragon.name}`, 60, 8);
  }

  if (lineup.mode === "defense" && dragon.tags.includes("Protect")) {
    note("Protect for castle defense", 55, 10);
  }
  if (lineup.mode === "pvp" && dragon.tags.includes("Taunt") && slot === "vanguard") {
    score += 4;
  }

  const reasons = weighted
    .sort((a, b) => b.weight - a.weight)
    .map((item) => item.text);

  if (reasons.length === 0) {
    reasons.push(`For ${slotLabels[slot]}`);
  }

  return {
    dragon,
    owned,
    score,
    reasons: reasons.slice(0, 3),
    starRank,
    reignLevel,
  };
}

export function suggestDragons({
  lineup,
  slot,
  state,
  query = "",
  includeSlotted = false,
  pool = "all",
}: {
  lineup: Lineup;
  slot: SlotId;
  state: PitState;
  query?: string;
  includeSlotted?: boolean;
  pool?: "all" | "owned" | "unowned";
}): DragonSuggestion[] {
  const used = slottedDragonIds(lineup, state);
  const teammates = teammatesForSlot(lineup, state, slot);
  const q = query.trim().toLowerCase();
  const ownedByCatalog = new Map(
    state.owned.map((o) => [o.dragonId, o] as const),
  );

  const source =
    lineup.kind === "pit"
      ? state.owned
          .map((owned) => findDragon(owned.dragonId, state.customDragons))
          .filter((d): d is Dragon => Boolean(d))
      : allDragons(state.customDragons);

  return source
    .filter((dragon) => {
      if (!includeSlotted && used.has(dragon.id)) return false;
      const owned = ownedByCatalog.get(dragon.id) ?? null;
      if (pool === "owned" && !owned) return false;
      if (pool === "unowned" && owned) return false;
      if (!q) return true;
      return `${dragon.name} ${dragon.epithet} ${dragon.breed} ${dragon.tags.join(" ")}`
        .toLowerCase()
        .includes(q);
    })
    .map((dragon) =>
      scoreDragon(
        dragon,
        ownedByCatalog.get(dragon.id) ?? null,
        lineup,
        slot,
        teammates,
      ),
    )
    .sort(
      (a, b) =>
        b.score - a.score || a.dragon.name.localeCompare(b.dragon.name),
    );
}

export function suggestFullLine(
  lineup: Lineup,
  state: PitState,
  options?: { replace?: boolean },
): { slot: SlotId; dragon: Dragon }[] {
  const picks: { slot: SlotId; dragon: Dragon }[] = [];
  const working: Lineup = {
    ...lineup,
    slots: options?.replace ? emptySlots() : { ...lineup.slots },
  };
  const exclude = slottedDragonIds(working, state);

  for (const slot of ["vanguard", "left", "right"] as SlotId[]) {
    if (resolveSlot(working, state, slot)) continue;
    const next = suggestDragons({ lineup: working, slot, state }).find(
      (s) => !exclude.has(s.dragon.id),
    );
    if (!next) continue;
    picks.push({ slot, dragon: next.dragon });
    exclude.add(next.dragon.id);
    working.slots[slot] = makePick(
      next.dragon.id,
      next.starRank,
      next.reignLevel,
    );
  }

  return picks;
}
