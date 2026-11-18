import { CATALOG_IDS } from "@/data/dragons";
import { MODES, TROOP_TYPES } from "@/lib/labels";
import type { TalkLine } from "@/lib/talk-types";
import type { LineupMode, TroopType } from "@/lib/types";

const LINE_NAME_MAX = 120;
const DRAGON_ID_MAX = 48;
const BOARD_ID_MAX = 72;
const BOARD_ID_RE = /^brd_[0-9a-f]{8,64}$/;
/** Serialized lineup JSON must stay small inside the shared talk store. */
const LINE_JSON_MAX = 600;

function dragonSlot(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim().slice(0, DRAGON_ID_MAX);
  if (!id || !CATALOG_IDS.has(id)) return null;
  return id;
}

function troop(raw: unknown): TroopType | null {
  return typeof raw === "string" && TROOP_TYPES.includes(raw as TroopType)
    ? (raw as TroopType)
    : null;
}

function mode(raw: unknown): LineupMode | null {
  return typeof raw === "string" && MODES.includes(raw as LineupMode)
    ? (raw as LineupMode)
    : null;
}

export function sanitizeBoardId(
  raw: unknown,
): { boardId: string | null } | { error: string } {
  if (raw == null || raw === "") return { boardId: null };
  if (typeof raw !== "string") {
    return { error: "Invalid board reference." };
  }
  const id = raw.trim();
  if (id.length > BOARD_ID_MAX) {
    return { error: "Board reference is too long." };
  }
  if (!BOARD_ID_RE.test(id)) {
    return { error: "Invalid board reference." };
  }
  return { boardId: id };
}

export function sanitizeTalkLine(
  raw: unknown,
): { line: TalkLine | null } | { error: string } {
  if (raw == null) return { line: null };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "Invalid lineup attachment." };
  }
  const row = raw as Record<string, unknown>;
  const name =
    typeof row.name === "string" ? row.name.trim().slice(0, LINE_NAME_MAX) : "";
  if (!name) return { error: "Invalid lineup attachment." };
  const troopType = troop(row.troop);
  const lineupMode = mode(row.mode);
  const left = dragonSlot(row.left);
  const vanguard = dragonSlot(row.vanguard);
  const right = dragonSlot(row.right);
  if (!troopType || !lineupMode || !left || !vanguard || !right) {
    return { error: "Invalid lineup attachment." };
  }
  const line: TalkLine = {
    name,
    troop: troopType,
    mode: lineupMode,
    left,
    vanguard,
    right,
  };
  if (JSON.stringify(line).length > LINE_JSON_MAX) {
    return { error: "Lineup attachment is too large." };
  }
  return { line };
}