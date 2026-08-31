import { HUB_DRAGONS, type HabitRanks } from "@/data/hub-source";

export type { HabitRanks };

function pack(
  rows: { id: string; habitsData: HabitRanks[]; habitsShortData: HabitRanks[] }[],
  key: "habitsData" | "habitsShortData",
): Record<string, HabitRanks[]> {
  const next: Record<string, HabitRanks[]> = {};
  for (const row of rows) {
    if (row[key].length > 0) next[row.id] = row[key];
  }
  return next;
}

/** Habits 1–5 (unlock at 2 / 4 / 6 / 8 / 10 stars). Each habit has ranks 1–5. */
export const DRAGON_HABITS: Record<string, HabitRanks[]> = pack(
  HUB_DRAGONS,
  "habitsData",
);

export const DRAGON_HABIT_SHORTS: Record<string, HabitRanks[]> = pack(
  HUB_DRAGONS,
  "habitsShortData",
);
