import catalogFile from "@/data/hub/catalog.json";
import scalingFile from "@/data/hub/scaling.json";
import statsFile from "@/data/hub/stats-by-level.json";
import type { DragonStats, Rarity } from "@/lib/types";

export type HabitRankKey =
  | "level1"
  | "level2"
  | "level3"
  | "level4"
  | "level5";

export type HabitRanks = Record<HabitRankKey, string>;

export interface HubNeed {
  ability: string;
  habit?: number;
}

export interface HubProvide {
  ability: string;
  habit?: number;
}

export interface HubDragon {
  id: string;
  name: string;
  released: boolean;
  rarity: string;
  type: string;
  troopAffinity: string[];
  stats: DragonStats & { marchSpeed: string };
  vanguardSkill: string;
  vanguardSkillShort: string;
  buffVanguard: string;
  buffFlank: string;
  buffFlankPosition: string;
  commandSkill: string;
  commandSkillShort: string;
  habitsData: HabitRanks[];
  habitsShortData: HabitRanks[];
  provides: { ability: HubProvide[]; boost: HubProvide[] };
  needs: HubNeed[];
}

type NumberTable = Record<string, number>;

export interface HubScaling {
  meta: {
    source: string;
    sourcedAt: string;
    dragonCount: number;
    releasedCount: number;
  };
  troops: {
    basePerLevel: number;
    maxLevel: number;
    maxTroops: number;
    starBonus: Record<Rarity, NumberTable>;
  };
  starStatMultipliers: { description: string } & Record<Rarity, NumberTable>;
  power: {
    stars: Record<"rare" | "epic" | "legend", NumberTable>;
    levels: Record<"rare" | "epic" | "legend", NumberTable>;
  };
}

export const HUB_META = catalogFile.meta;
export const HUB_DRAGONS = catalogFile.dragons as HubDragon[];
export const HUB_STATS_BY_LEVEL = statsFile as Record<
  string,
  Record<string, DragonStats>
>;
export const HUB_SCALING = scalingFile as HubScaling;

export function powerRarityKey(
  rarity: Rarity,
): "rare" | "epic" | "legend" {
  return rarity === "legendary" ? "legend" : rarity;
}
