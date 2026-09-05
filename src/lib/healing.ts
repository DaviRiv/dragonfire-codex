import { HABIT_UNLOCK_STARS, habitRankOf, habitText } from "@/lib/habits";
import type { Dragon } from "@/lib/types";

export type HealingAbility = {
  id: string;
  /** `null` means the Command — no star gate. */
  stars: number | null;
  habit?: number;
  label: string;
  text: string;
  short: string;
};

/** Recovery that lands on allies — not self-heal, not enemy Recovery Received. */
export function lineHealsAllies(line: string): boolean {
  if (!/recovery/i.test(line)) return false;
  if (/yourself/i.test(line) && !/All(?:y|ies)/i.test(line)) return false;
  if (/Recovery Received/i.test(line) && /Enem(?:y|ies)/i.test(line)) {
    return false;
  }
  return (
    /apply Recovery[^.\n]{0,180}(?:the |[123] )?(?:other )?All(?:y|ies)/i.test(
      line,
    ) || /Recovery to (?:the |[123] )?(?:other )?All(?:y|ies)/i.test(line)
  );
}

/** Prefer the Recovery clause so a heal line is not buried under damage. */
export function recoveryClause(text: string): string {
  const chunks = text.split(/\s\|\s/);
  const hits = chunks.filter(
    (chunk) =>
      /recovery/i.test(chunk) &&
      !(/recovery received/i.test(chunk) && /enem/i.test(chunk)),
  );
  if (hits.length > 0) return hits.join(" | ");
  const sentences = text.split(/(?<=\.)\s+/);
  const fromSentences = sentences.filter(
    (sentence) => /recovery/i.test(sentence) && /all(?:y|ies)/i.test(sentence),
  );
  return fromSentences.join(" ") || text;
}

export function healingAbilities(
  dragon: Pick<Dragon, "id" | "command" | "commandShort">,
  habitRanks?: number[] | null,
): HealingAbility[] {
  const heals: HealingAbility[] = [];
  if (lineHealsAllies(dragon.command)) {
    const short = dragon.commandShort?.trim() || dragon.command;
    heals.push({
      id: "command",
      stars: null,
      label: "Command",
      text: dragon.command,
      short: recoveryClause(short),
    });
  }
  for (let index = 0; index < HABIT_UNLOCK_STARS.length; index++) {
    const rank = habitRankOf(habitRanks, index + 1);
    const body = habitText(dragon.id, index, rank);
    if (!lineHealsAllies(body) || body === "Not recorded yet.") continue;
    const star = HABIT_UNLOCK_STARS[index];
    const short = habitText(dragon.id, index, rank, true);
    heals.push({
      id: `habit-${index}`,
      stars: star,
      habit: index + 1,
      label: `${star}★`,
      text: body,
      short: recoveryClause(short),
    });
  }
  return heals;
}

export function healUnlocked(
  heal: HealingAbility,
  starRank: number,
  habits?: number[] | null,
): boolean {
  if (heal.stars != null && starRank < heal.stars) return false;
  if (habits != null && heal.habit != null && !habits.includes(heal.habit)) {
    return false;
  }
  return true;
}

/** Compact chip: "Heal" if Command recovers, otherwise the earliest star gate. */
export function healChipLabel(dragon: Dragon): string {
  const heals = healingAbilities(dragon);
  if (heals.length === 0) return "Heal";
  if (heals.some((heal) => heal.stars === null)) return "Heal";
  const min = Math.min(...heals.map((heal) => heal.stars ?? 1));
  return `Heal ${min}★`;
}

export function healGateTitle(heal: HealingAbility): string {
  if (heal.stars == null) return "Command · Heal · always on";
  const habit = heal.habit ? `Habit ${heal.habit} · ` : "";
  return `${habit}${heal.stars}★ · Heal`;
}

export function compactHealLine(
  heal: HealingAbility,
  starRank: number,
  habits?: number[] | null,
): string {
  if (healUnlocked(heal, starRank, habits)) {
    return `${heal.label} · ${heal.short}`;
  }
  if (
    habits != null &&
    heal.habit != null &&
    !habits.includes(heal.habit)
  ) {
    return `${heal.label} · not bought · ${heal.short}`;
  }
  return `${heal.label} · needs ${heal.stars}★ · ${heal.short}`;
}
