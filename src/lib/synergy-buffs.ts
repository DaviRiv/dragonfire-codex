import {
  HABIT_UNLOCK_STARS,
  habitIsSelected,
  habitRankOf,
  habitText,
} from "@/lib/habits";
import { qualifiesForStars } from "@/lib/stars";
import type { Dragon, LineupKind } from "@/lib/types";

export type SynergyStatLine = {
  stat: string;
  amount: string;
};

/** A granted ability or scaled kit payoff that is live on this three. */
export type SynergyBuff = {
  id: string;
  dragonId: string;
  ability: string;
  fromName: string;
  summary: string;
  stats: SynergyStatLine[];
};

export function kitStars(
  row: { owned: { starRank: number } | null; starRank: number },
  kind: LineupKind,
): number | null {
  if (row.owned) return row.owned.starRank;
  if (kind === "theory") return row.starRank;
  return null;
}

export function buffsOnDragon(
  buffs: SynergyBuff[],
  dragonId: string,
): SynergyBuff[] {
  return buffs.filter((buff) => buff.dragonId === dragonId);
}

function unlockedShorts(
  dragon: Dragon,
  stars: number | null,
  habits?: number[] | null,
  habitRanks?: number[] | null,
): string {
  const parts = [dragon.commandShort?.trim() || dragon.command];
  for (let index = 0; index < HABIT_UNLOCK_STARS.length; index++) {
    if (!habitIsSelected(habits, index + 1)) continue;
    if (!qualifiesForStars(HABIT_UNLOCK_STARS[index], stars)) continue;
    const line = habitText(
      dragon.id,
      index,
      habitRankOf(habitRanks, index + 1),
      true,
    );
    if (line && line !== "Not recorded yet.") parts.push(line);
  }
  return parts.join(" | ");
}

