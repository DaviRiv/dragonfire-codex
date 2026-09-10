import { DRAGON_HABIT_SHORTS, DRAGON_HABITS } from "@/data/dragon-habits";
import { formatRoundTimingSentences } from "@/lib/ability-copy";
import { qualifiesForStars } from "@/lib/stars";
import type { Dragon, GatedAbility, LineupKind } from "@/lib/types";

export const HABIT_UNLOCK_STARS = [2, 4, 6, 8, 10] as const;
export const HABIT_SLOT_COUNT = HABIT_UNLOCK_STARS.length;
export const HABIT_RANK_MAX = 5;

/** Habit 1–5 → 2 / 4 / 6 / 8 / 10★. Invalid numbers return null. */
export function starsForHabit(habit: number): number | null {
  if (!Number.isInteger(habit) || habit < 1 || habit > HABIT_SLOT_COUNT) {
    return null;
  }
  return HABIT_UNLOCK_STARS[habit - 1] ?? null;
}

/** 2 / 4 / 6 / 8 / 10★ → habit 1–5. Command / other gates return null. */
export function habitNumberForUnlockStars(
  stars: number | null | undefined,
): number | null {
  if (stars == null) return null;
  const index = HABIT_UNLOCK_STARS.indexOf(
    stars as (typeof HABIT_UNLOCK_STARS)[number],
  );
  return index >= 0 ? index + 1 : null;
}

export function sanitizeHabits(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const next = new Set<number>();
  for (const item of raw) {
    const n = typeof item === "number" ? item : Number(item);
    if (Number.isInteger(n) && n >= 1 && n <= HABIT_SLOT_COUNT) next.add(n);
  }
  return [...next].sort((a, b) => a - b);
}

/** Habits whose star gate is already open at this rank. */
export function defaultHabits(starRank: number): number[] {
  const rank = Math.max(0, starRank);
  return HABIT_UNLOCK_STARS.flatMap((stars, index) =>
    rank >= stars ? [index + 1] : [],
  );
}

/** Old saves with no `habits` field keep star-inferred ownership. */
export function normalizeHabits(raw: unknown, starRank: number): number[] {
  if (!Array.isArray(raw)) return defaultHabits(starRank);
  return sanitizeHabits(raw);
}

export function clampHabitRank(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n)) return 1;
  return Math.min(HABIT_RANK_MAX, Math.max(1, n));
}

export function defaultHabitRanks(): number[] {
  return Array.from({ length: HABIT_SLOT_COUNT }, () => 1);
}

/** Old saves with no `habitRanks` stay on rank 1 percents. */
export function normalizeHabitRanks(raw: unknown): number[] {
  const ranks = defaultHabitRanks();
  if (!Array.isArray(raw)) return ranks;
  for (let i = 0; i < HABIT_SLOT_COUNT; i++) {
    if (raw[i] !== undefined && raw[i] !== null) {
      ranks[i] = clampHabitRank(raw[i]);
    }
  }
  return ranks;
}

/** Habit 1–5 → stored upgrade rank 1–5. */
export function habitRankOf(
  ranks: number[] | null | undefined,
  habit: number,
): number {
  if (habit < 1 || habit > HABIT_SLOT_COUNT) return 1;
  return clampHabitRank(ranks?.[habit - 1]);
}

export function setHabitRankAt(
  ranks: number[] | null | undefined,
  habit: number,
  rank: number,
): number[] {
  const next = normalizeHabitRanks(ranks);
  if (habit < 1 || habit > HABIT_SLOT_COUNT) return next;
  next[habit - 1] = clampHabitRank(rank);
  return next;
}

/** Upgrade ranks are per slot; Theory still uses them when the dragon is owned. */
export function liveOwnedHabitRanks(
  owned: { habitRanks?: number[] } | null | undefined,
): number[] {
  return normalizeHabitRanks(owned?.habitRanks);
}

