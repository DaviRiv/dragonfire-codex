import type { Dragon } from "@/lib/types";

export function parseHabit(habit: string): { base: string; star6: string | null } {
  const trimmed = habit.trim();
  const match = trimmed.match(
    /^(.*?[.!])\s+(.+\b(?:Left|Right) Flank\.?)$/i,
  );
  if (match) {
    return { base: match[1].trim(), star6: match[2].trim() };
  }
  return { base: trimmed, star6: null };
}

export function baseHabit(dragon: Pick<Dragon, "habit">): string {
  return parseHabit(dragon.habit).base;
}

export function star6Ability(dragon: Pick<Dragon, "habit">): string | null {
  return parseHabit(dragon.habit).star6;
}
