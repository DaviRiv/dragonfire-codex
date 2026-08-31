import { DRAGON_HABITS } from "@/data/dragon-habits";
import type { Dragon } from "@/lib/types";

export const HABIT_UNLOCK_STARS = [2, 4, 6, 8, 10] as const;

export interface AbilityLine {
  title: string;
  body: string;
}

/** Self + flank text stored on each dragon — the in-game vanguard skill. */
export function vanguardBonus(dragon: Pick<Dragon, "habit">): string {
  return dragon.habit.trim();
}

export function star6Ability(dragon: Pick<Dragon, "id">): string | null {
  const text = DRAGON_HABITS[dragon.id]?.[2]?.trim();
  return text || null;
}

/** Command plus star-unlocked habits and the vanguard skill. */
export function dragonKit(dragon: Pick<Dragon, "id" | "habit" | "command">): {
  command: string;
  extras: AbilityLine[];
} {
  const extras: AbilityLine[] = [];
  const habits = DRAGON_HABITS[dragon.id] ?? [];
  habits.forEach((text, index) => {
    const body = text.trim();
    if (!body) return;
    const star = HABIT_UNLOCK_STARS[index];
    extras.push({
      title:
        star === 6
          ? `(6+ stars) · Habit ${index + 1}`
          : `Habit ${index + 1} · ${star}★`,
      body,
    });
  });
  const vanguard = vanguardBonus(dragon);
  if (vanguard && vanguard !== "Habits not recorded yet.") {
    extras.push({ title: "Vanguard", body: vanguard });
  }
  return { command: dragon.command, extras };
}