/** Starring sets habits to whatever those stars unlock. */
export function habitsAfterStarChange(
  prevHabits: number[],
  prevStars: number,
  nextStars: number,
): number[] {
  const unlocked = defaultHabits(nextStars);
  const alreadyOffered = defaultHabits(prevStars);
  const kept = sanitizeHabits(prevHabits);
  // A habit the player has already answered for keeps their answer, so
  // unchecking one they have not bought survives a star change. Habits the
  // new rank unlocks for the first time arrive selected.
  return unlocked.filter(
    (habit) => !alreadyOffered.includes(habit) || kept.includes(habit),
  );
}

export function maxStarsForHabits(habits: number[]): number {
  let max = 1;
  for (const habit of sanitizeHabits(habits)) {
    const gate = starsForHabit(habit);
    if (gate != null && gate > max) max = gate;
  }
  return max;
}

export function habitIsSelected(
  habits: number[] | null | undefined,
  habit: number,
): boolean {
  if (habits == null) return true;
  return habits.includes(habit);
}

/** Pit uses the bought list. Theory and catalog ignore it (star gates only). */
export function liveOwnedHabits(
  owned: { habits?: number[] } | null | undefined,
  kind: LineupKind,
): number[] | null {
  if (kind === "theory") return null;
  return owned?.habits ?? null;
}

export interface AbilityLine {
  title: string;
  body: string;
  ranks?: string[];
  unlockStars?: number;
}

function habitLevelText(
  table: typeof DRAGON_HABITS,
  dragonId: string,
  index: number,
  rank = 1,
): string {
  const habit = table[dragonId]?.[index];
  if (!habit) return "";
  const keys = [
    "level1",
    "level2",
    "level3",
    "level4",
    "level5",
  ] as const;
  const key = keys[clampHabitRank(rank) - 1];
  return (habit[key] ?? habit.level1).trim();
}

/** Full Hub text, or the card-sized short when `compact` is true. */
export function habitText(
  dragonId: string,
  index: number,
  rank = 1,
  compact = false,
): string {
  if (compact) {
    const short = habitLevelText(DRAGON_HABIT_SHORTS, dragonId, index, rank);
    if (short) return formatRoundTimingSentences(short);
  }
  const body = habitLevelText(DRAGON_HABITS, dragonId, index, rank);
  return body ? formatRoundTimingSentences(body) : "Not recorded yet.";
}

export function habitPreview(
  dragonId: string,
  index: number,
  rank = 1,
): string {
  return habitText(dragonId, index, rank, true);
}

export type KitHabitRow = {
  habit: number;
  stars: number;
  rank: number;
  body: string;
  live: boolean;
  selected: boolean;
};

export type KitEffect = {
  ability: string;
  unlockStars: number | null;
  live: boolean;
};

export type KitStarGroup = {
  stars: number;
  habits: KitHabitRow[];
  effects: string[];
};

export type KitProgress = {
  owned: boolean;
  starRank: number;
  command: string;
  vanguard: string;
  habits: KitHabitRow[];
  liveHabits: KitHabitRow[];
  nextHabits: KitHabitRow[];
  liveEffects: KitEffect[];
  nextUnlocks: KitStarGroup[];
};

