import { MODES, TROOP_TYPES } from "@/lib/labels";
import type { AiLine } from "@/lib/ai/prompt";
import type { RosterCard } from "@/lib/ai/roster";
import type { LineupMode, TroopType } from "@/lib/types";

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : trimmed;
  const start = body.search(/[\[{]/);
  if (start < 0) throw new Error("The model did not return JSON.");
  return JSON.parse(body.slice(start));
}

function asTroop(value: unknown, fallback: TroopType): TroopType {
  return TROOP_TYPES.includes(value as TroopType)
    ? (value as TroopType)
    : fallback;
}

function asMode(value: unknown, fallback: LineupMode): LineupMode {
  return MODES.includes(value as LineupMode) ? (value as LineupMode) : fallback;
}

function resolveId(value: unknown, roster: RosterCard[]): string | null {
  if (typeof value !== "string") return null;
  const want = value.trim().toLowerCase();
  if (!want) return null;
  const hit = roster.find(
    (card) =>
      card.id.toLowerCase() === want || card.name.toLowerCase() === want,
  );
  return hit?.id ?? null;
}

export function parseAiLines(
  raw: string,
  roster: RosterCard[],
  fallbackTroop: TroopType,
  fallbackMode: LineupMode,
): AiLine[] {
  const parsed = extractJson(raw);
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "lines" in parsed
      ? (parsed as { lines: unknown }).lines
      : null;
  if (!Array.isArray(rows)) throw new Error("JSON needs a lines array.");

  const lines: AiLine[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const left = resolveId(item.left, roster);
    const vanguard = resolveId(item.vanguard, roster);
    const right = resolveId(item.right, roster);
    if (!left || !vanguard || !right) continue;
    if (new Set([left, vanguard, right]).size !== 3) continue;
    const why =
      typeof item.why === "string" && item.why.trim()
        ? item.why.trim()
        : "Three-dragon line from the roster.";
    const name =
      typeof item.name === "string" && item.name.trim()
        ? item.name.trim().slice(0, 48)
        : "Suggested line";
    lines.push({
      name,
      troop: asTroop(item.troop, fallbackTroop),
      mode: asMode(item.mode, fallbackMode),
      left,
      vanguard,
      right,
      why: why.slice(0, 240),
    });
  }
  if (lines.length === 0) {
    throw new Error("No valid three-dragon lines came back.");
  }
  return lines.slice(0, 3);
}
