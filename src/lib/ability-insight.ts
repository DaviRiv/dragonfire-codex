import { DRAGONS } from "@/data/dragons";
import { DRAGON_HABITS } from "@/data/dragon-habits";
import {
  commandLine,
  HABIT_UNLOCK_STARS,
  habitRankTexts,
  vanguardBonus,
} from "@/lib/habits";
import type { Dragon } from "@/lib/types";

export type AbilitySourceKind = "command" | "vanguard" | "habit";

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

function labelForPercent(text: string, index: number): string {
  const after = text.slice(index, index + 160);
  const before = text.slice(Math.max(0, index - 90), index);
  const stackAfter = after.match(
    /(?:stack|stacks) of ([A-Z][A-Za-z][A-Za-z'’]*(?:[ -][A-Z][A-Za-z'’]*)*)/i,
  );
  const stackBefore = before.match(
    /each stacks? of ([A-Z][A-Za-z][A-Za-z'’]*(?:[ -][A-Z][A-Za-z'’]*)*)/i,
  );
  const stackName = keepName(stackAfter?.[1] ?? stackBefore?.[1]);

  if (/double this chance/i.test(before.slice(-28))) {
    return stackName ? `${stackName} chance (doubled)` : "Double chance";
  }
  if (
    /^[^.]{0,24}chance/i.test(after) ||
    /chance\s*$/i.test(before.slice(-18))
  ) {
    return stackName ? `${stackName} chance` : "Chance";
  }
  if (/damage rate/i.test(before.slice(-24)) || /damage rate/i.test(after.slice(0, 24))) {
    return "Damage Rate";
  }
  const stat = `${before} ${after}`.match(
    /((?:Physical|Tactical|Fire) Damage(?: Received| Dealt)?|Damage Received|Damage Dealt|Recovery(?: Received| Dealt)?|Strength|Instinct|Intelligence|Initiative)/i,
  );
  if (stackName && stat) return `${stackName} · ${stat[1]}`;
  if (stat) return stat[1];
  if (stackName) return stackName;
  return "Value";
}

export function scaleRowsFromRanks(ranks: string[]): AbilityScaleRow[] {
  if (ranks.length < 2) return [];
  const tokenLists = ranks.map((text) => [...text.matchAll(PERCENT_RE)]);
  const width = tokenLists[0]?.length ?? 0;
  if (width === 0) return [];
  if (tokenLists.some((list) => list.length !== width)) return [];

  const rows: AbilityScaleRow[] = [];
  const usedLabels = new Map<string, number>();
  for (let i = 0; i < width; i++) {
    const values = tokenLists.map((list) => list[i]?.[0] ?? "");
    if (new Set(values).size <= 1) continue;
    let label = labelForPercent(ranks[0], tokenLists[0][i].index ?? 0);
    const seen = usedLabels.get(label) ?? 0;
    usedLabels.set(label, seen + 1);
    if (seen > 0) label = `${label} (${seen + 1})`;
    rows.push({ label, values });
  }
  return rows;
}

function sourceTitle(
  kind: AbilitySourceKind,
  habit: number | undefined,
  names: string[],
  defines: string[],
): string {
  return defines[0] ?? names[0] ?? sourceLabel(kind, habit);
}

export function sourceLabel(kind: AbilitySourceKind, habit?: number): string {
  if (kind === "habit") return habit ? `Habit ${habit}` : "Habit";
  if (kind === "vanguard") return "Vanguard";
  return "Command";
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
    title: sourceTitle(kind, habit, names, defines),
    names,
    defines,
    body: trimmed,
    ranks,
    scale: ranks ? scaleRowsFromRanks(ranks) : [],
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

function warmCatalog() {
  if (catalogWarmed) return;
  catalogWarmed = true;
  for (const dragon of DRAGONS) {
    remember(dragon.id, buildForDragon(dragon));
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
  const matches = byName.get(key);
  if (!matches || matches.length === 0) return undefined;
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

export function resolveAbilityInsight(
  options: {
    name?: string;
    dragonId?: string;
    source?: AbilitySourceRef;
    insight?: AbilityInsight | null;
  },
): AbilityInsight | undefined {
  if (options.insight) return options.insight;
  if (options.dragonId && options.source && !options.name) {
    return insightForSource(options.dragonId, options.source);
  }
  if (options.name) {
    return findAbilityInsight(options.name, {
      dragonId: options.dragonId,
      source: options.source,
    });
  }
  return undefined;
}
