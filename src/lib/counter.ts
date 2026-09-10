import { getCatalogDragon } from "@/data/dragons";
import { dragonProvides } from "@/lib/abilities";
import { defaultHabits } from "@/lib/habits";
import { healUnlocked, healingAbilities } from "@/lib/healing";
import { SLOT_IDS } from "@/lib/lineup";
import { isCrowdControl, isTank } from "@/lib/roles";
import type { Dragon, SlotId, TroopType } from "@/lib/types";

export type EnemySeat = {
  slot: SlotId;
  dragonId: string | null;
  stars: number;
};

export type EnemyLine = {
  left: string;
  vanguard: string;
  right: string;
  leftStars: number;
  vanguardStars: number;
  rightStars: number;
  troop: TroopType;
};

export type EnemyLive = {
  dragon: Dragon;
  slot: SlotId;
  stars: number;
};

/** Stun / Overwhelm stop Commands and Habits (glossary). Prey cuts Recovery Received. */
export const INTERRUPT_HEAL = ["Stun", "Overwhelm"] as const;
export const CUT_HEAL = ["Prey"] as const;

export function enemySeats(line: EnemyLine): EnemyLive[] {
  const rows: { slot: SlotId; id: string; stars: number }[] = [
    { slot: "left", id: line.left, stars: line.leftStars },
    { slot: "vanguard", id: line.vanguard, stars: line.vanguardStars },
    { slot: "right", id: line.right, stars: line.rightStars },
  ];
  const live: EnemyLive[] = [];
  for (const row of rows) {
    const dragon = getCatalogDragon(row.id);
    if (!dragon) continue;
    live.push({ dragon, slot: row.slot, stars: row.stars });
  }
  return live;
}

export function enemyLineComplete(line: {
  left: string | null;
  vanguard: string | null;
  right: string | null;
}): line is { left: string; vanguard: string; right: string } {
  if (!line.left || !line.vanguard || !line.right) return false;
  return new Set([line.left, line.vanguard, line.right]).size === 3;
}

function habitsAt(stars: number): number[] {
  return defaultHabits(stars);
}

export function liveHeals(row: EnemyLive): boolean {
  const habits = habitsAt(row.stars);
  return healingAbilities(row.dragon).some((heal) =>
    healUnlocked(heal, row.stars, habits),
  );
}

export function lockedHeals(row: EnemyLive): { stars: number; label: string }[] {
  const habits = habitsAt(row.stars);
  return healingAbilities(row.dragon)
    .filter((heal) => !healUnlocked(heal, row.stars, habits) && heal.stars != null)
    .map((heal) => ({
      stars: heal.stars as number,
      label: heal.label,
    }));
}

export function liveProvide(row: EnemyLive, ability: string): boolean {
  return dragonProvides(row.dragon, ability, row.stars, habitsAt(row.stars));
}

export type EnemyProfile = {
  seats: EnemyLive[];
  healers: EnemyLive[];
  tanks: EnemyLive[];
  control: EnemyLive[];
  lockedHeal: { name: string; stars: number }[];
};

export function analyzeEnemy(line: EnemyLine): EnemyProfile {
  const seats = enemySeats(line);
  const healers = seats.filter(liveHeals);
  const tanks = seats.filter(
    (row) => isTank(row.dragon) && liveProvide(row, "Taunt"),
  );
  const control = seats.filter((row) => isCrowdControl(row.dragon));
  const lockedHeal: { name: string; stars: number }[] = [];
  for (const row of seats) {
    if (liveHeals(row)) continue;
    for (const lock of lockedHeals(row)) {
      lockedHeal.push({ name: row.dragon.name, stars: lock.stars });
    }
  }
  return { seats, healers, tanks, control, lockedHeal };
}

export function lineProvidesAbility(
  ids: string[],
  starsFor: (id: string) => number,
  ability: string,
): Dragon[] {
  const found: Dragon[] = [];
  for (const id of ids) {
    const dragon = getCatalogDragon(id);
    if (!dragon) continue;
    const stars = starsFor(id);
    if (dragonProvides(dragon, ability, stars, habitsAt(stars))) {
      found.push(dragon);
    }
  }
  return found;
}

export function seatList(line: EnemyLine): string[] {
  return [line.left, line.vanguard, line.right];
}

export { SLOT_IDS };
