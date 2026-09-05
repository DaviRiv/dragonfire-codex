import { DRAGON_HABIT_SHORTS, DRAGON_HABITS } from "@/data/dragon-habits";
import { DRAGONS } from "@/data/dragons";
import { HABIT_NAMES, habitDisplayName } from "@/data/habit-names";
import {
  insightsForDragon,
  type AbilityScaleRow,
} from "@/lib/ability-insight";
import {
  commandLine,
  HABIT_SLOT_COUNT,
  HABIT_UNLOCK_STARS,
  vanguardBonus,
} from "@/lib/habits";
import type { Dragon } from "@/lib/types";

export type CatalogSkill = {
  body: string;
  short: string;
  names: string[];
};

export type CatalogHabit = {
  habit: number;
  stars: number;
  officialName: string | null;
  title: string;
  body: string;
  short: string;
  names: string[];
  defines: string[];
  scale: AbilityScaleRow[];
  needsScreenshot: boolean;
};

export type DragonCatalog = {
  dragon: Dragon;
  namedCount: number;
  habitSlots: number;
  needsScreenshot: boolean;
  command: CatalogSkill;
  vanguard: CatalogSkill;
  habits: CatalogHabit[];
};

export function namedHabitCount(dragonId: string): number {
  const slots = HABIT_NAMES[dragonId] ?? [];
  return slots.filter((name) => Boolean(name?.trim())).length;
}

export function catalogFor(dragon: Dragon): DragonCatalog {
  const insights = insightsForDragon(dragon);
  const commandInsight = insights.find((item) => item.kind === "command");
  const vanguardInsight = insights.find((item) => item.kind === "vanguard");
  const habits: CatalogHabit[] = HABIT_UNLOCK_STARS.map((stars, index) => {
    const habit = index + 1;
    const insight = insights.find(
      (item) => item.kind === "habit" && item.habit === habit,
    );
    const official = habitDisplayName(dragon.id, habit) ?? null;
    const body =
      insight?.body ||
      DRAGON_HABITS[dragon.id]?.[index]?.level1?.trim() ||
      "";
    const short =
      DRAGON_HABIT_SHORTS[dragon.id]?.[index]?.level1?.trim() || "";
    return {
      habit,
      stars,
      officialName: official,
      title: official ?? insight?.title ?? `Habit ${habit}`,
      body,
      short,
      names: insight?.names ?? [],
      defines: insight?.defines ?? [],
      scale: insight?.scale ?? [],
      needsScreenshot: !official,
    };
  });
  const namedCount = habits.filter((row) => !row.needsScreenshot).length;
  return {
    dragon,
    namedCount,
    habitSlots: HABIT_SLOT_COUNT,
    needsScreenshot: namedCount < HABIT_SLOT_COUNT,
    command: {
      body: commandLine(dragon),
      short: dragon.commandShort?.trim() || "",
      names: commandInsight?.names ?? [],
    },
    vanguard: {
      body: vanguardBonus(dragon),
      short: dragon.habitShort?.trim() || "",
      names: vanguardInsight?.names ?? [],
    },
    habits,
  };
}

export function allCatalogs(): DragonCatalog[] {
  return DRAGONS.map(catalogFor).sort((a, b) => {
    if (a.needsScreenshot !== b.needsScreenshot) {
      return a.needsScreenshot ? -1 : 1;
    }
    if (a.namedCount !== b.namedCount) return a.namedCount - b.namedCount;
    return a.dragon.name.localeCompare(b.dragon.name);
  });
}

export function catalogCoverage(rows: DragonCatalog[] = allCatalogs()) {
  const dragons = rows.length;
  const named = rows.reduce((sum, row) => sum + row.namedCount, 0);
  const slots = dragons * HABIT_SLOT_COUNT;
  const complete = rows.filter((row) => !row.needsScreenshot).length;
  return { dragons, named, slots, complete };
}

export function catalogSnapshot(entry: DragonCatalog) {
  return {
    id: entry.dragon.id,
    name: entry.dragon.name,
    epithet: entry.dragon.epithet,
    rarity: entry.dragon.rarity,
    breed: entry.dragon.breed,
    affinities: entry.dragon.affinities,
    marchSpeed: entry.dragon.marchSpeed,
    flankBonus: entry.dragon.flankBonus,
    stats: entry.dragon.stats,
    tags: entry.dragon.tags,
    provides: entry.dragon.provides ?? [],
    needs: entry.dragon.needs ?? [],
    vanguard: entry.vanguard,
    command: entry.command,
    habits: entry.habits.map((habit) => ({
      habit: habit.habit,
      stars: habit.stars,
      officialName: habit.officialName,
      title: habit.title,
      body: habit.body,
      short: habit.short,
      names: habit.names,
      defines: habit.defines,
      scale: habit.scale,
      needsScreenshot: habit.needsScreenshot,
    })),
  };
}
