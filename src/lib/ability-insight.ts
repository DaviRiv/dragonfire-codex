import { DRAGONS } from "@/data/dragons";
import { DRAGON_HABITS } from "@/data/dragon-habits";
import { commandDisplayName } from "@/data/command-names";
import { habitDisplayName } from "@/data/habit-names";
import { HUB_DRAGONS } from "@/data/hub-source";
import {
  STATUS_GLOSSARY,
  statusGlossaryName,
} from "@/data/status-glossary";
import {
  commandLine,
  HABIT_UNLOCK_STARS,
  habitNumberForUnlockStars,
  habitRankTexts,
  vanguardBonus,
} from "@/lib/habits";
import { joinNames } from "@/lib/abilities";
import {
  polarityForName,
  namedStatusPolarity,
  type StatusPolarity,
} from "@/lib/status-polarity";
import type { Dragon } from "@/lib/types";

export { habitDisplayName };
export { commandDisplayName } from "@/data/command-names";
export type { StatusPolarity };

export type AbilitySourceKind = "command" | "vanguard" | "habit" | "buff";

export type AbilityGrant = {
  dragonId: string;
  dragonName: string;
  unlockStars: number | null;
  habit?: number;
  habitName?: string;
};

export type AbilityNeed = {
  stars: number;
  habit: number;
  habitName?: string;
};

export type AbilityGloss = {
  name: string;
  body: string;
  polarity: StatusPolarity;
  unlockStars?: number | null;
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
  unlockStars?: number | null;
  title: string;
  names: string[];
  defines: string[];
  body: string;
  ranks?: string[];
  scale: AbilityScaleRow[];
  glosses: AbilityGloss[];
  polarity?: StatusPolarity;
  /** Hub grant target when this named ability is spread onto an ally. */
  spreadTo?: string;
  grantedBy?: AbilityGrant[];
  neededBy?: { dragonName: string; gates: AbilityNeed[] };
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
  "Nullify Recovery",
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
const GRANT_TARGET = String.raw`(?:1 |an |the )?(?:Ally )?(?:Sentinel|Hunter|Warrior|Champion)s?`;
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
const grantIndex = new Map<string, AbilityGrant[]>();
const needIndex = new Map<string, AbilityNeed[]>();
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

function clauseAround(text: string, index: number): string {
  const before = text.slice(0, index);
  const after = text.slice(index);
  const startHit = before.lastIndexOf(". ");
  const start = startHit >= 0 ? startHit + 2 : 0;
  const next = after.search(/\.\s/);
  const end = next >= 0 ? index + next : text.length;
  return text.slice(start, end);
}

function isCombinedPhysicalFireReceived(clause: string): boolean {
  if (!/Fire Damage Received/i.test(clause)) return false;
  if (/Tactical Damage and Fire Damage Received/i.test(clause)) return true;
  return /Physical Damage(?: \(Command(?: &| and) Habits\))? Received(?: \(Command(?: &| and) Habits\))?/i.test(
    clause,
  );
}

function collapseScaleLabel(label: string): string {
  if (/^Fire Damage Received$/i.test(label)) return "Fire Damage Received";
  if (/Damage Received$/i.test(label)) return "Damage Received";
  if (/Damage Dealt$/i.test(label) && !/Received/i.test(label)) {
    return "Damage Dealt";
  }
  return label;
}

function fireReceivedBand(before: string, after: string): string | null {
  const tail = before.slice(-56);
  const head = after.slice(0, 56);
  if (/75%\s*troop|bellow 75%|below 75%/i.test(before) && /by\s+$/i.test(before)) {
    return "Fire Damage Received (<75%)";
  }
  if (/\btripled\b/i.test(tail) || /below 25%/i.test(head)) {
    return "Fire Damage Received (<25%)";
  }
  if (/\bdoubled\b/i.test(tail) || /below 50%/i.test(head)) {
    return "Fire Damage Received (<50%)";
  }
  return null;
}

function withFireReceivedBand(
  label: string,
  before: string,
  after: string,
): string {
  if (!/^Fire Damage Received$/i.test(label)) return label;
  return fireReceivedBand(before, after) ?? label;
}

const STAT_LABEL_RE =
  /((?:Physical|Tactical|Fire) Damage(?: Received| Dealt)?|Damage Received|Damage Dealt|Recovery(?: Received| Dealt)?|Strength|Instinct|Intelligence|Initiative)/gi;

function isHighestTargeting(before: string, index: number): boolean {
  return /\bhighest\s+$/i.test(before.slice(Math.max(0, index - 12), index));
}

function chanceToNamedStatus(before: string): string | undefined {
  return STATUS_NAMES.find((name) =>
    new RegExp(
      String.raw`\bchance to (?:afflict |apply |inflict |grant |gain )?${name}\b`,
      "i",
    ).test(before),
  );
}

function nearestStatLabel(before: string): string | null {
  let last: string | null = null;
  STAT_LABEL_RE.lastIndex = 0;
  for (const match of before.matchAll(STAT_LABEL_RE)) {
    const index = match.index ?? 0;
    if (isHighestTargeting(before, index)) continue;
    last = match[1] ?? null;
  }
  return last ? collapseScaleLabel(last) : null;
}

function isDerivedPercent(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 64), index);
  if (/double this chance/i.test(before)) return true;
  if (/double this damage/i.test(before)) return true;
  if (/double this effect/i.test(before)) return true;
  if (/double these effects/i.test(before)) return true;
  if (/this damage is doubled/i.test(before)) return true;
  if (/this chance is doubled/i.test(before)) return true;
  if (/and is doubled \(/i.test(before)) return true;
  if (/is doubled if/i.test(before)) return true;
  if (/recovery is doubled/i.test(before)) return true;
  if (/triple the (?:damage|recovery)/i.test(before)) return true;
  if (/1\.5x/i.test(before)) return true;
  if (/by 2x/i.test(before)) return true;
  return false;
}

