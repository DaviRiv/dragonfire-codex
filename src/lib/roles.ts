import { DRAGON_HABITS } from "@/data/dragon-habits";
import type { Dragon } from "@/lib/types";

/** World of Warcraft-style lineup jobs. A dragon can hold more than one. */
export const COMP_ROLES = [
  "healing",
  "tanking",
  "damage",
  "control",
] as const;

export type CompRole = (typeof COMP_ROLES)[number];

export const roleLabels: Record<CompRole, string> = {
  healing: "Healing",
  tanking: "Tanking",
  damage: "Damage",
  control: "Crowd control",
};

export const roleShort: Record<CompRole, string> = {
  healing: "Heal",
  tanking: "Tank",
  damage: "DPS",
  control: "CC",
};

export const roleChipClass: Record<CompRole, string> = {
  healing: "bg-emerald-500/15 text-emerald-100 ring-emerald-400/40",
  tanking: "bg-stone-400/15 text-stone-100 ring-stone-300/40",
  damage: "bg-orange-500/15 text-orange-100 ring-orange-400/40",
  control: "bg-violet-500/15 text-violet-100 ring-violet-400/40",
};

const HARD_CC = ["Stun", "Panic", "Slow", "Stagger", "Confusion"] as const;

function kitLines(dragon: Pick<Dragon, "id" | "command" | "habit">): string[] {
  const habits = DRAGON_HABITS[dragon.id] ?? [];
  return [
    dragon.command,
    dragon.habit,
    ...habits.map((habit) => habit.level1),
  ].filter((line) => line.trim().length > 0);
}

function providesNamed(dragon: Pick<Dragon, "provides">, name: string): boolean {
  const want = name.toLowerCase();
  return (dragon.provides ?? []).some((item) => item.toLowerCase() === want);
}

function providesAny(
  dragon: Pick<Dragon, "provides">,
  names: readonly string[],
): boolean {
  return names.some((name) => providesNamed(dragon, name));
}

/** Recovery that lands on allies — not self-heal, not enemy Recovery Received. */
export function isHealer(dragon: Dragon): boolean {
  if (providesNamed(dragon, "Recovery")) {
    const hay = kitLines(dragon).join("\n");
    if (
      /apply Recovery[^.\n]{0,180}All(?:y|ies)/i.test(hay) ||
      /Recovery to (?:the |[123] )?(?:other )?All(?:y|ies)/i.test(hay)
    ) {
      return true;
    }
  }
  for (const line of kitLines(dragon)) {
    if (!/recovery/i.test(line)) continue;
    if (/yourself/i.test(line) && !/All(?:y|ies)/i.test(line)) continue;
    if (/Recovery Received/i.test(line) && /Enem(?:y|ies)/i.test(line)) {
      continue;
    }
    if (
      /apply Recovery[^.\n]{0,180}(?:the |[123] )?(?:other )?All(?:y|ies)/i.test(
        line,
      ) ||
      /Recovery to (?:the |[123] )?(?:other )?All(?:y|ies)/i.test(line)
    ) {
      return true;
    }
  }
  return false;
}

/** Taunt that pulls enemies onto this dragon — not “targets that already have Taunt”. */
export function isTank(dragon: Dragon): boolean {
  if (providesNamed(dragon, "Taunt")) return true;
  const hay = kitLines(dragon).join("\n");
  return (
    /\bTaunt (?:all )?(?:\d+ )?Enemies\b/i.test(hay) ||
    /\bchance to Taunt\b/i.test(hay)
  );
}

/** Stun, Panic, Slow, Stagger, Confusion. Taunt is tanking; Weakened is a damage amp. */
export function isCrowdControl(dragon: Dragon): boolean {
  return providesAny(dragon, HARD_CC);
}

function dealsDamage(dragon: Dragon): boolean {
  if (/Deal (?:Physical|Fire|Tactical) Damage/i.test(dragon.command)) {
    return true;
  }
  if (providesAny(dragon, ["Bleed", "Overwhelm", "Burn"])) return true;
  return ["Physical Damage", "Fire Damage", "Tactical Damage"].some((tag) =>
    dragon.tags.includes(tag),
  );
}

/**
 * Jobs this dragon can fill on a three-dragon line.
 * Tanks stay out of Damage so Vhagar does not flood the DPS filter;
 * healers who also nuke (Malachite) still count as Damage.
 */
export function dragonRoles(dragon: Dragon): CompRole[] {
  const roles: CompRole[] = [];
  const healing = isHealer(dragon);
  const tanking = isTank(dragon);
  const control = isCrowdControl(dragon);
  const damage = dealsDamage(dragon) && !tanking;

  if (healing) roles.push("healing");
  if (tanking) roles.push("tanking");
  if (damage) roles.push("damage");
  if (control) roles.push("control");
  if (roles.length === 0) roles.push("damage");
  return roles;
}

export function hasCompRole(dragon: Dragon, role: CompRole): boolean {
  return dragonRoles(dragon).includes(role);
}

export function teamCompRoles(dragons: Dragon[]): Set<CompRole> {
  const next = new Set<CompRole>();
  for (const dragon of dragons) {
    for (const role of dragonRoles(dragon)) next.add(role);
  }
  return next;
}

export function missingCompRoles(dragons: Dragon[]): CompRole[] {
  const have = teamCompRoles(dragons);
  return COMP_ROLES.filter((role) => !have.has(role));
}
