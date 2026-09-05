/**
 * In-game habit titles. Dragonfire-Hub only stores rank text, not these
 * names — they come from the Star Progression habit cards.
 * Index 0 is Habit 1 (2★). Unknown slots stay unset.
 */
export const HABIT_NAMES: Record<string, (string | undefined)[]> = {
  vermax: [undefined, undefined, "Rallying Flame"],
  moondancer: [
    "New Moon",
    "Reactive Instincts",
    "Full Moon",
    "Blood Moon",
    "Eclipsing Strike",
  ],
  venator: [
    "Hunter's Bane",
    "Dragon's Might",
    "Feral Precision",
    "Armor Break",
    "Desperate Ambush",
  ],
  malachite: [
    "Forest's Instinct",
    "Wise Vigor",
    "Thunderous Roar",
    "Collective Might",
    "Lightning Strike",
  ],
};

export function habitDisplayName(
  dragonId: string,
  habit: number | null | undefined,
): string | undefined {
  if (habit == null || habit < 1) return undefined;
  return HABIT_NAMES[dragonId]?.[habit - 1];
}
