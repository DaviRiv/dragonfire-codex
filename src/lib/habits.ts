import { DRAGON_HABIT_SHORTS, DRAGON_HABITS } from "@/data/dragon-habits";
import type { Dragon, LineupKind } from "@/lib/types";

export const HABIT_UNLOCK_STARS = [2, 4, 6, 8, 10] as const;
export const HABIT_SLOT_COUNT = HABIT_UNLOCK_STARS.length;

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

/**
 * Starring up adds newly unlocked habits without restoring ones you
 * unchecked. Starring down drops habits whose gate is now closed; you can
 * still check those later as goals.
 */
export function habitsAfterStarChange(
  prevHabits: number[],
  prevStars: number,
  nextStars: number,
): number[] {
  const nextUnlocked = defaultHabits(nextStars);
  const newlyUnlocked = nextUnlocked.filter(
    (habit) => !defaultHabits(prevStars).includes(habit),
  );
  const kept = sanitizeHabits(prevHabits).filter((habit) => {
    const gate = starsForHabit(habit);
    return gate != null && gate <= nextStars;
  });
  return sanitizeHabits([...kept, ...newlyUnlocked]);
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

function habitRank(
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
  const key = keys[Math.min(5, Math.max(1, rank)) - 1];
  return (habit[key] ?? habit.level1).trim();
}

export function habitPreview(dragonId: string, index: number): string {
  const short = DRAGON_HABIT_SHORTS[dragonId]?.[index]?.level1?.trim();
  if (short) return short;
  return DRAGON_HABITS[dragonId]?.[index]?.level1?.trim() || "Not recorded yet.";
}

/** Self + flank text stored on each dragon — the in-game vanguard skill. */
export function vanguardBonus(
  dragon: Pick<Dragon, "habit" | "habitShort">,
  compact = false,
): string {
  if (compact) {
    const short = dragon.habitShort?.trim();
    if (short) return short;
  }
  return dragon.habit.trim();
}

export function commandLine(
  dragon: Pick<Dragon, "command" | "commandShort">,
  compact = false,
): string {
  if (compact) {
    const short = dragon.commandShort?.trim();
    if (short) return short;
  }
  return dragon.command.trim();
}

export function star6Ability(
  dragon: Pick<Dragon, "id">,
  compact = false,
): string | null {
  if (compact) {
    const short = habitRank(DRAGON_HABIT_SHORTS, dragon.id, 2);
    if (short) return short;
  }
  const text = habitRank(DRAGON_HABITS, dragon.id, 2);
  return text || null;
}

function rankList(dragonId: string, index: number): string[] | undefined {
  const habit = DRAGON_HABITS[dragonId]?.[index];
  if (!habit) return undefined;
  const ranks = [1, 2, 3, 4, 5].map((rank) => habitRank(DRAGON_HABITS, dragonId, index, rank));
  const unique = new Set(ranks);
  if (unique.size <= 1) return undefined;
  return ranks;
}

/** Command plus star-unlocked habits and the vanguard skill. */
export function dragonKit(
  dragon: Pick<Dragon, "id" | "habit" | "habitShort" | "command">,
): {
  command: string;
  extras: AbilityLine[];
} {
  const extras: AbilityLine[] = [];
  const habits = DRAGON_HABITS[dragon.id] ?? [];
  habits.forEach((habit, index) => {
    const body = habit.level1.trim();
    if (!body) return;
    const star = HABIT_UNLOCK_STARS[index];
    extras.push({
      title: `Habit ${index + 1} · ${star}★`,
      body,
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
