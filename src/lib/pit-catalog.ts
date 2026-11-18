import { dragonDamageKinds } from "@/lib/dragon-display";
import { rarityLabels } from "@/lib/labels";
import { dragonPower, scaledStats } from "@/lib/scale-stats";
import type { Dragon, OwnedDragon, Rarity } from "@/lib/types";

export type PitSortKey =
  | "name"
  | "stars"
  | "reign"
  | "power"
  | "strength"
  | "instinct"
  | "intelligence"
  | "initiative"
  | "rarity";

export type DamageKindFilter =
  | "all"
  | "physical"
  | "tactical"
  | "fire"
  | "recovery";

const DAMAGE_TAG: Record<Exclude<DamageKindFilter, "all">, string> = {
  physical: "Physical Damage",
  tactical: "Tactical Damage",
  fire: "Fire Damage",
  recovery: "Recovery",
};

const RARITY_RANK: Record<Rarity, number> = {
  legendary: 3,
  epic: 2,
  rare: 1,
};

export function pitInspectStarRank(owned: OwnedDragon | undefined): number {
  const stars = owned?.starRank ?? 0;
  return stars > 0 ? stars : 1;
}

export function pitInspectReign(owned: OwnedDragon | undefined): number {
  return owned?.reignLevel ?? 1;
}

export function dragonMatchesDamage(
  dragon: Pick<Dragon, "tags">,
  filter: DamageKindFilter,
): boolean {
  if (filter === "all") return true;
  const tag = DAMAGE_TAG[filter];
  return dragon.tags.includes(tag);
}

export function dragonMatchesMinStars(
  stars: number,
  minStars: number,
  ownership: "all" | "owned" | "missing",
): boolean {
  if (minStars <= 0) return true;
  if (ownership === "missing") return false;
  return stars >= minStars;
}

export function dragonMatchesMinReign(
  reign: number,
  minReign: number,
  owned: boolean,
): boolean {
  if (minReign <= 1) return true;
  if (!owned) return false;
  return reign >= minReign;
}

function sortValue(
  dragon: Dragon,
  owned: OwnedDragon | undefined,
  key: PitSortKey,
): number | string {
  const stars = owned?.starRank ?? 0;
  const reign = owned?.reignLevel ?? 1;
  const rankStars = pitInspectStarRank(owned);
  const stats = scaledStats(dragon, rankStars, reign);
  switch (key) {
    case "name":
      return dragon.name.toLowerCase();
    case "stars":
      return stars;
    case "reign":
      return owned ? reign : -1;
    case "power":
      return dragonPower(dragon.rarity, rankStars, reign);
    case "strength":
      return stats.strength;
    case "instinct":
      return stats.instinct;
    case "intelligence":
      return stats.intelligence;
    case "initiative":
      return stats.initiative;
    case "rarity":
      return RARITY_RANK[dragon.rarity];
    default:
      return dragon.name;
  }
}

export function sortPitDragons(
  dragons: Dragon[],
  ownedById: Map<string, OwnedDragon>,
  key: PitSortKey,
  direction: "asc" | "desc" = "desc",
): Dragon[] {
  const out = [...dragons];
  const sign = direction === "asc" ? 1 : -1;
  out.sort((a, b) => {
    const va = sortValue(a, ownedById.get(a.id), key);
    const vb = sortValue(b, ownedById.get(b.id), key);
    if (typeof va === "string" && typeof vb === "string") {
      return va.localeCompare(vb) * sign;
    }
    return (Number(va) - Number(vb)) * sign;
  });
  return out;
}

export function damageFilterOptions(): {
  id: DamageKindFilter;
  label: string;
}[] {
  return [
    { id: "all", label: "Any damage" },
    { id: "physical", label: "Physical" },
    { id: "tactical", label: "Tactical" },
    { id: "fire", label: "Fire" },
    { id: "recovery", label: "Recovery" },
  ];
}

export function sortOptions(): { id: PitSortKey; label: string }[] {
  return [
    { id: "name", label: "Name" },
    { id: "stars", label: "Star rank" },
    { id: "reign", label: "Reign level" },
    { id: "power", label: "Hub power" },
    { id: "strength", label: "Strength" },
    { id: "instinct", label: "Instinct" },
    { id: "intelligence", label: "Intelligence" },
    { id: "initiative", label: "Initiative" },
    { id: "rarity", label: "Rarity" },
  ];
}

/** Labels shown on cards — damage kinds separate from breed (type). */
export function damageSummary(dragon: Pick<Dragon, "tags">): string {
  const kinds = dragonDamageKinds(dragon);
  if (kinds.length === 0) return "—";
  return kinds.map((k) => k.label).join(" · ");
}

export function raritySummary(rarity: Rarity): string {
  return rarityLabels[rarity];
}