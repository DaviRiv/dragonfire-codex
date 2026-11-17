import type { CompRole } from "@/lib/roles";
import type { LineupMode, TroopType } from "@/lib/types";

/**
 * Text parsing for Copilot follow-ups. Pure string work only — no roster,
 * ranking, or game rules live here.
 */
export type TurnIntent =
  | "formation"
  | "another"
  | "explain"
  | "compare"
  | "seat"
  | "reset";

/** Troop named in the text, or null when the player did not say one. */
export function detectTroop(text: string): TroopType | null {
  const hay = text.toLowerCase();
  if (/\bspear/.test(hay)) return "spearmen";
  if (/\bcav|\bcavalry|\bhorse/.test(hay)) return "cavalry";
  if (/\barch|\bbow/.test(hay)) return "archers";
  if (/\bsiege/.test(hay)) return "siege";
  if (/\bshield/.test(hay)) return "shieldbearers";
  return null;
}

/** Mode named in the text, or null when the player did not say one. */
export function detectMode(text: string): LineupMode | null {
  const hay = text.toLowerCase();
  if (/\brally/.test(hay)) return "rally";
  // Bare "keep" would read "keep Vhagar" as Castle Defense.
  if (/\bdefen|\bkeep watch|\bkeep defen/.test(hay)) return "defense";
  if (/\bgather/.test(hay)) return "gathering";
  if (/\bpve|\bcampaign|\btile/.test(hay)) return "pve";
  if (/\bpvp\b|\bplayer|\bonline\b/.test(hay)) return "pvp";
  return null;
}

export function detectIntent(text: string): TurnIntent {
  const hay = text.toLowerCase().trim();
  if (
    /\b(start over|start again|reset|from scratch|forget (that|it)|clear (the )?(chat|thread)|use everyone|include everyone|everyone is free|all of them are free)\b/.test(
      hay,
    )
  ) {
    return "reset";
  }
  if (
    /\b(seat|save|go with|take|lock in|use)\b[^.?!]{0,24}\b(first|second|third|1st|2nd|3rd|last|one|two|three)\b[^.?!]{0,12}\b(option|line|team|core|formation)?/.test(
      hay,
    ) &&
    /\b(option|line|team|core|formation|one|1st|2nd|3rd|first|second|third)\b/.test(
      hay,
    ) &&
    !/\b(compare|why|another|different|else)\b/.test(hay)
  ) {
    return "seat";
  }
  if (
    /\b(compare|which (one )?(of (those|them|these)|is)|which is (better|best|stronger|strongest)|strongest|stronger|better of|rank (those|them)|head to head)\b/.test(
      hay,
    )
  ) {
    return "compare";
  }
  if (/\bwhy\b|\bexplain\b|\bhow come\b|\breason(ing)?\b|\bbecause\b/.test(hay)) {
    return "explain";
  }
  if (
    /\b(another|other option|other options|something else|anything else|different one|different line|one more|alternative|alternatives|more options|next option|try again)\b/.test(
      hay,
    )
  ) {
    return "another";
  }
  return "formation";
}

/** Zero-based option index the player pointed at, or null. */
export function detectOrdinal(text: string): number | null {
  const hay = text.toLowerCase();
  if (/\b(first|1st|number one|option 1|#1)\b/.test(hay)) return 0;
  if (/\b(second|2nd|number two|option 2|#2)\b/.test(hay)) return 1;
  if (/\b(third|3rd|number three|option 3|#3)\b/.test(hay)) return 2;
  return null;
}

/** Job the player pointed at — "replace the healer", "who soaks". */
export function detectRoleTarget(text: string): CompRole | null {
  const hay = text.toLowerCase();
  if (/\bheal(er|ers|ing)?\b|\brecovery\b/.test(hay)) return "healing";
  if (/\btank|\bsoak|\btaunt|\bwall\b|\bfront ?line\b/.test(hay)) return "tanking";
  if (/\bdps\b|\bdamage dealer\b|\bfinisher\b|\bcarry\b|\bnuke/.test(hay)) {
    return "damage";
  }
  if (/\bcrowd control\b|\bcc\b|\bstun|\bpanic|\bcontrol\b/.test(hay)) {
    return "control";
  }
  return null;
}

const NEG_BEFORE =
  /\b(without|skip|skipping|replace|replacing|remove|removing|drop|dropping|exclude|excluding|leave out|leaving out|instead of|other than|minus|no|not|lose|losing|bench|benching|besides)\s+(the\s+|my\s+)?$/i;

const NEG_AFTER =
  /^\s*(is\s+|are\s+)?(busy|marching|already|taken|out|unavailable|elsewhere|on another)/i;

const POS_BEFORE =
  /\b(use|using|include|including|with|keep|keeping|bring back|add|adding|put|free|reuse)\s+(the\s+|my\s+)?$/i;

export type NameHit = { id: string; name: string; at: number };

/**
 * Roster names mentioned in the text. Matching is whole-word and needs three
 * characters so "arc" in "archers" cannot seat Arrax.
 */
export function findRosterNames(
  text: string,
  roster: { id: string; name: string }[],
): NameHit[] {
  const hits: NameHit[] = [];
  const seen = new Set<string>();
  for (const card of roster) {
    for (const needle of [card.name, card.id]) {
      if (needle.length < 3) continue;
      const re = new RegExp(`\\b${escapeRe(needle)}\\b`, "i");
      const found = re.exec(text);
      if (!found) continue;
      if (seen.has(card.id)) break;
      seen.add(card.id);
      hits.push({ id: card.id, name: card.name, at: found.index });
      break;
    }
  }
  return hits.sort((a, b) => a.at - b.at);
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type NameDirection = { exclude: string[]; include: string[] };

/**
 * Split mentioned names into "leave this one out" and "bring this one back"
 * using the words right around each name.
 */
export function directNames(
  text: string,
  roster: { id: string; name: string }[],
): NameDirection {
  const exclude: string[] = [];
  const include: string[] = [];
  for (const hit of findRosterNames(text, roster)) {
    const label = text.slice(hit.at).match(/^[^\s,.;!?]+/)?.[0] ?? hit.name;
    const before = text.slice(Math.max(0, hit.at - 32), hit.at);
    const after = text.slice(hit.at + label.length, hit.at + label.length + 28);
    if (NEG_BEFORE.test(before) || NEG_AFTER.test(after)) {
      exclude.push(hit.id);
      continue;
    }
    if (POS_BEFORE.test(before)) include.push(hit.id);
  }
  return { exclude, include };
}

/**
 * First dragon named as the subject to build a team around (e.g. "build me a
 * team around vhagar", "vhagar pvp", "who pairs with malachite"), ignoring
 * dragons that were explicitly excluded ("without vhagar", "replace vhagar").
 */
export function detectAnchor(
  text: string,
  roster: { id: string; name: string }[],
): string | null {
  const dir = directNames(text, roster);
  const excluded = new Set(dir.exclude);
  for (const hit of findRosterNames(text, roster)) {
    if (!excluded.has(hit.id)) return hit.id;
  }
  return null;
}
