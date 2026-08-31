import type { Dragon } from "@/lib/types";

/**
 * Catalog habits are two sentences: a self bonus that applies in
 * vanguard, then a 6-star ability that buffs a named flank.
 */
export function parseHabit(habit: string): {
  vanguardBonus: string;
  star6: string | null;
} {
  const trimmed = habit.trim();
  const match = trimmed.match(
    /^(.*?[.!])\s+(.+\b(?:Left|Right) Flank\.?)$/i,
  );
  if (match) {
    return { vanguardBonus: match[1].trim(), star6: match[2].trim() };
  }
  return { vanguardBonus: trimmed, star6: null };
}

export function vanguardBonus(dragon: Pick<Dragon, "habit">): string {
  return parseHabit(dragon.habit).vanguardBonus;
}

export function star6Ability(dragon: Pick<Dragon, "habit">): string | null {
  return parseHabit(dragon.habit).star6;
}
