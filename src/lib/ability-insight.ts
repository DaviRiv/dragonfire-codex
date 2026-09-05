import { DRAGONS } from "@/data/dragons";
import { DRAGON_HABITS } from "@/data/dragon-habits";
import { habitDisplayName } from "@/data/habit-names";
import {
  STATUS_GLOSSARY,
  statusGlossaryName,
} from "@/data/status-glossary";
import {
  commandLine,
  HABIT_UNLOCK_STARS,
  habitRankTexts,
  vanguardBonus,
} from "@/lib/habits";
import {
  polarityForName,
  type StatusPolarity,
} from "@/lib/status-polarity";
import type { Dragon } from "@/lib/types";

export { habitDisplayName };
export type { StatusPolarity };

export type AbilitySourceKind = "command" | "vanguard" | "habit" | "buff";

export type AbilityGloss = {
  name: string;
  body: string;
  polarity: StatusPolarity;
};

export type AbilitySourceRef = {
  kind: AbilitySourceKind;
  habit?: number;
};

export type AbilityScaleRow = {
  label: string;
  values: string[];
};

export type AbilityInsight = {
  id: string;
  dragonId: string;
  dragonName: string;
  kind: AbilitySourceKind;
  habit?: number;
  unlockStars?: number;
  title: string;
  names: string[];
  defines: string[];
  body: string;
  ranks?: string[];
  scale: AbilityScaleRow[];
  glosses: AbilityGloss[];
  polarity?: StatusPolarity;
};

const STATUS_NAMES = [
  "First-Strike",
  "Double-Strike",
  "Advantage",
  "Resistance",
  "Taunt",
  "Burn",
  "Bleed",
  "Panic",
  "Stun",
  "Slow",
  "Weakened",
  "Confusion",
  "Stagger",
  "Vulnerable",
  "Overwhelm",
  "Protect",
  "Prey",
  "Evade",
  "Cleanse",
  "Bulwark",
] as const;

const SKIP_NAMES = new Set(
  [
    "Combat",
    "Enemy",
    "Enemies",
    "Ally",
    "Allies",
    "Physical",
    "Tactical",
    "Fire",
    "Damage",
    "Dealt",
    "Received",
    "Recovery",
    "Strength",
    "Instinct",
    "Intelligence",
    "Initiative",
    "Command",
    "Habits",
    "Basic Attack",
    "Damage Rate",
    "Physical Damage",
    "Tactical Damage",
    "Fire Damage",
    "Physical Damage Dealt",
    "Tactical Damage Dealt",
    "Fire Damage Dealt",
    "Physical Damage Received",
    "Tactical Damage Received",
    "Fire Damage Received",
    "Damage Dealt",
    "Damage Received",
    "Recovery Received",
    "Recovery Dealt",
    "Left Flank",
    "Right Flank",
    "Same Lane",
    "Each Round",
    "Start of Combat",
    "Start of Each Round",
    "End of Combat",
    "Command & Habits",
    "Physical Damage (Command & Habits)",
    "Tactical Damage (Command & Habits)",
    "Fire Damage (Command & Habits)",
    "Max Stacks",
    "Troop Capacity",
    "Even-numbered Rounds",
    "Odd-numbered Rounds",
  ].map((name) => name.toLowerCase()),
);

