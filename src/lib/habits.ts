import { DRAGON_HABIT_SHORTS, DRAGON_HABITS } from "@/data/dragon-habits";
import type { Dragon } from "@/lib/types";

export const HABIT_UNLOCK_STARS = [2, 4, 6, 8, 10] as const;

export interface AbilityLine {
  title: string;
  body: string;
  ranks?: string[];
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
    });
  });
  const vanguard = vanguardBonus(dragon);
  if (vanguard && vanguard !== "Habits not recorded yet.") {
    extras.push({ title: "Vanguard", body: vanguard });
  }
  return { command: dragon.command, extras };
}
