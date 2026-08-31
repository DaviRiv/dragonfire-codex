import { STAR6_ABILITIES } from "@/data/star6";
import type { Dragon } from "@/lib/types";

/** Self + flank text stored on each dragon — the in-game vanguard skill. */
export function vanguardBonus(dragon: Pick<Dragon, "habit">): string {
  return dragon.habit.trim();
}

/** Unique 6-star ability (Habit 3). Not the vanguard flank buff. */
export function star6Ability(dragon: Pick<Dragon, "id">): string | null {
  return STAR6_ABILITIES[dragon.id] ?? null;
}