const TITLE_NAME = String.raw`[A-Z][A-Za-z][A-Za-z'’]*(?:[ -][A-Z][A-Za-z'’]*)*`;
const TITLE_NAME_MULTI = String.raw`[A-Z][A-Za-z][A-Za-z'’]*(?:[ -][A-Z][A-Za-z'’]*)+`;
const STACK_RE = new RegExp(
  String.raw`(?:[Ss]tack|[Ss]tacks) of (${TITLE_NAME})`,
  "g",
);
const DEFINE_RE = new RegExp(
  String.raw`[Ee]ach [Ss]tacks? of (${TITLE_NAME})`,
  "g",
);
const MARK_RE = new RegExp(
  String.raw`\b(?:[Gg]rant|[Gg]ains?|[Aa]pply|[Aa]pplies|[Ii]nflict(?:s|ing)?|[Aa]fflict(?:s|ing)?|[Mm]ark(?:s|ing)?|[Cc]onsum(?:e|es|ing))\s+(?:a |an |the |yourself |the target )?(?:stack of )?(${TITLE_NAME_MULTI})`,
  "g",
);
const WITH_MARK_RE = new RegExp(String.raw`\bwith (${TITLE_NAME_MULTI})`, "g");
const NAME_GAINS_RE = new RegExp(String.raw`(${TITLE_NAME_MULTI}) gains?:`, "g");
const APPLY_STATUS_RE = new RegExp(
  String.raw`\b(?:grant|gains?|apply|applies|inflict(?:s|ing)?|afflict(?:s|ing)?|mark(?:s|ing)?)\b[\s\S]{0,72}?\b(${STATUS_NAMES.join("|")})\b`,
  "gi",
);
const PERCENT_RE = /[+\u2212-]?\d+(?:\.\d+)?%/g;

const cache = new Map<string, AbilityInsight[]>();
const byName = new Map<string, AbilityInsight[]>();
let catalogWarmed = false;
let namedPhrases: string[] | null = null;

function keyName(value: string): string {
  return value.replace(/[’']/g, "'").trim().toLowerCase();
}

function keepName(raw: string | undefined): string | null {
  if (!raw) return null;
  const name = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(?:to|on|with|from|and|or|the|a|an|of)$/i, "");
  if (name.length < 3 || name.length > 40) return null;
  if (SKIP_NAMES.has(name.toLowerCase())) return null;
  if (!/^[A-Z]/.test(name)) return null;
  return name;
}

function pushName(into: Set<string>, raw: string | undefined) {
  const name = keepName(raw);
  if (name) into.add(name);
}

function collectFromRegex(text: string, regex: RegExp, into: Set<string>) {
  regex.lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    pushName(into, match[1]);
  }
}

export function namedStacksIn(text: string): string[] {
  const names = new Set<string>();
  collectFromRegex(text, STACK_RE, names);
  collectFromRegex(text, DEFINE_RE, names);
  collectFromRegex(text, MARK_RE, names);
  collectFromRegex(text, WITH_MARK_RE, names);
  collectFromRegex(text, NAME_GAINS_RE, names);
  APPLY_STATUS_RE.lastIndex = 0;
  for (const match of text.matchAll(APPLY_STATUS_RE)) {
    pushName(names, match[1]);
  }
  return [...names];
}

export function definedStacksIn(text: string): string[] {
  const names = new Set<string>();
  collectFromRegex(text, DEFINE_RE, names);
  return [...names];
}

function collapseScaleLabel(label: string): string {
  if (/^Fire Damage Received$/i.test(label)) return "Fire Damage Received";
  if (/Damage Received$/i.test(label)) return "Damage Received";
  if (/Damage Dealt$/i.test(label) && !/Received/i.test(label)) {
    return "Damage Dealt";
  }
  return label;
}

const STAT_LABEL_RE =
  /((?:Physical|Tactical|Fire) Damage(?: Received| Dealt)?|Damage Received|Damage Dealt|Recovery(?: Received| Dealt)?|Strength|Instinct|Intelligence|Initiative)/gi;

function nearestStatLabel(before: string): string | null {
  let last: string | null = null;
  STAT_LABEL_RE.lastIndex = 0;
  for (const match of before.matchAll(STAT_LABEL_RE)) {
    last = match[1] ?? null;
  }
  return last ? collapseScaleLabel(last) : null;
}

function isDerivedPercent(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 64), index);
  if (/double this chance/i.test(before)) return true;
  if (/double this damage/i.test(before)) return true;
  if (/1\.5x/i.test(before)) return true;
  return false;
}

