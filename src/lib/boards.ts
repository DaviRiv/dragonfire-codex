import { getCatalogDragon } from "@/data/dragons";
import { findDragon } from "@/lib/dragons";
import { COMMENT_MAX } from "@/lib/account";
import { MODES, TROOP_TYPES } from "@/lib/labels";
import { clampStar, makePick } from "@/lib/lineup";
import type { Lineup, LineupMode, TroopType } from "@/lib/types";

export type BoardLine = {
  name: string;
  why: string;
  troop: TroopType;
  mode: LineupMode;
  left: string;
  vanguard: string;
  right: string;
  leftStars: number;
  vanguardStars: number;
  rightStars: number;
};

export type BoardComment = {
  id: string;
  username: string;
  text: string;
  createdAt: string;
};

export type BoardPublic = BoardLine & {
  id: string;
  createdAt: string;
  updatedAt: string;
  average: number | null;
  ratingCount: number;
  myRating: number | null;
  comments: BoardComment[];
};

export function boardFingerprint(line: BoardLine): string {
  return [
    line.left,
    String(line.leftStars),
    line.vanguard,
    String(line.vanguardStars),
    line.right,
    String(line.rightStars),
    line.troop,
    line.mode,
  ].join("|");
}

export function boardHasDragon(
  line: Pick<BoardLine, "left" | "vanguard" | "right" | "leftStars" | "vanguardStars" | "rightStars">,
  dragonId: string,
  stars?: number,
): boolean {
  const seats: [string, number][] = [
    [line.left, line.leftStars],
    [line.vanguard, line.vanguardStars],
    [line.right, line.rightStars],
  ];
  return seats.some(
    ([id, seatStars]) => id === dragonId && (stars == null || seatStars === stars),
  );
}

export function averageStars(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((total, value) => total + value, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function lineupFromBoard(board: BoardLine & { id: string }): Lineup {
  return {
    id: board.id,
    name: board.name,
    kind: "theory",
    mode: board.mode,
    troop: board.troop,
    notes: board.why,
    slots: {
      left: makePick(board.left, board.leftStars, 1),
      vanguard: makePick(board.vanguard, board.vanguardStars, 1),
      right: makePick(board.right, board.rightStars, 1),
    },
    ignoreLevel: true,
    craftStars: Math.max(
      board.leftStars,
      board.vanguardStars,
      board.rightStars,
    ),
    excludeUsed: false,
    updatedAt: new Date().toISOString(),
  };
}

export function boardSeatNames(line: BoardLine): string {
  const left = findDragon(line.left)?.name ?? line.left;
  const vanguard = findDragon(line.vanguard)?.name ?? line.vanguard;
  const right = findDragon(line.right)?.name ?? line.right;
  return `${left} / ${vanguard} / ${right}`;
}

export function describeBoardLine(line: BoardLine): string {
  const left = findDragon(line.left)?.name ?? line.left;
  const vanguard = findDragon(line.vanguard)?.name ?? line.vanguard;
  const right = findDragon(line.right)?.name ?? line.right;
  return `${vanguard} in Vanguard, ${left} on the left, ${right} on the right.`;
}

export function boardLineFromLineup(lineup: Lineup): BoardLine | null {
  const left = lineup.slots.left;
  const vanguard = lineup.slots.vanguard;
  const right = lineup.slots.right;
  if (!left || !vanguard || !right) return null;
  const ids = [left.dragonId, vanguard.dragonId, right.dragonId];
  if (new Set(ids).size !== 3) return null;
  if (!ids.every((id) => getCatalogDragon(id))) return null;
  const draft: BoardLine = {
    name: "",
    why: lineup.notes.trim(),
    troop: lineup.troop,
    mode: lineup.mode,
    left: left.dragonId,
    vanguard: vanguard.dragonId,
    right: right.dragonId,
    leftStars: clampStar(left.starRank),
    vanguardStars: clampStar(vanguard.starRank),
    rightStars: clampStar(right.starRank),
  };
  return {
    ...draft,
    name: boardSeatNames(draft).replace(/ \/ /g, " · "),
    why: draft.why || describeBoardLine(draft),
  };
}

function isTroop(value: unknown): value is TroopType {
  return (
    typeof value === "string" &&
    (TROOP_TYPES as readonly string[]).includes(value)
  );
}

function isMode(value: unknown): value is LineupMode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value);
}

function readSeatStars(value: unknown): number | null {
  const stars = Math.round(Number(value));
  if (!Number.isInteger(stars) || stars < 1 || stars > 10) return null;
  return stars;
}

export function parseBoardLine(raw: unknown): BoardLine | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "Send a three-dragon line." };
  }
  const body = raw as Record<string, unknown>;
  const left = getCatalogDragon(String(body.left ?? ""));
  const vanguard = getCatalogDragon(String(body.vanguard ?? ""));
  const right = getCatalogDragon(String(body.right ?? ""));
  if (!left || !vanguard || !right) {
    return { error: "Each seat needs a released dragon." };
  }
  if (new Set([left.id, vanguard.id, right.id]).size !== 3) {
    return { error: "Use three different dragons." };
  }
  if (!isTroop(body.troop)) return { error: "Pick a troop type." };
  if (!isMode(body.mode)) return { error: "Pick a march mode." };
  const leftStars = readSeatStars(body.leftStars);
  const vanguardStars = readSeatStars(body.vanguardStars);
  const rightStars = readSeatStars(body.rightStars);
  if (leftStars == null || vanguardStars == null || rightStars == null) {
    return { error: "Stars must be 1 through 10." };
  }
  const whyRaw = typeof body.why === "string" ? body.why.trim() : "";
  if (whyRaw.length > COMMENT_MAX) {
    return { error: `Keep the note under ${COMMENT_MAX} characters.` };
  }
  const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
  const draft: BoardLine = {
    name: "",
    why: whyRaw,
    troop: body.troop,
    mode: body.mode,
    left: left.id,
    vanguard: vanguard.id,
    right: right.id,
    leftStars,
    vanguardStars,
    rightStars,
  };
  return {
    ...draft,
    name: nameRaw.slice(0, 80) || boardSeatNames(draft).replace(/ \/ /g, " · "),
    why: draft.why || describeBoardLine(draft),
  };
}
