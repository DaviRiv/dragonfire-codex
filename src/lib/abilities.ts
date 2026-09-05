import { dragonKit, habitNumberForUnlockStars, HABIT_UNLOCK_STARS } from "@/lib/habits";
import { qualifiesForStars } from "@/lib/stars";
import type { Dragon, GatedAbility } from "@/lib/types";

const CONTROL_EFFECTS = [
  "Stun",
  "Panic",
  "Slow",
  "Confusion",
  "Stagger",
  "Weakened",
  "Taunt",
] as const;

const STATUS_CANON: Record<string, string> = {
  "first-strike": "First-Strike",
  "double-strike": "Double-Strike",
  advantage: "Advantage",
  taunt: "Taunt",
  burn: "Burn",
  bleed: "Bleed",
  panic: "Panic",
  stun: "Stun",
  slow: "Slow",
  weakened: "Weakened",
  confusion: "Confusion",
  stagger: "Stagger",
  vulnerable: "Vulnerable",
  overwhelm: "Overwhelm",
  protect: "Protect",
  prey: "Prey",
  evade: "Evade",
  recovery: "Recovery",
  cleanse: "Cleanse",
  resistance: "Resistance",
  "control effect": "Control Effect",
};

export function canonAbility(value: string): string {
  const trimmed = value.trim();
  return STATUS_CANON[trimmed.toLowerCase()] ?? trimmed;
}

/** Hub habit 1–5 → 2/4/6/8/10★. Command (missing habit) is always on. */
export function unlockStarsForHabit(habit?: number): number | null {
  if (habit == null || habit < 1) return null;
  return HABIT_UNLOCK_STARS[habit - 1] ?? null;
}

export function uniqueGates(values: GatedAbility[]): GatedAbility[] {
  const byName = new Map<string, GatedAbility>();
  for (const value of values) {
    const ability = canonAbility(value.ability);
    if (!ability) continue;
    const key = ability.toLowerCase();
    const unlockStars = value.unlockStars ?? null;
    const prev = byName.get(key);
    const prevRank = prev ? (prev.unlockStars ?? 0) : Infinity;
    const nextRank = unlockStars ?? 0;
    if (!prev || nextRank < prevRank) {
      byName.set(key, { ability, unlockStars });
    }
  }
  return [...byName.values()];
}

export function migrateGates(raw: unknown): GatedAbility[] {
  if (!Array.isArray(raw)) return [];
  const next: GatedAbility[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      next.push({ ability: item, unlockStars: null });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = item as { ability?: unknown; unlockStars?: unknown };
    if (typeof row.ability !== "string") continue;
    next.push({
      ability: row.ability,
      unlockStars:
        typeof row.unlockStars === "number" ? row.unlockStars : null,
    });
  }
  return uniqueGates(next);
}

function kitText(
  dragon: Dragon,
  atStars?: number | null,
  habits?: number[] | null,
  habitRanks?: number[] | null,
): string {
  const kit = dragonKit(dragon, habitRanks);
  const extras = kit.extras.filter((line) => {
    if (line.unlockStars == null) return true;
    if (atStars !== undefined && !qualifiesForStars(line.unlockStars, atStars)) {
      return false;
    }
    if (habits != null) {
      const n = habitNumberForUnlockStars(line.unlockStars);
      if (n != null && !habits.includes(n)) return false;
    }
    return true;
  });
  return [kit.command, ...extras.map((line) => line.body)].join(" ");
}

function extraNeedsFromKit(text: string): GatedAbility[] {
  const found: GatedAbility[] = [];
  const re = /if any ally has ([A-Za-z][A-Za-z-]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const key = match[1].toLowerCase();
    if (STATUS_CANON[key]) {
      found.push({ ability: STATUS_CANON[key], unlockStars: null });
    }
  }
  return found;
}

function needMatchesHabits(
  need: GatedAbility,
  habits?: number[] | null,
): boolean {
  if (habits == null) return true;
  const n = habitNumberForUnlockStars(need.unlockStars);
  if (n == null) return true;
  return habits.includes(n);
}

export function dragonNeedGates(
  dragon: Dragon,
  atStars?: number | null,
  habits?: number[] | null,
  habitRanks?: number[] | null,
): GatedAbility[] {
  return uniqueGates([
    ...(dragon.needs ?? []).filter((need) => needMatchesHabits(need, habits)),
    ...extraNeedsFromKit(kitText(dragon, atStars, habits, habitRanks)),
  ]);
}

export function dragonNeeds(dragon: Dragon): string[] {
  return dragonNeedGates(dragon).map((gate) => gate.ability);
}

function provideGate(dragon: Dragon, ability: string): GatedAbility | undefined {
  const want = canonAbility(ability).toLowerCase();
  if (!want) return undefined;
  return (dragon.provides ?? []).find(
    (item) => item.ability.toLowerCase() === want,
  );
}

/**
 * Hub `provides`. Pass `atStars` to honor the habit gate (pit rank, or null
 * if the dragon is not owned). Pass `habits` (1–5) so a deselected habit is
 * not live. Omit both for catalog identity (role chips).
 */
export function dragonProvides(
  dragon: Dragon,
  ability: string,
  atStars?: number | null,
  habits?: number[] | null,
): boolean {
  const want = canonAbility(ability);
  if (!want) return false;
  if (want === "Control Effect") {
    return CONTROL_EFFECTS.some((effect) =>
      dragonProvides(dragon, effect, atStars, habits),
    );
  }
  const gate = provideGate(dragon, want);
  if (!gate) return false;
  if (atStars !== undefined && !qualifiesForStars(gate.unlockStars, atStars)) {
    return false;
  }
  if (habits != null) {
    const n = habitNumberForUnlockStars(gate.unlockStars);
    if (n != null && !habits.includes(n)) return false;
  }
  return true;
}

export function provideUnlockStars(
  dragon: Dragon,
  ability: string,
): number | null | undefined {
  if (canonAbility(ability) === "Control Effect") {
    const stars = CONTROL_EFFECTS.map(
      (effect) => provideGate(dragon, effect)?.unlockStars ?? null,
    ).filter((value): value is number => value != null);
    if (stars.length === 0) {
      return CONTROL_EFFECTS.some((effect) => provideGate(dragon, effect))
        ? null
        : undefined;
    }
    return Math.min(...stars);
  }
  const gate = provideGate(dragon, ability);
  return gate ? gate.unlockStars : undefined;
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export { kitText };
