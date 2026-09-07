import { findDragon } from "@/lib/dragons";
import { makePick } from "@/lib/lineup";
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