function kitBlob(
  dragon: Dragon,
  stars: number | null,
  habits?: number[] | null,
  habitRanks?: number[] | null,
): string {
  return `${dragon.command} ${unlockedShorts(dragon, stars, habits, habitRanks)}`;
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tidyStat(raw: string): string {
  return raw
    .replace(/\bDmg\b/g, "Damage")
    .replace(/\s+/g, " ")
    .trim();
}

function stackLines(text: string, selfName: string): {
  ability: string | null;
  max: string | null;
  stats: SynergyStatLine[];
} {
  const max = text.match(/Max (\d+) stacks/i)?.[1] ?? null;
  const stats: SynergyStatLine[] = [];
  let ability: string | null = null;

  const each =
    /Each stack of ([A-Za-z][A-Za-z' -]+?) reduces (.+?) by ([+-]?\d+(?:\.\d+)?%)/gi;
  let match: RegExpExecArray | null;
  while ((match = each.exec(text))) {
    ability = match[1].trim();
    const owned = new RegExp(`${escapeRe(selfName)}['’]s\\s+`, "i");
    const stat = tidyStat(match[2].replace(owned, ""));
    const per = max
      ? `${match[3]} per stack (max ${max})`
      : `${match[3]} per stack`;
    stats.push({ stat, amount: per });
  }

  const perStack =
    /Reduces ([A-Za-z ]+) of \w+ by ([+-]?\d+(?:\.\d+)?%) per-stack of ([A-Za-z][A-Za-z' -]+)/gi;
  while ((match = perStack.exec(text))) {
    ability = ability ?? match[3].trim();
    const amount = max
      ? `${match[2]} per stack (max ${max})`
      : `${match[2]} per stack`;
    if (!stats.some((row) => row.stat === tidyStat(match![1]))) {
      stats.push({ stat: tidyStat(match[1]), amount });
    }
  }

  return { ability, max, stats };
}

function orPayoffs(text: string, ability: string): SynergyStatLine[] {
  const stats: SynergyStatLine[] = [];
  const needle = escapeRe(ability);
  const re = new RegExp(
    `([A-Za-z][A-Za-z ]*?)\\s*\\((\\+?\\d+(?:\\.\\d+)?%) or (\\+?\\d+(?:\\.\\d+)?%) w\\/ [^)]*${needle}[^)]*\\)`,
    "gi",
  );
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const label = tidyStat(match[1].replace(/^Command\s+/i, ""));
    if (!label || /chance|round/i.test(label)) continue;
    stats.push({
      stat: label,
      amount: `${match[2]} → ${match[3]}`,
    });
  }
  return stats;
}

function withoutAllyChunks(text: string): string {
  return text
    .split("|")
    .filter((chunk) => !/to 1 Ally /i.test(chunk))
    .join(" | ");
}

function allyBreedPayoffs(text: string, breedLabel: string): SynergyStatLine[] {
  const stats: SynergyStatLine[] = [];
  for (const chunk of text.split("|")) {
    if (!new RegExp(`Ally ${escapeRe(breedLabel)}`, "i").test(chunk)) continue;
    const re =
      /([A-Za-z][A-Za-z ]*?)\s*\((\+\d+(?:\.\d+)?%)(?: or \+?(\d+(?:\.\d+)?%) w\/ [^)]+)?\)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(chunk))) {
      const stat = tidyStat(match[1]);
      if (/chance|round/i.test(stat)) continue;
      const amount = match[3]
        ? `${match[2]}, +${match[3]} at 4+ stacks`
        : match[2];
      stats.push({ stat, amount });
    }
  }
  return stats;
}

function uniqueStats(rows: SynergyStatLine[]): SynergyStatLine[] {
  const byStat = new Map<string, SynergyStatLine>();
  for (const row of rows) {
    const key = row.stat.toLowerCase();
    const prev = byStat.get(key);
    if (!prev || amountWeight(row.amount) >= amountWeight(prev.amount)) {
      byStat.set(key, row);
    }
  }
  return [...byStat.values()];
}

function amountWeight(amount: string): number {
  const nums = [...amount.matchAll(/(\d+(?:\.\d+)?)/g)].map((match) =>
    Number(match[1]),
  );
  return nums.length ? Math.max(...nums) : 0;
}

function timesPayoff(text: string, ability: string): SynergyStatLine[] {
  const re = new RegExp(
    `increased by ([\\d.]+)x when you have ${escapeRe(ability)} \\(Damage Rate: (\\+\\d+%)\\)`,
    "i",
  );
  const match = text.match(re);
  if (!match) return [];
  return [{ stat: "Damage Rate", amount: `${match[2]} (${match[1]}x)` }];
}

function kitTextsForNeed(
  dragon: Dragon,
  ability: string,
  stars: number | null,
  habits?: number[] | null,
  habitRanks?: number[] | null,
): {
  full: string;
  short: string;
} {
  const full = [dragon.command];
  const short = [dragon.commandShort?.trim() || dragon.command];
  for (let index = 0; index < HABIT_UNLOCK_STARS.length; index++) {
    if (!habitIsSelected(habits, index + 1)) continue;
    const rank = habitRankOf(habitRanks, index + 1);
    const body = habitText(dragon.id, index, rank);
    const line = habitText(dragon.id, index, rank, true);
    if (body === "Not recorded yet.") continue;
    const blob = `${body} ${line}`;
    const mentions = new RegExp(`\\b${escapeRe(ability)}\\b`, "i").test(blob);
    const unlocked = qualifiesForStars(HABIT_UNLOCK_STARS[index], stars);
    if (!mentions && !unlocked) continue;
    if (mentions || unlocked) {
      if (body) full.push(body);
      if (line && line !== "Not recorded yet.") short.push(line);
    }
  }
  return { full: full.join(" "), short: short.join(" | ") };
}

function doubledChance(text: string, ability: string): SynergyStatLine[] {
  const re = new RegExp(
    `(\\d+%) chance to ([A-Za-z][A-Za-z-]+)[\\s\\S]{0,160}?This chance is doubled \\((\\d+%)\\) against targets afflicted with ${escapeRe(ability)}`,
    "i",
  );
  const match = text.match(re);
  if (!match) return [];
  return [{ stat: tidyStat(match[2]), amount: `${match[1]} → ${match[3]}` }];
}

function durationDoubled(text: string, ability: string): SynergyStatLine[] {
  const re = new RegExp(
    `duration is doubled \\((\\d+) rounds?\\) against targets afflicted with ${escapeRe(ability)}`,
    "i",
  );
  const match = text.match(re);
  if (!match) return [];
  return [{ stat: "Duration", amount: `${match[1]} rounds with ${ability}` }];
}

function scaledIfAfflicted(text: string, ability: string): SynergyStatLine[] {
  const re = new RegExp(
    `increased by ([\\d.]+)x \\((\\+\\d+(?:\\.\\d+)?%)\\) if an Enemy is afflicted with ${escapeRe(ability)}`,
    "i",
  );
  const match = text.match(re);
  if (!match) return [];
  return [{ stat: "Recovery", amount: `${match[1]}x (${match[2]})` }];
}

function vsAfflictedDamage(text: string, ability: string): SynergyStatLine[] {
  const re = new RegExp(
    `increased by ([\\d.]+)x against targets afflicted with ${escapeRe(ability)} \\(Damage Rate: (\\+\\d+%)\\)`,
    "i",
  );
  const match = text.match(re);
  if (!match) return [];
  return [{ stat: "Damage Rate", amount: `${match[2]} (${match[1]}x)` }];
}

function whyFromKit(
  dragon: Dragon,
  ability: string,
  full: string,
  stats: SynergyStatLine[],
): string {
  const name = escapeRe(ability);
  const doubled = full.match(
    new RegExp(
      `(\\d+%) chance to ([A-Za-z][A-Za-z-]+)[\\s\\S]{0,160}?This chance is doubled \\((\\d+%)\\) against targets afflicted with ${name}`,
      "i",
    ),
  );
  if (doubled) {
    return `${doubled[2]} chance is ${doubled[1]}, or ${doubled[3]} against enemies with ${ability}.`;
  }

  const times = full.match(
    new RegExp(
      `increased by ([\\d.]+)x when you have ${name} \\(Damage Rate: (\\+\\d+%)\\)`,
      "i",
    ),
  );
  if (times) {
    return `Command damage is ${times[1]}x (${times[2]}) when ${dragon.name} has ${ability}.`;
  }

  const duration = full.match(
    new RegExp(
      `duration is doubled \\((\\d+) rounds?\\) against targets afflicted with ${name}`,
      "i",
    ),
  );
  if (duration) {
    return `The effect lasts ${duration[1]} rounds on enemies with ${ability} — twice as long.`;
  }

  const scaled = full.match(
    new RegExp(
      `increased by ([\\d.]+)x \\((\\+\\d+(?:\\.\\d+)?%)\\) if an Enemy is afflicted with ${name}`,
      "i",
    ),
  );
  if (scaled) {
    return `Recovery is ${scaled[1]}x (${scaled[2]}) if an enemy has ${ability}.`;
  }

  const ally = full.match(
    new RegExp(
      `Double this chance \\((\\d+(?:\\.\\d+)?%)\\) if any [Aa]lly has ${name}`,
      "i",
    ),
  );
  if (ally) {
    return `The chance doubles to ${ally[1]} if an ally has ${ability}.`;
  }

  const vs = full.match(
    new RegExp(
      `increased by ([\\d.]+)x against targets afflicted with ${name} \\(Damage Rate: (\\+\\d+%)\\)`,
      "i",
    ),
  );
  if (vs) {
    return `That hit is ${vs[1]}x (${vs[2]}) against enemies with ${ability}.`;
  }

  if (stats.length > 0) {
    return stats
      .map((row) => `${row.stat} is ${row.amount} with ${ability}`)
      .join("; ") + ".";
  }

  const sentence =
    full
      .split(/(?<=\.)\s+/)
      .find((part) => new RegExp(`\\b${name}\\b`, "i").test(part) &&
        /(afflicted with|when you have|if any|w\/ |with )/.test(part))
      ?.trim() ?? "";
  return sentence;
}

export type NeedWhy = {
  why: string;
  stats: SynergyStatLine[];
};

/** What the needed ability actually does in this dragon’s unlocked (or gated) kit. */
export function needWhy(
  dragon: Dragon,
  ability: string,
  stars: number | null,
  habits?: number[] | null,
  habitRanks?: number[] | null,
): NeedWhy {
  const { full, short } = kitTextsForNeed(
    dragon,
    ability,
    stars,
    habits,
    habitRanks,
  );
  const stats = uniqueStats([
    ...orPayoffs(short, ability),
    ...orPayoffs(full, ability),
    ...timesPayoff(full, ability),
    ...doubledChance(full, ability),
    ...durationDoubled(full, ability),
    ...scaledIfAfflicted(full, ability),
    ...vsAfflictedDamage(full, ability),
  ]).filter((row, _, all) => {
    if (row.stat === "Damage Rate" && all.some((other) => /damage/i.test(other.stat) && other !== row)) {
      return false;
    }
    return true;
  });
  return { why: whyFromKit(dragon, ability, full, stats), stats };
}

export function withNeedWhy(why: string, rest: string): string {
  const lead = why.replace(/\s+/g, " ").trim();
  const tail = rest.replace(/\s+/g, " ").trim();
  if (!lead) return tail;
  if (!tail) return lead;
  const left = lead.endsWith(".") ? lead : `${lead}.`;
  return `${left} ${tail}`;
}

export function needWhyShort(
  dragon: Dragon,
  ability: string,
  stars: number | null,
  habits?: number[] | null,
  habitRanks?: number[] | null,
): string {
  const { stats, why } = needWhy(dragon, ability, stars, habits, habitRanks);
  if (stats[0]) return `${stats[0].stat} ${stats[0].amount}`;
  if (!why) return "";
  const clip = why.replace(/\.$/, "");
  return clip.length > 72 ? `${clip.slice(0, 69)}…` : clip;
}

/** Crescent Blade on the Sentinel, Rising Tide (and numbers) on Moondancer. */
export function grantBuffs(
  giver: Dragon,
  gift: string,
  partner: Dragon,
  giverStars: number | null,
  breedLabel: string,
  giverHabits?: number[] | null,
  giverHabitRanks?: number[] | null,
): SynergyBuff[] {
  const blob = kitBlob(giver, giverStars, giverHabits, giverHabitRanks);
  const shorts = unlockedShorts(giver, giverStars, giverHabits, giverHabitRanks);
  const stacks = stackLines(blob, giver.name);
  const stackName = stacks.ability ?? "Rising Tide";
  const receiverStats = uniqueStats([
    ...allyBreedPayoffs(shorts, breedLabel),
    ...orPayoffs(shorts, gift),
  ]);
  const selfShorts = withoutAllyChunks(shorts);
  const giverStats = uniqueStats([
    ...stacks.stats,
    ...orPayoffs(selfShorts, stackName),
    ...orPayoffs(selfShorts, gift),
  ]);

  const onPartner: SynergyBuff = {
    id: `gift:${giver.id}:${partner.id}:${gift.toLowerCase()}`,
    dragonId: partner.id,
    ability: gift,
    fromName: giver.name,
    summary: `${gift} from ${giver.name}`,
    stats: receiverStats,
  };

  const onGiver: SynergyBuff = {
    id: `stack:${giver.id}:${partner.id}:${stackName.toLowerCase()}`,
    dragonId: giver.id,
    ability: stackName,
    fromName: partner.name,
    summary: `${partner.name} holds ${gift}, so ${stackName} can stack`,
    stats: giverStats,
  };

  const buffs: SynergyBuff[] = [];
  if (onPartner.stats.length > 0 || gift) buffs.push(onPartner);
  if (onGiver.stats.length > 0 || stacks.ability) buffs.push(onGiver);
  return buffs;
}

export function grantDetail(
  giver: Dragon,
  gift: string,
  partners: string,
  partner: Dragon,
  giverStars: number | null,
  breedLabel: string,
  giverHabits?: number[] | null,
  giverHabitRanks?: number[] | null,
): { detail: string; stats: SynergyStatLine[]; buffs: SynergyBuff[] } {
  const buffs = grantBuffs(
    giver,
    gift,
    partner,
    giverStars,
    breedLabel,
    giverHabits,
    giverHabitRanks,
  );
  const onPartner = buffs.find((buff) => buff.dragonId === partner.id);
  const onGiver = buffs.find((buff) => buff.dragonId === giver.id);
  const parts: string[] = [];
  if (gift) {
    parts.push(`${partners} holds ${gift}.`);
  }
  if (onGiver?.stats.length) {
    parts.push(
      `${onGiver.ability} on ${giver.name}: ${onGiver.stats
        .map((row) => `${row.stat} ${row.amount}`)
        .join("; ")}.`,
    );
  } else if (onGiver) {
    parts.push(
      `${partners} can stack ${onGiver.ability} when they deal Tactical Damage or apply Recovery.`,
    );
  }
  if (onPartner?.stats.length) {
    parts.push(
      `${partner.name}: ${onPartner.stats
        .map((row) => `${row.stat} ${row.amount}`)
        .join("; ")}.`,
    );
  }
  return {
    detail: parts.join(" ") || `${gift} is on ${partners}.`,
    stats: uniqueStats(buffs.flatMap((buff) => buff.stats)),
    buffs,
  };
}

export function needBuffs(
  needer: Dragon,
  ability: string,
  provider: Dragon,
  neederStars: number | null,
  neederHabits?: number[] | null,
  neederHabitRanks?: number[] | null,
): SynergyBuff[] {
  const { why, stats } = needWhy(
    needer,
    ability,
    neederStars,
    neederHabits,
    neederHabitRanks,
  );
  return [
    {
      id: `need:${needer.id}:${ability.toLowerCase()}`,
      dragonId: needer.id,
      ability,
      fromName: provider.name,
      summary: why || `${ability} from ${provider.name}`,
      stats,
    },
  ];
}

export function needDetail(
  needer: Dragon,
  ability: string,
  providerNames: string,
  provider: Dragon,
  neederStars: number | null,
  neederHabits?: number[] | null,
  neederHabitRanks?: number[] | null,
): { detail: string; stats: SynergyStatLine[]; buffs: SynergyBuff[] } {
  const { why, stats } = needWhy(
    needer,
    ability,
    neederStars,
    neederHabits,
    neederHabitRanks,
  );
  const buffs = needBuffs(
    needer,
    ability,
    provider,
    neederStars,
    neederHabits,
    neederHabitRanks,
  );
  if (!why && stats.length === 0) {
    return {
      detail: `${providerNames} supplies ${ability}, which ${needer.name}’s kit is written to scale with.`,
      stats,
      buffs,
    };
  }
  return {
    detail: withNeedWhy(
      why,
      `${providerNames} is supplying the ${ability} that turns it on.`,
    ),
    stats,
    buffs,
  };
}

const CORE_STATS = [
  "strength",
  "instinct",
  "intelligence",
  "initiative",
] as const;

export type CoreStat = (typeof CORE_STATS)[number];

export function coreStatKey(stat: string): CoreStat | null {
  const key = stat.toLowerCase().replace(/\s+/g, "");
  if (key === "strength" || key.startsWith("str")) return "strength";
  if (key === "instinct" || key.startsWith("ins")) return "instinct";
  if (key === "intelligence" || key.startsWith("int")) return "intelligence";
  if (key === "initiative" || key.startsWith("init")) return "initiative";
  return null;
}

export function coreStatMods(
  buffs: SynergyBuff[],
): Partial<Record<CoreStat, string>> {
  const mods: Partial<Record<CoreStat, string[]>> = {};
  for (const buff of buffs) {
    for (const row of buff.stats) {
      const key = coreStatKey(row.stat);
      if (!key) continue;
      const list = mods[key] ?? [];
      if (!list.includes(row.amount)) list.push(row.amount);
      mods[key] = list;
    }
  }
  const next: Partial<Record<CoreStat, string>> = {};
  for (const key of CORE_STATS) {
    const list = mods[key];
    if (list?.length) next[key] = list.join(", ");
  }
  return next;
}
