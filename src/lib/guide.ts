import { HUB_DRAGONS, HUB_SCALING } from "@/data/hub-source";
import { getCatalogDragon } from "@/data/dragons";
import { HABIT_RANK_MAX, HABIT_UNLOCK_STARS } from "@/lib/habits";
import { RARITIES, rarityLabels, statLabels, statShort } from "@/lib/labels";
import {
  HUB_STAT_LEVEL_CAP,
  dragonPower,
  scaledStats,
  troopCount,
} from "@/lib/scale-stats";
import { REIGN_MAX, STAR_MAX } from "@/lib/lineup";
import type { DragonStats, Rarity } from "@/lib/types";

/**
 * Everything the guide states about scaling is read out of the Hub tables at
 * build time. If the catalog is resynced the guide moves with it instead of
 * quietly going stale.
 */

export const GUIDE_SOURCE = HUB_SCALING.meta.source;
export const GUIDE_SOURCED_AT = HUB_SCALING.meta.sourcedAt;

export const TROOPS_PER_LEVEL = HUB_SCALING.troops.basePerLevel;
export const TROOPS_MAX = HUB_SCALING.troops.maxTroops;
export const LEVEL_CAP = HUB_STAT_LEVEL_CAP;

export const STAR_STEPS = Array.from({ length: STAR_MAX }, (_, i) => i + 1);

export type StatKey = keyof DragonStats;

/** Star rank → stat bonus, as a whole percent, per rarity. */
export function starStatBonusPct(rarity: Rarity, stars: number): number {
  const table = HUB_SCALING.starStatMultipliers[rarity];
  return Math.round(Number(table?.[String(stars)] ?? 0) * 100);
}

/** Star rank → troop bonus, as a whole percent, per rarity. */
export function starTroopBonusPct(rarity: Rarity, stars: number): number {
  const table = HUB_SCALING.troops.starBonus[rarity];
  return Math.round(Number(table?.[String(stars)] ?? 0) * 100);
}

export type RarityScaling = {
  rarity: Rarity;
  label: string;
  /** Stat bonus at max stars, e.g. 200 for "+200%". */
  maxStatBonusPct: number;
  maxTroopBonusPct: number;
  /** Hub power from stars alone, at 1★ and at max stars. */
  powerAtOneStar: number;
  powerAtMaxStar: number;
};

export const RARITY_SCALING: RarityScaling[] = RARITIES.map((rarity) => ({
  rarity,
  label: rarityLabels[rarity],
  maxStatBonusPct: starStatBonusPct(rarity, STAR_MAX),
  maxTroopBonusPct: starTroopBonusPct(rarity, STAR_MAX),
  powerAtOneStar: dragonPower(rarity, 1, 1),
  powerAtMaxStar: dragonPower(rarity, STAR_MAX, 1),
}));

/**
 * The lowest reign level that already hits the troop cap at this star rank.
 * Stars do not raise the cap; they let you reach it sooner.
 */
export function levelThatCapsTroops(
  rarity: Rarity,
  stars: number,
): number | null {
  for (let level = 1; level <= LEVEL_CAP; level++) {
    if (troopCount(rarity, stars, level) >= TROOPS_MAX) return level;
  }
  return null;
}

export type StatRow = {
  key: StatKey;
  label: string;
  short: string;
  base: number;
  grown: number;
};

export type WorkedExample = {
  id: string;
  name: string;
  rarity: Rarity;
  rarityLabel: string;
  fromStars: number;
  fromLevel: number;
  toStars: number;
  toLevel: number;
  stats: StatRow[];
  troopsBefore: number;
  troopsAfter: number;
  powerBefore: number;
  powerAfter: number;
  /** Multiple of the starting total across the four stats. */
  statMultiple: number;
};

const STAT_ORDER: StatKey[] = [
  "strength",
  "instinct",
  "intelligence",
  "initiative",
];

/**
 * One real dragon taken from 1★ level 1 to max stars and the level cap, so the
 * guide can show the size of the gap instead of asserting it.
 */