/** Command, vanguard, live habits, and what higher stars still open. */
export function kitProgress(
  dragon: Dragon,
  starRank: number,
  selectedHabits: number[] | null | undefined,
  habitRanks?: number[] | null,
): KitProgress {
  const owned = starRank > 0;
  const selected =
    selectedHabits === undefined
      ? [1, 2, 3, 4, 5]
      : sanitizeHabits(selectedHabits);
  const ranks = normalizeHabitRanks(habitRanks);
  const habits: KitHabitRow[] = HABIT_UNLOCK_STARS.map((stars, index) => {
    const habit = index + 1;
    const on = selected.includes(habit);
    const open = owned && starRank >= stars;
    const rank = habitRankOf(ranks, habit);
    return {
      habit,
      stars,
      rank,
      body: habitPreview(dragon.id, index, rank),
      live: open && on,
      selected: on,
    };
  });
  const effects: KitEffect[] = (dragon.provides ?? []).map(
    (gate: GatedAbility) => {
      const n = habitNumberForUnlockStars(gate.unlockStars);
      const bought = n == null || selected.includes(n);
      const live =
        owned && qualifiesForStars(gate.unlockStars, starRank) && bought;
      return {
        ability: gate.ability,
        unlockStars: gate.unlockStars,
        live,
      };
    },
  );
  const nextByStar = new Map<number, KitStarGroup>();
  for (const habit of habits) {
    if (habit.live) continue;
    if (owned && starRank >= habit.stars) continue;
    const group = nextByStar.get(habit.stars) ?? {
      stars: habit.stars,
      habits: [],
      effects: [],
    };
    group.habits.push(habit);
    nextByStar.set(habit.stars, group);
  }
  for (const effect of effects) {
    if (effect.live || effect.unlockStars == null) continue;
    if (owned && starRank >= effect.unlockStars) continue;
    const group = nextByStar.get(effect.unlockStars) ?? {
      stars: effect.unlockStars,
      habits: [],
      effects: [],
    };
    if (!group.effects.includes(effect.ability)) {
      group.effects.push(effect.ability);
    }
    nextByStar.set(effect.unlockStars, group);
  }
  return {
    owned,
    starRank,
    command: commandLine(dragon, true),
    vanguard: vanguardBonus(dragon, true),
    habits,
    liveHabits: habits.filter((row) => row.live),
    nextHabits: habits.filter((row) => !row.live),
    liveEffects: effects.filter((effect) => effect.live),
    nextUnlocks: [...nextByStar.values()].sort((a, b) => a.stars - b.stars),
  };
}

/** Self + flank text stored on each dragon — the in-game vanguard skill. */
export function vanguardBonus(
  dragon: Pick<Dragon, "habit" | "habitShort">,
  compact = false,
): string {
  if (compact) {
    const short = dragon.habitShort?.trim();
    if (short) return formatRoundTimingSentences(short);
  }
  return formatRoundTimingSentences(dragon.habit.trim());
}

export function commandLine(
  dragon: Pick<Dragon, "command" | "commandShort">,
  compact = false,
): string {
  if (compact) {
    const short = dragon.commandShort?.trim();
    if (short) return formatRoundTimingSentences(short);
  }
  return formatRoundTimingSentences(dragon.command.trim());
}

export function star6Ability(
  dragon: Pick<Dragon, "id">,
  compact = false,
  rank = 1,
): string | null {
  const text = habitText(dragon.id, 2, rank, compact);
  return !text || text === "Not recorded yet." ? null : text;
}

function rankList(dragonId: string, index: number): string[] | undefined {
  const habit = DRAGON_HABITS[dragonId]?.[index];
  if (!habit) return undefined;
  const ranks = [1, 2, 3, 4, 5].map((rank) =>
    habitLevelText(DRAGON_HABITS, dragonId, index, rank),
  );
  const unique = new Set(ranks);
  if (unique.size <= 1) return undefined;
  return ranks;
}

/** Rank 1–5 text when a habit actually changes by upgrade. */
export function habitRankTexts(
  dragonId: string,
  index: number,
): string[] | undefined {
  return rankList(dragonId, index);
}

/** Command plus star-unlocked habits and the vanguard skill. */
export function dragonKit(
  dragon: Pick<Dragon, "id" | "habit" | "habitShort" | "command">,
  habitRanks?: number[] | null,
): {
  command: string;
  extras: AbilityLine[];
} {
  const extras: AbilityLine[] = [];
  const habits = DRAGON_HABITS[dragon.id] ?? [];
  habits.forEach((_habit, index) => {
    const rank = habitRankOf(habitRanks, index + 1);
    const body = habitLevelText(DRAGON_HABITS, dragon.id, index, rank);
    if (!body) return;
    const star = HABIT_UNLOCK_STARS[index];
    extras.push({
      title: `Habit ${index + 1} · ${star}★`,
      body: formatRoundTimingSentences(body),
      ranks: rankList(dragon.id, index),
      unlockStars: star,
    });
  });
  const vanguard = vanguardBonus(dragon);
  if (vanguard && vanguard !== "Habits not recorded yet.") {
    extras.push({ title: "Vanguard", body: vanguard });
  }
  return { command: dragon.command, extras };
}
