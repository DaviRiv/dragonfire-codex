import { DRAGON_HABIT_SHORTS, DRAGON_HABITS } from "@/data/dragon-habits";
import { DRAGONS } from "@/data/dragons";
import { HABIT_NAMES, habitDisplayName } from "@/data/habit-names";
import {
  findAbilityInsight,
  insightsForDragon,
  type AbilityGloss,
  type AbilityScaleRow,
} from "@/lib/ability-insight";
import {
  commandLine,
  HABIT_SLOT_COUNT,
  HABIT_UNLOCK_STARS,
  vanguardBonus,
} from "@/lib/habits";
import { polarityForName } from "@/lib/status-polarity";
import type { Dragon } from "@/lib/types";

export type CatalogSkill = {
  body: string;
  short: string;
  names: string[];
  glosses: AbilityGloss[];
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
  glosses: AbilityGloss[];
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
  buffs: AbilityGloss[];
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
      glosses: insight?.glosses ?? [],
      scale: insight?.scale ?? [],
      needsScreenshot: !official,
    };
  });
  const namedCount = habits.filter((row) => !row.needsScreenshot).length;
  const buffs = uniqueBuffs(insights, dragon);
  return {
    dragon,
    namedCount,
    habitSlots: HABIT_SLOT_COUNT,
    needsScreenshot: namedCount < HABIT_SLOT_COUNT,
    command: {
      body: commandLine(dragon),
      short: dragon.commandShort?.trim() || "",
      names: commandInsight?.names ?? [],
      glosses: commandInsight?.glosses ?? [],
    },
    vanguard: {
      body: vanguardBonus(dragon),
      short: dragon.habitShort?.trim() || "",
      names: vanguardInsight?.names ?? [],
      glosses: vanguardInsight?.glosses ?? [],
    },
    habits,
    buffs,
  };
}

function uniqueBuffs(
  insights: ReturnType<typeof insightsForDragon>,
  dragon: Dragon,
): AbilityGloss[] {
  const byKey = new Map<string, AbilityGloss>();
  const keyOf = (value: string) =>
    value.replace(/[’']/g, "'").trim().toLowerCase();
  for (const insight of insights) {
    if (insight.kind !== "buff") continue;
    byKey.set(keyOf(insight.title), {
      name: insight.title,
      body: insight.body,
      polarity: insight.polarity ?? polarityForName(insight.title, insight.body),
      unlockStars: insight.unlockStars,
    });
  }
  for (const gate of dragon.provides ?? []) {
    const key = keyOf(gate.ability);
    if (!key || byKey.has(key)) continue;
    const named = findAbilityInsight(gate.ability, { dragonId: dragon.id });
    if (!named || named.kind !== "buff" || keyOf(named.title) !== key) continue;
    byKey.set(key, {
      name: named.title,
      body: named.body,
      polarity: named.polarity ?? polarityForName(named.title, named.body),
      unlockStars: gate.unlockStars,
    });
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
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
    buffs: entry.buffs,
    habits: entry.habits.map((habit) => ({
      habit: habit.habit,
      stars: habit.stars,
      officialName: habit.officialName,
      title: habit.title,
      body: habit.body,
      short: habit.short,
      names: habit.names,
      defines: habit.defines,
      glosses: habit.glosses,
      scale: habit.scale,
      needsScreenshot: habit.needsScreenshot,
    })),
  };
}