export function workedExample(dragonId: string): WorkedExample | null {
  const dragon = getCatalogDragon(dragonId);
  if (!dragon) return null;
  const fromStars = 1;
  const fromLevel = 1;
  const toStars = STAR_MAX;
  const toLevel = LEVEL_CAP;
  const before = scaledStats(dragon, fromStars, fromLevel);
  const after = scaledStats(dragon, toStars, toLevel);
  const sum = (s: DragonStats) =>
    STAT_ORDER.reduce((total, key) => total + s[key], 0);
  return {
    id: dragon.id,
    name: dragon.name,
    rarity: dragon.rarity,
    rarityLabel: rarityLabels[dragon.rarity],
    fromStars,
    fromLevel,
    toStars,
    toLevel,
    stats: STAT_ORDER.map((key) => ({
      key,
      label: statLabels[key],
      short: statShort[key],
      base: before[key],
      grown: after[key],
    })),
    troopsBefore: troopCount(dragon.rarity, fromStars, fromLevel),
    troopsAfter: troopCount(dragon.rarity, toStars, toLevel),
    powerBefore: dragonPower(dragon.rarity, fromStars, fromLevel),
    powerAfter: dragonPower(dragon.rarity, toStars, toLevel),
    statMultiple:
      Math.round((sum(after) / Math.max(1, sum(before))) * 10) / 10,
  };
}

export type KitSlot =
  | { kind: "vanguard" }
  | { kind: "command" }
  /** `habit` is the 1-based slot as the game numbers them, `rank` is 1–5. */
  | { kind: "habit"; habit: number; rank?: number };

export type KitLine = { who: string; text: string };

/**
 * Pulls a real ability line out of the catalog so the guide quotes the game
 * rather than a copy of it. Hardcoding these once meant a Command lost its
 * third sentence, and a resync could have silently changed the rest.
 */
export function kitLine(dragonId: string, slot: KitSlot): KitLine | null {
  const raw = HUB_DRAGONS.find((dragon) => dragon.id === dragonId);
  if (!raw) return null;
  if (slot.kind === "vanguard") {
    if (!raw.vanguardSkill?.trim()) return null;
    return { who: `${raw.name} · Vanguard skill`, text: raw.vanguardSkill };
  }
  if (slot.kind === "command") {
    if (!raw.commandSkill?.trim()) return null;
    return { who: `${raw.name} · Command`, text: raw.commandSkill };
  }
  const entry = raw.habitsData?.[slot.habit - 1];
  if (!entry) return null;
  const rank = slot.rank ?? HABIT_RANK_MAX;
  const text = entry[`level${rank}` as keyof typeof entry];
  if (!text?.trim()) return null;
  return {
    who: `${raw.name} · Habit ${slot.habit}, rank ${rank}`,
    text,
  };
}

export const HABIT_GATES = [...HABIT_UNLOCK_STARS];
export const HABIT_SLOTS = HABIT_UNLOCK_STARS.length;
export const HABIT_RANKS = HABIT_RANK_MAX;
export const MAX_STARS = STAR_MAX;
export const MAX_REIGN = REIGN_MAX;

export type GuideSectionMeta = { id: string; title: string };

/** Drives both the jump list and the section headings, so they cannot drift. */
export const GUIDE_SECTIONS: GuideSectionMeta[] = [
  { id: "line", title: "A line is three dragons" },
  { id: "stats", title: "The four stats, and what they do" },
  { id: "damage", title: "Damage, and damage mitigation" },
  { id: "keywords", title: "Every keyword, in plain words" },
  { id: "stars", title: "Star rank: the biggest multiplier you control" },
  { id: "reign", title: "Reign level, troops, and the level cap" },
  { id: "numbers", title: "What growth is actually worth" },
  { id: "habits", title: "Habits: five slots you still have to buy" },
  { id: "jobs", title: "The four jobs a line needs" },
  { id: "troops", title: "Troop types and the tile triangle" },
  { id: "modes", title: "Modes want different lines" },
  { id: "breeds", title: "Rarity and breed" },
  { id: "plan", title: "What to do first" },
  { id: "limits", title: "What this site does not know" },
];
