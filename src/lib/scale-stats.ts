import { HUB_SCALING, HUB_STATS_BY_LEVEL, powerRarityKey } from "@/data/hub-source";
import { clampReign, clampStar } from "@/lib/lineup";
import type { Dragon, DragonStats, Rarity } from "@/lib/types";

const STAT_KEYS: (keyof DragonStats)[] = [
  "strength",
  "instinct",
  "intelligence",
  "initiative",
];

export const HUB_STAT_LEVEL_CAP = HUB_SCALING.troops.maxLevel;

function tableLookup(
  table: Record<string, number> | undefined,
  key: number,
): number {
  if (!table) return 0;
  return Number(table[String(key)] ?? 0);
}

export function hubLevel(reignLevel: number): number {
  return Math.min(HUB_STAT_LEVEL_CAP, clampReign(reignLevel));
}

export function scaledStats(
  dragon: Pick<Dragon, "id" | "rarity" | "stats">,
  starRank = 1,
  reignLevel = 1,
): DragonStats {
  const level = hubLevel(reignLevel);
  const stars = clampStar(starRank);
  const row = HUB_STATS_BY_LEVEL[dragon.id]?.[String(level)];
  const base: DragonStats = row ?? dragon.stats;
  const multipliers = HUB_SCALING.starStatMultipliers[dragon.rarity];
  const bonus = tableLookup(multipliers, stars);
  const next = { ...base };
  for (const key of STAT_KEYS) {
    next[key] = Math.round(base[key] * (1 + bonus));
  }
  return next;
}

export function troopCount(
  rarity: Rarity,
  starRank = 1,
  reignLevel = 1,
): number {
  const { basePerLevel, maxTroops, starBonus } = HUB_SCALING.troops;
  const level = hubLevel(reignLevel);
  const stars = clampStar(starRank);
  const bonus = tableLookup(starBonus[rarity], stars);
  return Math.min(
    maxTroops,
    Math.round(basePerLevel * level * (1 + bonus)),
  );
}

/** Star + reign power. Habit upgrade ranks are not stored in the pit. */
export function dragonPower(
  rarity: Rarity,
  starRank = 1,
  reignLevel = 1,
): number {
  const key = powerRarityKey(rarity);
  const level = hubLevel(reignLevel);
  const stars = clampStar(starRank);
  return (
    tableLookup(HUB_SCALING.power.stars[key], stars) +
    tableLookup(HUB_SCALING.power.levels[key], level)
  );
}

export function formatPower(value: number): string {
  return value.toLocaleString("en-US");
}