function labelForPercent(
  text: string,
  index: number,
  habitTitle?: string,
): string {
  const after = text.slice(index, index + 160);
  const before = text.slice(Math.max(0, index - 90), index);
  const chanceClause = after.split(/\.\s/)[0] ?? after;
  const stackAfter = chanceClause.match(
    /(?:stack|stacks) of ([A-Z][A-Za-z][A-Za-z'’]*(?:[ -][A-Z][A-Za-z'’]*)*)/i,
  );
  const stackBefore = before.match(
    /each stacks? of ([A-Z][A-Za-z][A-Za-z'’]*(?:[ -][A-Z][A-Za-z'’]*)*)/i,
  );
  const stackName = keepName(stackAfter?.[1] ?? stackBefore?.[1]);

  if (
    /^[^.]{0,24}chance/i.test(after) ||
    /chance\s*$/i.test(before.slice(-18)) ||
    /chance to (?:gain|apply|grant|afflict|inflict)/i.test(before)
  ) {
    const afflictStatus = STATUS_NAMES.find((name) =>
      new RegExp(
        String.raw`afflict(?:s|ing)?(?:\s+the target)?(?:\s+with)?\s+${name}`,
        "i",
      ).test(after),
    );
    if (afflictStatus) return `${afflictStatus} Chance`;
    const gainStatus = STATUS_NAMES.find((name) =>
      new RegExp(String.raw`(?:gain|gains)\s+${name}`, "i").test(before),
    );
    if (gainStatus) return `${gainStatus} Chance`;
    if (stackName) return `${stackName} Chance`;
    const granted = STATUS_NAMES.filter((name) =>
      new RegExp(String.raw`\b${name}\b`).test(chanceClause),
    );
    if (granted.includes("Cleanse")) return "Cleanse Chance";
    const alsoBuffsStat =
      /increase\s+(?:your\s+)?(?:Strength|Instinct|Intelligence|Initiative)\b/i.test(
        chanceClause,
      );
    if (granted.length === 1 && !alsoBuffsStat) return `${granted[0]} Chance`;
    if (habitTitle) return `${habitTitle} Chance`;
    return "Chance";
  }
  if (
    /damage rate/i.test(before.slice(-24)) ||
    /damage rate/i.test(after.slice(0, 24)) ||
    /damage dealt to/i.test(before.slice(-36))
  ) {
    return "Damage Rate";
  }
  if (
    /recovery rate/i.test(before.slice(-24)) ||
    /recovery rate/i.test(after.slice(0, 24))
  ) {
    return "Recovery Rate";
  }
  if (/\bStrength and Intelligence\s+by\s+$/i.test(before)) {
    return "Strength/Intelligence";
  }
  const byStat = before.match(
    /((?:Physical|Tactical|Fire) Damage(?: Received| Dealt)?|Damage Received|Damage Dealt|Recovery(?: Received| Dealt)?|Strength|Instinct|Intelligence|Initiative)\s+(?:\(enhanced by [^)]+\)\s+)?by\s+$/i,
  );
  if (byStat) return collapseScaleLabel(byStat[1]);
  const nearest = nearestStatLabel(before);
  if (nearest) return nearest;
  const afterStat = after.match(
    /((?:Physical|Tactical|Fire) Damage(?: Received| Dealt)?|Damage Received|Damage Dealt|Recovery(?: Received| Dealt)?|Strength|Instinct|Intelligence|Initiative)/i,
  );
  if (afterStat) return collapseScaleLabel(afterStat[1]);
  if (stackName) return stackName;
  return "Value";
}

export function scaleRowsFromRanks(
  ranks: string[],
  habitTitle?: string,
): AbilityScaleRow[] {
  if (ranks.length < 2) return [];
  const tokenLists = ranks.map((text) => [...text.matchAll(PERCENT_RE)]);
  const width = tokenLists[0]?.length ?? 0;
  if (width === 0) return [];
  if (tokenLists.some((list) => list.length !== width)) return [];

  const rows: AbilityScaleRow[] = [];
  const usedLabels = new Map<string, number>();
  for (let i = 0; i < width; i++) {
    const index = tokenLists[0][i].index ?? 0;
    if (isDerivedPercent(ranks[0], index)) continue;
    const values = tokenLists.map((list) =>
      (list[i]?.[0] ?? "").replace(/^\+/, ""),
    );
    if (new Set(values).size <= 1) continue;
    let label = labelForPercent(ranks[0], index, habitTitle);
    const seen = usedLabels.get(label) ?? 0;
    usedLabels.set(label, seen + 1);
    if (seen > 0) label = `${label} (${seen + 1})`;
    rows.push({ label, values });
  }
  return rows;
}