function chanceClauseAround(after: string): string {
  const first = after.split(/\.\s/)[0] ?? after;
  const rest = after.slice(first.length).replace(/^\.\s*/, "");
  if (!/^Targets that are already afflicted with /i.test(rest)) return first;
  const second = rest.split(/\.\s/)[0] ?? rest;
  return `${first}. ${second}`;
}

function labelForPercent(
  text: string,
  index: number,
  habitTitle?: string,
): string {
  const after = text.slice(index, index + 160);
  const before = text.slice(Math.max(0, index - 90), index);
  const statBefore = text.slice(Math.max(0, index - 160), index);
  const chanceClause = chanceClauseAround(after);
  const stackAfter = chanceClause.match(
    /(?:stack|stacks) of ([A-Z][A-Za-z][A-Za-z'’]*(?:[ -][A-Z][A-Za-z'’]*)*)/i,
  );
  const stackBefore = before.match(
    /each stacks? of ([A-Z][A-Za-z][A-Za-z'’]*(?:[ -][A-Z][A-Za-z'’]*)*)/i,
  );
  const stackName = keepName(stackAfter?.[1] ?? stackBefore?.[1]);

  if (
    /^[+\u2212-]?\d+(?:\.\d+)?%\s*chance/i.test(after) ||
    /^[^.]{0,24}chance/i.test(after) ||
    /chance\s*$/i.test(before.slice(-18)) ||
    /chance to (?:gain|apply|grant|afflict|inflict)/i.test(before) ||
    Boolean(chanceToNamedStatus(before)) ||
    /^[^.]{0,24}to grant\b/i.test(after)
  ) {
    const gainStatus = STATUS_NAMES.find((name) =>
      new RegExp(String.raw`(?:gain|gains)\s+${name}`, "i").test(before),
    );
    if (gainStatus) return `${gainStatus} Chance`;
    const toStatus = chanceToNamedStatus(before);
    if (toStatus) return `${toStatus} Chance`;
    if (stackName) return `${stackName} Chance`;
    const chanceFocus = chanceClause
      .replace(/\b(?:your|a|the)\s+Prey\b/gi, "")
      .replace(
        /\b(?:prioritizes? targets? )?NOT afflicted with [A-Z][A-Za-z-]+/gi,
        "",
      )
      .replace(/\bafflicted with [A-Z][A-Za-z-]+/gi, "");
    const granted = STATUS_NAMES.filter((name) =>
      new RegExp(String.raw`\b${name}\b`).test(chanceFocus),
    ).sort(
      (a, b) =>
        chanceFocus.toLowerCase().indexOf(a.toLowerCase()) -
        chanceFocus.toLowerCase().indexOf(b.toLowerCase()),
    );
    if (/\bImmunity\b/i.test(chanceFocus)) return "Immunity Chance";
    if (granted.includes("Cleanse")) return "Cleanse Chance";
    const alsoBuffsStat =
      /increase\s+(?:(?:your|the)\s+)?(?:Strength|Instinct|Intelligence|Initiative|(?:Physical|Tactical|Fire) Damage Dealt)\b/i.test(
        chanceClause,
      );
    if (granted.length > 1 && !alsoBuffsStat) {
      return `${granted.join(" & ")} Chance`;
    }
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
    /recover(?:y)? rate/i.test(before.slice(-24)) ||
    /recover(?:y)? rate/i.test(after.slice(0, 24)) ||
    /\bthe Recovery to\s+$/i.test(before)
  ) {
    return "Recovery Rate";
  }
  if (/\bStrength and Intelligence\s+by\s+$/i.test(before)) {
    return "Strength/Intelligence";
  }
  if (/\bStrength,? and Instinct\b/i.test(statBefore) && /by\s+$/i.test(statBefore)) {
    return "Strength/Instinct";
  }
  if (/\bStrength and Initiative\b/i.test(before) && /by\s+$/i.test(before)) {
    return "Strength/Initiative";
  }
  if (/\bIntelligence and Instinct\b/i.test(statBefore) && /by\s+$/i.test(statBefore)) {
    return "Intelligence/Instinct";
  }
  if (/\bIntelligence and Initiative\b/i.test(statBefore) && /by\s+$/i.test(statBefore)) {
    return "Intelligence/Initiative";
  }
  if (/\bInstinct and Initiative\b/i.test(statBefore) && /by\s+$/i.test(statBefore)) {
    return "Instinct/Initiative";
  }
  if (
    /highest Strength/i.test(text) &&
    /highest Intelligence/i.test(text) &&
    /highest Instinct/i.test(text) &&
    /highest Initiative/i.test(text) &&
    /by\s+$/i.test(statBefore)
  ) {
    return "Strength/Intelligence/Instinct/Initiative";
  }
  if (/\bEvade\s*\($/i.test(before)) {
    return "Evade Rate";
  }
  if (
    /Fire Damage Dealt/i.test(statBefore) &&
    /each stacks? of /i.test(statBefore) &&
    /by\s+$/i.test(statBefore)
  ) {
    return "Fire Damage Dealt (per Stack)";
  }
  if (
    /(?:Physical|Fire) Damage(?:\s*\([^)]+\))?\s*Received/i.test(statBefore) &&
    /each stacks? of /i.test(statBefore) &&
    /by\s+$/i.test(statBefore)
  ) {
    return "Damage Received (per Stack)";
  }
  if (
    /Fire Damage Dealt/i.test(statBefore) &&
    /by\s+$/i.test(statBefore) &&
    /non-player|Food Tiles|Encounters against Beasts/i.test(after)
  ) {
    return "Fire Damage Dealt (Non-player)";
  }
  if (
    /Physical,\s*Tactical\s+OR\s+Fire Damage Received/i.test(statBefore) &&
    /by\s+$/i.test(statBefore)
  ) {
    return "Damage Received";
  }
  if (
    /by\s+$/i.test(statBefore) &&
    isCombinedPhysicalFireReceived(clauseAround(text, index))
  ) {
    return "Damage Received";
  }
  const byStat = statBefore.match(
    /((?:Physical|Tactical|Fire) Damage(?: Received| Dealt)?|Damage Received|Damage Dealt|Recovery(?: Received| Dealt)?|Strength|Instinct|Intelligence|Initiative)\s+(?:\(enhanced by [^)]+\)\s+)?by\s+$/i,
  );
  // "Enemy with the highest Intelligence by −10%" scales Damage Dealt, not Intelligence.
  if (byStat && !isHighestTargeting(statBefore, byStat.index ?? 0)) {
    const label = withFireReceivedBand(
      collapseScaleLabel(byStat[1]),
      statBefore,
      after,
    );
    if (
      /^Initiative$/i.test(label) &&
      /\bincrease\s+initiative\b/i.test(text) &&
      /\breduce\s+initiative\b/i.test(text)
    ) {
      if (/\breduce\b/i.test(statBefore)) return "Initiative (Reduction)";
      if (/\bincrease\b/i.test(statBefore)) return "Initiative (Increase)";
    }
    return label;
  }
  const nearest = nearestStatLabel(statBefore);
  if (nearest) return withFireReceivedBand(nearest, statBefore, after);
  const afterStat = after.match(
    /((?:Physical|Tactical|Fire) Damage(?: Received| Dealt)?|Damage Received|Damage Dealt|Recovery(?: Received| Dealt)?|Strength|Instinct|Intelligence|Initiative)/i,
  );
  if (afterStat) {
    return withFireReceivedBand(collapseScaleLabel(afterStat[1]), before, after);
  }
  if (stackName) return stackName;
  const band = fireReceivedBand(statBefore, after);
  if (band) return band;
  return "Value";
}

