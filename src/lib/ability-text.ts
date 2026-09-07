import { formatRoundTimingSentences } from "@/lib/ability-copy";
import { namedAbilityPhrases, namePolarity } from "@/lib/ability-insight";
import type { DragonStats } from "@/lib/types";

/**
 * Keyword colors used in Game of Thrones: Dragonfire ability text.
 * Physical / Strength are orange, Tactical purple, Fire red-orange,
 * Recovery / healing green, Instinct cyan, Initiative gold,
 * Intelligence violet.
 */
export type GameTone =
  | "physical"
  | "tactical"
  | "fire"
  | "recovery"
  | "strength"
  | "instinct"
  | "intelligence"
  | "initiative"
  | "buff"
  | "debuff"
  | "spread"
  | "command"
  | "dealt"
  | "received"
  | "status";

export interface AbilityToken {
  value: string;
  tone?: GameTone;
}

export const TONE_TEXT_CLASS: Record<GameTone, string> = {
  physical: "font-medium text-df-physical",
  tactical: "font-medium text-df-tactical",
  fire: "font-medium text-df-fire",
  recovery: "font-medium text-df-recovery",
  strength: "font-medium text-df-strength",
  instinct: "font-medium text-df-instinct",
  intelligence: "font-medium text-df-intelligence",
  initiative: "font-medium text-df-initiative",
  buff: "font-medium text-df-buff",
  debuff: "font-medium text-df-debuff",
  spread: "font-medium text-df-buff",
  command: "font-medium text-df-command",
  dealt: "font-medium text-df-dealt",
  received: "font-medium text-df-received",
  status: "font-medium text-df-status",
};

export const TONE_BADGE_CLASS: Record<GameTone, string> = {
  physical: "border-df-physical/40 bg-df-physical/15 text-df-physical",
  tactical: "border-df-tactical/40 bg-df-tactical/15 text-df-tactical",
  fire: "border-df-fire/40 bg-df-fire/15 text-df-fire",
  recovery: "border-df-recovery/40 bg-df-recovery/15 text-df-recovery",
  strength: "border-df-strength/40 bg-df-strength/15 text-df-strength",
  instinct: "border-df-instinct/40 bg-df-instinct/15 text-df-instinct",
  intelligence:
    "border-df-intelligence/40 bg-df-intelligence/15 text-df-intelligence",
  initiative: "border-df-initiative/40 bg-df-initiative/15 text-df-initiative",
  buff: "border-df-buff/40 bg-df-buff/15 text-df-buff",
  debuff: "border-df-debuff/40 bg-df-debuff/15 text-df-debuff",
  spread: "border-df-buff/40 bg-df-buff/15 text-df-buff",
  command: "border-df-command/40 bg-df-command/15 text-df-command",
  dealt: "border-df-dealt/40 bg-df-dealt/15 text-df-dealt",
  received: "border-df-received/40 bg-df-received/15 text-df-received",
  status: "border-df-status/40 bg-df-status/15 text-df-status",
};

export const STAT_TEXT_CLASS: Record<keyof DragonStats, string> = {
  strength: TONE_TEXT_CLASS.strength,
  instinct: TONE_TEXT_CLASS.instinct,
  intelligence: TONE_TEXT_CLASS.intelligence,
  initiative: TONE_TEXT_CLASS.initiative,
};

export const STAT_BAR_CLASS: Record<keyof DragonStats, string> = {
  strength: "bg-gradient-to-r from-df-physical/50 to-df-physical",
  instinct: "bg-gradient-to-r from-df-instinct/50 to-df-instinct",
  intelligence: "bg-gradient-to-r from-df-intelligence/50 to-df-intelligence",
  initiative: "bg-gradient-to-r from-df-initiative/50 to-df-initiative",
};