function sourceTitle(
  dragonId: string,
  kind: AbilitySourceKind,
  habit: number | undefined,
  names: string[],
  defines: string[],
): string {
  if (kind === "habit") {
    const official = habitDisplayName(dragonId, habit);
    if (official) return official;
  }
  return defines[0] ?? names[0] ?? sourceLabel(kind, habit);
}

export function namedChips(insight: AbilityInsight): string[] {
  const chips: string[] = [];
  const add = (value: string | undefined) => {
    if (!value || /^habit \d+$/i.test(value)) return;
    if (chips.some((chip) => keyName(chip) === keyName(value))) return;
    chips.push(value);
  };
  add(insight.title);
  for (const name of insight.defines) add(name);
  return chips;
}

export function sourceLabel(
  kind: AbilitySourceKind,
  habit?: number,
  polarity?: StatusPolarity,
): string {
  if (kind === "buff") {
    if (polarity === "debuff") return "Debuff";
    if (polarity === "command") return "Command";
    return "Buff";
  }
  if (kind === "habit") return habit ? `Habit ${habit}` : "Habit";
  if (kind === "vanguard") return "Vanguard";
  return "Command";
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function alreadyExplains(
  text: string,
  name: string,
  definition: string,
): boolean {
  const hay = text.replace(/\s+/g, " ").toLowerCase();
  const snippet = definition.replace(/\s+/g, " ").trim().slice(0, 36).toLowerCase();
  if (snippet.length >= 12 && hay.includes(snippet)) return true;
  if (!name.trim()) return false;
  return new RegExp(
    String.raw`${escapeRe(name)}\s+(?:causes|grants|increases|reduces|prevents)\b`,
    "i",
  ).test(text);
}

function maxStacksNear(name: string, blob: string): number | null {
  const re = new RegExp(
    String.raw`${escapeRe(name)}[\s\S]{0,120}?Max\s+(\d+)\s+Stacks?`,
    "i",
  );
  const hit = blob.match(re)?.[1];
  if (hit) return Number(hit);
  return null;
}

function makeBuffInsight(
  name: string,
  body: string,
  extra?: { dragonId?: string; dragonName?: string },
): AbilityInsight {
  return {
    id: extra?.dragonId ? `${extra.dragonId}:buff:${keyName(name)}` : `buff:${keyName(name)}`,
    dragonId: extra?.dragonId ?? "",
    dragonName: extra?.dragonName ?? "",
    kind: "buff",
    title: name,
    names: [name],
    defines: [name],
    body,
    scale: [],
    glosses: [],
    polarity: polarityForName(name, body),
  };
}

function statusBuffInsights(): AbilityInsight[] {
  return Object.entries(STATUS_GLOSSARY).map(([name, body]) =>
    makeBuffInsight(name, body),
  );
}

function skipExtractedBuff(dragonId: string, name: string): boolean {
  if (statusGlossaryName(name)) return true;
  if ((STATUS_NAMES as readonly string[]).includes(name)) return true;
  for (let habit = 1; habit <= 5; habit++) {
    const official = habitDisplayName(dragonId, habit);
    if (official && keyName(official) === keyName(name)) return true;
  }
  return false;
}

function evenNumberedPhysical(command: string, name: string): string | null {
  if (!new RegExp(String.raw`Grant ${escapeRe(name)} to`, "i").test(command)) {
    return null;
  }
  const hit = command.match(/Even-numbered Rounds:(?:[^.]+|\.\d+)+\./);
  return hit?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

function firstGainsClause(name: string, blob: string): string | null {
  const re = new RegExp(
    String.raw`${escapeRe(name)} gains:${SENTENCE}\.(?:\s+Additionally${SENTENCE}\.)?`,
  );
  const hit = blob.match(re)?.[0];
  return hit ? hit.replace(/\s+/g, " ").trim() : null;
}

function enrichGrantedCommand(
  name: string,
  body: string,
  dragon: Pick<Dragon, "id" | "name" | "command" | "habit">,
  blob: string,
): string {
  let next = body.replace(/\s+/g, " ").trim();
  const even = evenNumberedPhysical(commandLine(dragon), name);
  if (even && !/deal physical damage/i.test(next)) {
    next = `${next} ${even}`;
  }
  const gains = firstGainsClause(name, blob);
  if (gains && !alreadyExplains(next, name, gains)) {
    next = `${next} ${gains}`;
  }
  return next;
}

function gainsScale(dragonId: string, name: string): AbilityScaleRow[] {
  const habits = DRAGON_HABITS[dragonId] ?? [];
  for (let index = 0; index < habits.length; index++) {
    const ranks = habitRankTexts(dragonId, index);
    if (!ranks || ranks.length < 2) continue;
    const needle = `${name} gains:`.toLowerCase();
    const slices = ranks.map((text) => {
      const idx = text.toLowerCase().indexOf(needle);
      return idx >= 0 ? text.slice(idx) : "";
    });
    if (slices.some((slice) => !slice) || new Set(slices).size <= 1) continue;
    const rows = scaleRowsFromRanks(slices, name);
    if (rows.length > 0) return rows;
  }
  return [];
}

const SENTENCE = String.raw`(?:[^.]+|\.\d+)+`;

function extractKitBuffs(
  dragon: Pick<Dragon, "id" | "name" | "command" | "habit">,
  blob: string,
): AbilityInsight[] {
  const byKey = new Map<string, AbilityInsight>();
  // Do not use the `i` flag: TITLE_NAME relies on [A-Z] so "Rising Tide reduces"
  // is not swallowed as the stack name. SENTENCE allows 2.5% without ending early.
  const eachRe = new RegExp(
    String.raw`[Ee]ach stacks? of (${TITLE_NAME})${SENTENCE}\.`,
    "g",
  );
  for (const match of blob.matchAll(eachRe)) {
    const name = keepName(match[1]);
    if (!name || skipExtractedBuff(dragon.id, name)) continue;
    let body = match[0].replace(/\s+/g, " ").trim();
    const max = maxStacksNear(name, blob);
    if (max != null && !/max\s+\d+/i.test(body)) {
      body = `${body.replace(/\.$/, "")}. Max ${max} stacks.`;
    }
    byKey.set(
      keyName(name),
      makeBuffInsight(name, body, {
        dragonId: dragon.id,
        dragonName: dragon.name,
      }),
    );
  }

  const grantRe = new RegExp(
    String.raw`\bGrant (${TITLE_NAME}) to ${SENTENCE}\.(?:\s+When this target${SENTENCE}\.)?`,
    "g",
  );
  for (const match of blob.matchAll(grantRe)) {
    const name = keepName(match[1]);
    if (!name || skipExtractedBuff(dragon.id, name) || byKey.has(keyName(name))) {
      continue;
    }
    const body = match[0].replace(/\s+/g, " ").trim();
    byKey.set(
      keyName(name),
      makeBuffInsight(name, body, {
        dragonId: dragon.id,
        dragonName: dragon.name,
      }),
    );
  }

  for (const insight of byKey.values()) {
    if (insight.polarity !== "command") continue;
    insight.body = enrichGrantedCommand(insight.title, insight.body, dragon, blob);
    insight.polarity = polarityForName(insight.title, insight.body);
    const scale = gainsScale(dragon.id, insight.title);
    if (scale.length > 0) insight.scale = scale;
  }

  return [...byKey.values()];
}

export function glossesForText(
  text: string,
  buffs: AbilityInsight[],
  skipTitle?: string,
): AbilityGloss[] {
  const rows: {
    name: string;
    body: string;
    polarity: StatusPolarity;
    index: number;
  }[] = [];
  const seen = new Set<string>();
  const skip = skipTitle ? keyName(skipTitle) : "";
  for (const buff of buffs) {
    const key = keyName(buff.title);
    if (!key || key === skip || seen.has(key)) continue;
    const idx = text.toLowerCase().indexOf(buff.title.toLowerCase());
    if (idx < 0) continue;
    if (alreadyExplains(text, buff.title, buff.body)) continue;
    seen.add(key);
    rows.push({
      name: buff.title,
      body: buff.body,
      polarity: buff.polarity ?? polarityForName(buff.title, buff.body),
      index: idx,
    });
  }
  return rows
    .sort((a, b) => a.index - b.index)
    .map(({ name, body, polarity }) => ({ name, body, polarity }));
}

function kitBlob(
  dragon: Pick<Dragon, "id" | "name" | "command" | "habit">,
): string {
  const habits = DRAGON_HABITS[dragon.id] ?? [];
  return [
    commandLine(dragon),
    vanguardBonus(dragon),
    ...habits.map((habit) => habit.level1),
  ]
    .filter(Boolean)
    .join(" ");
}

function attachGlosses(
  insights: AbilityInsight[],
  buffs: AbilityInsight[],
): AbilityInsight[] {
  return insights.map((insight) => {
    if (insight.kind === "buff") return insight;
    return {
      ...insight,
      glosses: glossesForText(insight.body, buffs, insight.title),
    };
  });
}

function makeInsight(
  dragon: Pick<Dragon, "id" | "name">,
  kind: AbilitySourceKind,
  body: string,
  extra?: { habit?: number; ranks?: string[] },
): AbilityInsight | null {
  const trimmed = body.trim();
  if (!trimmed || trimmed === "Habits not recorded yet." || trimmed === "Not recorded yet.") {
    return null;
  }
  const names = namedStacksIn(trimmed);
  const defines = definedStacksIn(trimmed);
  const habit = extra?.habit;
  const ranks = extra?.ranks;
  const unlockStars =
    kind === "habit" && habit != null ? HABIT_UNLOCK_STARS[habit - 1] : undefined;
  const title = sourceTitle(dragon.id, kind, habit, names, defines);
  return {
    id:
      kind === "habit"
        ? `${dragon.id}:habit:${habit ?? 0}`
        : `${dragon.id}:${kind}`,
    dragonId: dragon.id,
    dragonName: dragon.name,
    kind,
    habit,
    unlockStars,
    title,
    names,
    defines,
    body: trimmed,
    ranks,
    scale: ranks ? scaleRowsFromRanks(ranks, title) : [],
    glosses: [],
  };
}

function buildForDragon(
  dragon: Pick<Dragon, "id" | "name" | "command" | "habit">,
): AbilityInsight[] {
  const insights: AbilityInsight[] = [];
  const command = makeInsight(dragon, "command", commandLine(dragon));
  if (command) insights.push(command);
  const vanguard = makeInsight(dragon, "vanguard", vanguardBonus(dragon));
  if (vanguard) insights.push(vanguard);
  const habits = DRAGON_HABITS[dragon.id] ?? [];
  habits.forEach((habit, index) => {
    const next = makeInsight(dragon, "habit", habit.level1, {
      habit: index + 1,
      ranks: habitRankTexts(dragon.id, index),
    });
    if (next) insights.push(next);
  });
  return insights;
}

function remember(dragonId: string, insights: AbilityInsight[]) {
  cache.set(dragonId, insights);
  for (const insight of insights) {
    const keys = new Set(
      [insight.title, ...insight.names, ...insight.defines].map(keyName),
    );
    for (const key of keys) {
      if (!key) continue;
      const list = byName.get(key) ?? [];
      if (!list.some((item) => item.id === insight.id)) list.push(insight);
      byName.set(key, list);
    }
  }
}

function officialHabitInsight(
  dragonId: string,
  nameKey: string,
): AbilityInsight | undefined {
  for (let habit = 1; habit <= 5; habit++) {
    const official = habitDisplayName(dragonId, habit);
    if (official && keyName(official) === nameKey) {
      return insightForSource(dragonId, { kind: "habit", habit });
    }
  }
  return undefined;
}

function warmCatalog() {
  if (catalogWarmed) return;
  catalogWarmed = true;
  const statuses = statusBuffInsights();
  remember("status", statuses);
  for (const dragon of DRAGONS) {
    const kit = buildForDragon(dragon);
    const stacks = extractKitBuffs(dragon, kitBlob(dragon));
    remember(dragon.id, [
      ...attachGlosses(kit, [...statuses, ...stacks]),
      ...stacks,
    ]);
  }
}

export function insightsForDragon(
  dragon: Pick<Dragon, "id" | "name" | "command" | "habit">,
): AbilityInsight[] {
  warmCatalog();
  const hit = cache.get(dragon.id);
  if (hit) return hit;
  const built = buildForDragon(dragon);
  remember(dragon.id, built);
  return built;
}

export function insightForSource(
  dragonId: string,
  source: AbilitySourceRef,
): AbilityInsight | undefined {
  warmCatalog();
  const list = cache.get(dragonId);
  if (!list) return undefined;
  return list.find((item) => {
    if (item.kind !== source.kind) return false;
    if (source.kind === "habit") return item.habit === source.habit;
    return true;
  });
}

function scoreInsight(
  insight: AbilityInsight,
  nameKey: string,
  scope?: { dragonId?: string; source?: AbilitySourceRef },
): number {
  let score = 0;
  if (scope?.dragonId && insight.dragonId === scope.dragonId) score += 80;
  if (scope?.source?.kind && insight.kind === scope.source.kind) score += 15;
  if (
    scope?.source?.kind === "habit" &&
    scope.source.habit != null &&
    insight.habit === scope.source.habit
  ) {
    score += 40;
  }
  if (insight.defines.some((name) => keyName(name) === nameKey)) score += 12;
  if (keyName(insight.title) === nameKey) score += 8;
  if (insight.kind === "habit") score += 2;
  return score;
}

export function findAbilityInsight(
  name: string,
  scope?: { dragonId?: string; source?: AbilitySourceRef },
): AbilityInsight | undefined {
  const key = keyName(name);
  if (!key) return undefined;
  warmCatalog();
  if (scope?.dragonId) {
    const official = officialHabitInsight(scope.dragonId, key);
    if (official) return official;
  }
  const matches = byName.get(key) ?? [];
  const status = matches.find(
    (item) => item.kind === "buff" && !item.dragonId && keyName(item.title) === key,
  );
  if (status) return status;
  const stacks = matches.filter(
    (item) => item.kind === "buff" && item.dragonId && keyName(item.title) === key,
  );
  if (stacks.length > 0) {
    const scoped = scope?.dragonId
      ? stacks.find((item) => item.dragonId === scope.dragonId)
      : undefined;
    return scoped ?? stacks[0];
  }
  if (matches.length === 0) return undefined;
  return [...matches].sort(
    (a, b) => scoreInsight(b, key, scope) - scoreInsight(a, key, scope),
  )[0];
}

export function namedAbilityPhrases(): string[] {
  if (namedPhrases) return namedPhrases;
  warmCatalog();
  const names = new Set<string>();
  for (const list of byName.values()) {
    for (const insight of list) {
      names.add(insight.title);
      for (const name of insight.names) names.add(name);
    }
  }
  namedPhrases = [...names].sort((a, b) => b.length - a.length);
  return namedPhrases;
}

/** Buff/debuff color for a named status or stack. Habits stay untyped. */
export function namePolarity(name: string): StatusPolarity | null {
  const key = keyName(name);
  if (!key) return null;
  warmCatalog();
  const matches = byName.get(key) ?? [];
  const buff = matches.find((item) => item.kind === "buff" && item.polarity);
  return buff?.polarity ?? null;
}

export function resolveAbilityInsight(
  options: {
    name?: string;
    dragonId?: string;
    source?: AbilitySourceRef;
    insight?: AbilityInsight | null;
  },
): AbilityInsight | undefined {
  if (options.name) {
    const named = findAbilityInsight(options.name, {
      dragonId: options.dragonId,
      source: options.source,
    });
    if (named) return named;
  }
  if (options.insight) return options.insight;
  if (options.dragonId && options.source) {
    return insightForSource(options.dragonId, options.source);
  }
  return undefined;
}