function baseScaleLabel(label: string): string {
  return label.replace(/ \(\d+\)$/, "");
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
    const valuesKey = values.join(",");
    if (
      /^Fire Damage Received$/i.test(label) &&
      rows.some(
        (row) =>
          /^Damage Received$/i.test(row.label) &&
          row.values.join(",") === valuesKey,
      )
    ) {
      continue;
    }
    if (
      rows.some(
        (row) =>
          baseScaleLabel(row.label) === label && row.values.join(",") === valuesKey,
      )
    ) {
      continue;
    }
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
  if (kind === "command") return commandDisplayName(dragonId) ?? "Command";
  if (kind === "vanguard") return "Vanguard";
  return defines[0] ?? names[0] ?? sourceLabel(kind, habit);
}

export function namedChips(insight: AbilityInsight): string[] {
  const chips: string[] = [];
  const add = (value: string | undefined) => {
    if (!value || /^(habit \d+|command|vanguard)$/i.test(value)) return;
    if (chips.some((chip) => keyName(chip) === keyName(value))) return;
    chips.push(value);
  };
  add(insight.title);
  for (const name of insight.defines) add(name);
  if (insight.kind === "command") {
    for (const name of insight.names) add(name);
  }
  return chips;
}

export function sourceLabel(
  kind: AbilitySourceKind,
  habit?: number,
  polarity?: StatusPolarity,
): string {
  if (kind === "buff") {
    if (polarity === "debuff") return "Debuff";
    if (polarity === "spread") return "Spreading buff";
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
    String.raw`${escapeRe(name)}(?:\s+effects)?\s+(?:causes?|grants|increases?|reduces|prevents|include)\b`,
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
  extra?: {
    dragonId?: string;
    dragonName?: string;
    spreadTo?: string;
    unlockStars?: number | null;
  },
): AbilityInsight {
  const polarity = extra?.spreadTo
    ? "spread"
    : polarityForName(name, body);
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
    polarity,
    spreadTo: extra?.spreadTo,
    unlockStars: extra?.unlockStars,
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
  const command = commandDisplayName(dragonId);
  if (command && keyName(command) === keyName(name)) return true;
  return false;
}

function evenNumberedPhysical(command: string, name: string): string | null {
  if (!new RegExp(String.raw`Grant ${escapeRe(name)} to`, "i").test(command)) {
    return null;
  }
  const hit = command.match(/Even-numbered Rounds:(?:[^.]+|\.\d+)+\./);
  return hit?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

function whenThisTarget(blob: string): string | null {
  const hit = blob.match(/When this target(?:[^.]+|\.\d+)+\./);
  return hit?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

function oncePerRound(blob: string): string | null {
  const hit = blob.match(/This effect cannot trigger more than once per round\./);
  return hit?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

function grantTarget(blob: string, name: string): string | null {
  const re = new RegExp(
    String.raw`Grant ${escapeRe(name)} to (${GRANT_TARGET})`,
    "i",
  );
  const hit = blob.match(re)?.[1];
  return hit ? hit.replace(/\s+/g, " ").trim() : null;
}

function keepGrantTarget(raw: string | undefined): string | undefined {
  const value = raw?.replace(/\s+/g, " ").trim();
  return value || undefined;
}

function mentionsAbility(text: string, name: string): boolean {
  if (!text.trim()) return false;
  const key = keyName(name);
  if (namedStacksIn(text).some((item) => keyName(item) === key)) return true;
  return new RegExp(String.raw`\b${escapeRe(name)}\b`, "i").test(text);
}

/** Command = null. First habit that names it otherwise. */
function unlockForExtractedBuff(
  dragon: Pick<Dragon, "id" | "command" | "habit">,
  name: string,
): number | null | undefined {
  if (mentionsAbility(commandLine(dragon), name)) return null;
  const habits = DRAGON_HABITS[dragon.id] ?? [];
  for (let index = 0; index < habits.length; index++) {
    if (mentionsAbility(habits[index]?.level1 ?? "", name)) {
      return HABIT_UNLOCK_STARS[index];
    }
  }
  return undefined;
}

export function unlockLabel(stars: number | null | undefined): string | null {
  if (stars === undefined) return null;
  if (stars === null) return "Command";
  return `${stars}★`;
}

export function grantLabel(grant: AbilityGrant): string {
  return [grant.dragonName, grant.habitName, unlockLabel(grant.unlockStars)]
    .filter(Boolean)
    .join(" · ");
}

export function formatNeedGates(gates: AbilityNeed[]): string {
  const bits = gates.map((gate) => {
    const name = gate.habitName ?? `Habit ${gate.habit}`;
    return `${name} (${gate.stars}★)`;
  });
  return joinNames(bits);
}

const SENTENCE = String.raw`(?:[^.]+|\.\d+)+`;

function firstGainsClause(name: string, blob: string): string | null {
  const re = new RegExp(
    String.raw`${escapeRe(name)} gains:${SENTENCE}\.(?:\s+Additionally${SENTENCE}\.)?`,
  );
  const hit = blob.match(re)?.[0];
  return hit ? hit.replace(/\s+/g, " ").trim() : null;
}

function enrichSpreadBuff(
  name: string,
  body: string,
  dragon: Pick<Dragon, "id" | "name" | "command" | "habit">,
  blob: string,
): string {
  const hay = `${body} ${blob}`;
  const parts: string[] = [];
  const when = whenThisTarget(body) ?? whenThisTarget(hay);
  if (when) parts.push(when);
  const once = when ? oncePerRound(body) ?? oncePerRound(hay) : null;
  if (once) parts.push(once);
  const even = evenNumberedPhysical(commandLine(dragon), name);
  if (even && !parts.some((part) => /deal physical damage/i.test(part))) {
    parts.push(even);
  }
  const gains = firstGainsClause(name, blob);
  if (gains && !alreadyExplains(parts.join(" "), name, gains)) {
    parts.push(gains);
  }
  if (parts.length > 0) return parts.join(" ");
  return body.replace(/\s+/g, " ").trim();
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

function extractKitBuffs(
  dragon: Pick<Dragon, "id" | "name" | "command" | "habit">,
  blob: string,
): AbilityInsight[] {
  const byKey = new Map<string, AbilityInsight>();
  // Do not use the `i` flag: TITLE_NAME relies on [A-Z] so "Rising Tide reduces"
  // is not swallowed as the stack name. SENTENCE allows 2.5% without ending early.
  const eachRe = new RegExp(
    String.raw`[Ee]ach [Ss]tacks? of (${TITLE_NAME})${SENTENCE}\.`,
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
        unlockStars: unlockForExtractedBuff(dragon, name),
      }),
    );
  }

  const grantRe = new RegExp(
    String.raw`\bGrant (${TITLE_NAME}) to (${GRANT_TARGET})${SENTENCE}\.(?:\s+When this target${SENTENCE}\.(?:\s+This effect cannot trigger${SENTENCE}\.)?)?`,
    "g",
  );
  for (const match of blob.matchAll(grantRe)) {
    const name = keepName(match[1]);
    if (!name || skipExtractedBuff(dragon.id, name) || byKey.has(keyName(name))) {
      continue;
    }
    const spreadTo =
      keepGrantTarget(match[2]) ?? grantTarget(blob, name) ?? undefined;
    const body = match[0].replace(/\s+/g, " ").trim();
    byKey.set(
      keyName(name),
      makeBuffInsight(name, body, {
        dragonId: dragon.id,
        dragonName: dragon.name,
        spreadTo,
        unlockStars: unlockForExtractedBuff(dragon, name),
      }),
    );
  }

  for (const insight of byKey.values()) {
    if (insight.polarity !== "spread") continue;
    insight.body = enrichSpreadBuff(insight.title, insight.body, dragon, blob);
    insight.spreadTo =
      insight.spreadTo ?? grantTarget(blob, insight.title) ?? undefined;
    insight.polarity = "spread";
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
    unlockStars?: number | null;
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
      unlockStars: buff.dragonId ? buff.unlockStars : undefined,
      index: idx,
    });
  }
  return rows
    .sort((a, b) => a.index - b.index)
    .map(({ name, body, polarity, unlockStars }) => ({
      name,
      body,
      polarity,
      unlockStars,
    }));
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

function preferredGrant(grants: AbilityGrant[]): AbilityGrant {
  return [...grants].sort((a, b) => {
    const left = a.unlockStars ?? 0;
    const right = b.unlockStars ?? 0;
    if (left !== right) return left - right;
    return a.dragonName.localeCompare(b.dragonName);
  })[0]!;
}

function indexHubGates() {
  grantIndex.clear();
  needIndex.clear();
  for (const dragon of DRAGONS) {
    for (const gate of dragon.provides ?? []) {
      const key = keyName(gate.ability);
      if (!key || key === "recovery") continue;
      if (
        !statusGlossaryName(gate.ability) &&
        !(STATUS_NAMES as readonly string[]).some(
          (name) => keyName(name) === key,
        )
      ) {
        continue;
      }
      const habit = habitNumberForUnlockStars(gate.unlockStars) ?? undefined;
      const grant: AbilityGrant = {
        dragonId: dragon.id,
        dragonName: dragon.name,
        unlockStars: gate.unlockStars,
        habit,
        habitName: habit ? habitDisplayName(dragon.id, habit) : undefined,
      };
      const list = grantIndex.get(key) ?? [];
      if (!list.some((row) => row.dragonId === grant.dragonId && row.habit === grant.habit)) {
        list.push(grant);
      }
      grantIndex.set(key, list);
    }
    for (const gate of dragon.needs ?? []) {
      const habit = habitNumberForUnlockStars(gate.unlockStars);
      if (habit == null) continue;
      const mapKey = `${dragon.id}::${keyName(gate.ability)}`;
      const list = needIndex.get(mapKey) ?? [];
      if (!list.some((row) => row.habit === habit)) {
        list.push({
          stars: HABIT_UNLOCK_STARS[habit - 1],
          habit,
          habitName: habitDisplayName(dragon.id, habit),
        });
      }
      needIndex.set(mapKey, list.sort((a, b) => a.stars - b.stars));
    }
  }
  for (const raw of HUB_DRAGONS) {
    for (const need of raw.needs) {
      if (need.habit == null || need.habit < 1) continue;
      const mapKey = `${raw.id}::${keyName(need.ability)}`;
      const list = needIndex.get(mapKey) ?? [];
      if (!list.some((row) => row.habit === need.habit)) {
        list.push({
          stars: HABIT_UNLOCK_STARS[need.habit - 1],
          habit: need.habit,
          habitName: habitDisplayName(raw.id, need.habit),
        });
      }
      needIndex.set(mapKey, list.sort((a, b) => a.stars - b.stars));
    }
  }
}

export function providersOf(name: string): AbilityGrant[] {
  warmCatalog();
  return grantIndex.get(keyName(name)) ?? [];
}

function needsOf(dragonId: string, name: string): AbilityNeed[] {
  return needIndex.get(`${dragonId}::${keyName(name)}`) ?? [];
}

function decorateStatus(
  status: AbilityInsight,
  scope?: { dragonId?: string },
): AbilityInsight {
  const providers = providersOf(status.title);
  const self = scope?.dragonId
    ? providers.filter((grant) => grant.dragonId === scope.dragonId)
    : [];
  const scopedDragon = scope?.dragonId
    ? DRAGONS.find((dragon) => dragon.id === scope.dragonId)
    : undefined;
  const gates = scope?.dragonId ? needsOf(scope.dragonId, status.title) : [];
  const neededBy =
    scopedDragon && gates.length > 0
      ? { dragonName: scopedDragon.name, gates }
      : undefined;
  if (self.length > 0) {
    const grant = preferredGrant(self);
    return {
      ...status,
      id: `${grant.dragonId}:buff:${keyName(status.title)}`,
      dragonId: grant.dragonId,
      dragonName: grant.dragonName,
      unlockStars: grant.unlockStars,
      habit: grant.habit,
      grantedBy: self,
      neededBy,
    };
  }
  return {
    ...status,
    grantedBy: providers,
    neededBy,
  };
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

function officialCommandInsight(
  dragonId: string,
  nameKey: string,
): AbilityInsight | undefined {
  const official = commandDisplayName(dragonId);
  if (official && keyName(official) === nameKey) {
    return insightForSource(dragonId, { kind: "command" });
  }
  return undefined;
}

function warmCatalog() {
  if (catalogWarmed) return;
  catalogWarmed = true;
  indexHubGates();
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
    const command = officialCommandInsight(scope.dragonId, key);
    if (command) return command;
  }
  const matches = byName.get(key) ?? [];
  const status = matches.find(
    (item) => item.kind === "buff" && !item.dragonId && keyName(item.title) === key,
  );
  if (status) return decorateStatus(status, scope);
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
  return buff?.polarity ?? namedStatusPolarity(name);
}

/** Arrow mark in kit text: named buffs, debuffs, and spreading buffs only. */
export function statusMarkPolarity(name: string): StatusPolarity | null {
  return namePolarity(name);
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
