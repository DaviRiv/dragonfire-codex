import { allDragons, findDragon } from "@/lib/dragons";
import { breedLabels, slotLabels, troopLabels } from "@/lib/labels";
import type { Dragon, Lineup, OwnedDragon, PitState, SlotId } from "@/lib/types";

export interface DragonSuggestion {
  dragon: Dragon;
  owned: OwnedDragon | null;
  score: number;
  reasons: string[];
}

function slottedCatalogIds(lineup: Lineup, state: PitState): Set<string> {
  const ids = new Set<string>();
  (["left", "vanguard", "right"] as SlotId[]).forEach((slot) => {
    const ownedId = lineup.slots[slot];
    if (!ownedId) return;
    const owned = state.owned.find((o) => o.id === ownedId);
    if (owned) ids.add(owned.dragonId);
  });
  return ids;
}

function placedBreeds(lineup: Lineup, state: PitState): Set<string> {
  const breeds = new Set<string>();
  (["left", "vanguard", "right"] as SlotId[]).forEach((slot) => {
    const ownedId = lineup.slots[slot];
    if (!ownedId) return;
    const owned = state.owned.find((o) => o.id === ownedId);
    const dragon = owned
      ? findDragon(owned.dragonId, state.customDragons)
      : undefined;
    if (dragon) breeds.add(dragon.breed);
  });
  return breeds;
}

function scoreDragon(
  dragon: Dragon,
  owned: OwnedDragon | null,
  lineup: Lineup,
  slot: SlotId,
  takenBreeds: Set<string>,
): DragonSuggestion {
  let score = 0;
  const reasons: string[] = [];
  const troopName = troopLabels[lineup.troop];

  if (dragon.affinities.includes(lineup.troop)) {
    score += 40;
    reasons.push(`Matches ${troopName}`);
  }

  if (owned) {
    score += 14;
    reasons.push("In your pit");
  }

  if (slot === "vanguard") {
    if (dragon.tags.includes("Taunt")) {
      score += 28;
      reasons.push("Taunt soak");
    }
    if (dragon.breed === "warrior") {
      score += 10;
      reasons.push("Front-line warrior");
    }
  }

  if (slot === "left") {
    if (dragon.flankBonus === "right") {
      score += 16;
      reasons.push("Buffs the right from here");
    }
    if (dragon.breed === "sentinel") {
      score += 8;
      reasons.push("Support on the left");
    }
  }

  if (slot === "right") {
    if (dragon.flankBonus === "left") {
      score += 16;
      reasons.push("Buffs the left from here");
    }
    if (dragon.breed === "hunter") {
      score += 8;
      reasons.push("Hunter pressure");
    }
  }

  if (dragon.flankBonus === slot) {
    score -= 6;
  } else if (slot !== "vanguard") {
    if (dragon.flankBonus === "left" && slot === "right") {
      score += 4;
    }
    if (dragon.flankBonus === "right" && slot === "left") {
      score += 4;
    }
  }

  if (!takenBreeds.has(dragon.breed)) {
    score += 10;
    reasons.push(`Adds ${breedLabels[dragon.breed]}`);
  }

  if (
    dragon.tags.includes("Recovery") &&
    lineup.mode === "pve"
  ) {
    score += 8;
    reasons.push("Recovery for PvE");
  }

  if (reasons.length === 0) {
    reasons.push(`For ${slotLabels[slot]}`);
  }

  return { dragon, owned, score, reasons: reasons.slice(0, 2) };
}

export function suggestDragons({
  lineup,
  slot,
  state,
  query = "",
  includeSlotted = false,
}: {
  lineup: Lineup;
  slot: SlotId;
  state: PitState;
  query?: string;
  includeSlotted?: boolean;
}): DragonSuggestion[] {
  const used = slottedCatalogIds(lineup, state);
  const breeds = placedBreeds(lineup, state);
  const q = query.trim().toLowerCase();
  const ownedByCatalog = new Map(
    state.owned.map((o) => [o.dragonId, o] as const),
  );

  return allDragons(state.customDragons)
    .filter((dragon) => {
      if (!includeSlotted && used.has(dragon.id)) return false;
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
        breeds,
      ),
    )
    .sort((a, b) => b.score - a.score || a.dragon.name.localeCompare(b.dragon.name));
}

export function suggestFullLine(
  lineup: Lineup,
  state: PitState,
): { slot: SlotId; dragon: Dragon }[] {
  const picks: { slot: SlotId; dragon: Dragon }[] = [];
  const exclude = slottedCatalogIds(lineup, state);

  (["vanguard", "left", "right"] as SlotId[]).forEach((slot) => {
    if (lineup.slots[slot]) return;
    const next = suggestDragons({ lineup, slot, state }).find(
      (s) => !exclude.has(s.dragon.id),
    );
    if (!next) return;
    picks.push({ slot, dragon: next.dragon });
    exclude.add(next.dragon.id);
  });

  return picks;
}