const ABILITY_PHRASES: { phrase: string; tone: GameTone }[] = [
  { phrase: "Physical damage (Command & Habits)", tone: "physical" },
  { phrase: "Tactical damage received", tone: "tactical" },
  { phrase: "Physical damage received", tone: "physical" },
  { phrase: "Fire damage received", tone: "fire" },
  { phrase: "Tactical damage dealt", tone: "tactical" },
  { phrase: "Physical damage dealt", tone: "physical" },
  { phrase: "Fire damage dealt", tone: "fire" },
  { phrase: "Recovery received", tone: "recovery" },
  { phrase: "Recovery dealt", tone: "recovery" },
  { phrase: "Recovery Rate", tone: "recovery" },
  { phrase: "Recover Rate", tone: "recovery" },
  { phrase: "Damage received", tone: "received" },
  { phrase: "Damage dealt", tone: "dealt" },
  { phrase: "Tactical damage", tone: "tactical" },
  { phrase: "Physical damage", tone: "physical" },
  { phrase: "Fire damage", tone: "fire" },
  { phrase: "Tactical Dmg", tone: "tactical" },
  { phrase: "Physical Dmg", tone: "physical" },
  { phrase: "Fire Dmg", tone: "fire" },
  { phrase: "Command & Habits", tone: "status" },
  { phrase: "First-Strike", tone: "buff" },
  { phrase: "Double-Strike", tone: "buff" },
  { phrase: "Crescent Blade", tone: "spread" },
  { phrase: "Tactical Strike", tone: "command" },
  { phrase: "Blazing Fury", tone: "command" },
  { phrase: "Cleansing Wrath", tone: "command" },
  { phrase: "Bloodscale Terror", tone: "command" },
  { phrase: "Wild Hunt", tone: "command" },
  { phrase: "Breath of Fire", tone: "command" },
  { phrase: "Burning Ward", tone: "command" },
  { phrase: "Whirlwind", tone: "command" },
  { phrase: "Calculated Assault", tone: "command" },
  { phrase: "Relentless Pursuit", tone: "command" },
  { phrase: "Radiant Wings", tone: "command" },
  { phrase: "Cunning Whispers", tone: "command" },
  { phrase: "Resilient Bond", tone: "buff" },
  { phrase: "Fire Ward", tone: "buff" },
  { phrase: "Mirage", tone: "buff" },
  { phrase: "Immunity", tone: "buff" },
  { phrase: "Nullify Recovery", tone: "debuff" },
  { phrase: "Rising Tide", tone: "buff" },
  { phrase: "Stolen Flock", tone: "buff" },
  { phrase: "Solar Flare", tone: "status" },
  { phrase: "Right Flank", tone: "status" },
  { phrase: "Left Flank", tone: "status" },
  { phrase: "Basic Attack", tone: "status" },
  { phrase: "Intelligence", tone: "intelligence" },
  { phrase: "Initiative", tone: "initiative" },
  { phrase: "Strength", tone: "strength" },
  { phrase: "Instinct", tone: "instinct" },
  { phrase: "Recovery", tone: "recovery" },
  { phrase: "Healing", tone: "recovery" },
  { phrase: "Heal", tone: "recovery" },
  { phrase: "Resistance", tone: "buff" },
  { phrase: "Advantage", tone: "buff" },
  { phrase: "Vulnerable", tone: "debuff" },
  { phrase: "Weakened", tone: "debuff" },
  { phrase: "Overwhelm", tone: "debuff" },
  { phrase: "Confusion", tone: "debuff" },
  { phrase: "Protect", tone: "buff" },
  { phrase: "Cleanse", tone: "recovery" },
  { phrase: "Stagger", tone: "physical" },
  { phrase: "Control", tone: "status" },
  { phrase: "Physical", tone: "physical" },
  { phrase: "Tactical", tone: "tactical" },
  { phrase: "Bleed", tone: "physical" },
  { phrase: "Panic", tone: "tactical" },
  { phrase: "Burn", tone: "fire" },
  { phrase: "Taunt", tone: "buff" },
  { phrase: "Stun", tone: "debuff" },
  { phrase: "Prey", tone: "debuff" },
  { phrase: "Slow", tone: "debuff" },
  { phrase: "Evade", tone: "buff" },
  { phrase: "Fire", tone: "fire" },
];

let SORTED_PHRASES: { phrase: string; tone: GameTone }[] | null = null;

function phraseList(): { phrase: string; tone: GameTone }[] {
  if (SORTED_PHRASES) return SORTED_PHRASES;
  const extra = namedAbilityPhrases().map((phrase) => {
    const polarity = namePolarity(phrase);
    return {
      phrase,
      tone: (polarity ?? "status") as GameTone,
    };
  });
  SORTED_PHRASES = [...ABILITY_PHRASES, ...extra].sort(
    (a, b) => b.phrase.length - a.phrase.length,
  );
  return SORTED_PHRASES;
}

const BUFF_RE = /\+\d+(?:\.\d+)?%?/g;
const DEBUFF_RE = /(?:\u2212|(?<!\d)-)\d+(?:\.\d+)?%?/g;

interface Hit {
  start: number;
  end: number;
  tone: GameTone;
}

function isIdentChar(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z0-9]/.test(ch);
}

function hasWordBounds(text: string, start: number, end: number): boolean {
  return !isIdentChar(text[start - 1]) && !isIdentChar(text[end]);
}

function overlaps(hits: Hit[], start: number, end: number): boolean {
  return hits.some((hit) => start < hit.end && end > hit.start);
}

function pushRegexHits(
  text: string,
  regex: RegExp,
  tone: GameTone,
  hits: Hit[],
) {
  regex.lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (!overlaps(hits, start, end)) {
      hits.push({ start, end, tone });
    }
  }
}

export function tokenizeAbilityText(text: string): AbilityToken[] {
  if (!text) return [];
  text = formatRoundTimingSentences(text);

  const hits: Hit[] = [];
  const lower = text.toLowerCase();

  for (const { phrase, tone } of phraseList()) {
    const needle = phrase.toLowerCase();
    let from = 0;
    while (from <= lower.length - needle.length) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      const end = idx + phrase.length;
      if (hasWordBounds(text, idx, end) && !overlaps(hits, idx, end)) {
        hits.push({ start: idx, end, tone });
      }
      from = idx + 1;
    }
  }

  pushRegexHits(text, BUFF_RE, "buff", hits);
  pushRegexHits(text, DEBUFF_RE, "debuff", hits);

  hits.sort((a, b) => a.start - b.start || b.end - a.end);

  const tokens: AbilityToken[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start > cursor) {
      tokens.push({ value: text.slice(cursor, hit.start) });
    }
    tokens.push({ value: text.slice(hit.start, hit.end), tone: hit.tone });
    cursor = hit.end;
  }
  if (cursor < text.length) {
    tokens.push({ value: text.slice(cursor) });
  }
  return tokens;
}

export function toneForPhrase(label: string): GameTone | undefined {
  return tokenizeAbilityText(label).find((token) => token.tone)?.tone;
}
