import { createHash, randomBytes } from "node:crypto";
import { commentError, sanitizeComment } from "@/lib/account";
import {
  averageStars,
  boardFingerprint,
  boardHasDragon,
  type BoardComment,
  type BoardLine,
  type BoardPublic,
} from "@/lib/boards";
import { mutateJsonFile, readJsonFile } from "@/lib/server/json-store";
import { boardsFile } from "@/lib/server/paths";
import { MAX_BOARDS } from "@/lib/server/store-limits";
import type { SessionUser } from "@/lib/server/session";

export type BoardRating = {
  userId: string;
  stars: number;
  updatedAt: string;
};

export type BoardCommentRecord = BoardComment & {
  userId: string;
};

export type BoardRecord = BoardLine & {
  id: string;
  createdAt: string;
  updatedAt: string;
  ratings: BoardRating[];
  comments: BoardCommentRecord[];
};

type BoardsFile = { boards: BoardRecord[] };

const EMPTY: BoardsFile = { boards: [] };

function boardIdFor(line: BoardLine): string {
  const digest = createHash("sha1")
    .update(boardFingerprint(line))
    .digest("hex")
    .slice(0, 16);
  return `brd_${digest}`;
}

export function toPublicBoard(
  board: BoardRecord,
  viewerId?: string | null,
): BoardPublic {
  const scores = board.ratings.map((row) => row.stars);
  const mine = viewerId
    ? (board.ratings.find((row) => row.userId === viewerId)?.stars ?? null)
    : null;
  return {
    id: board.id,
    name: board.name,
    why: board.why,
    troop: board.troop,
    mode: board.mode,
    left: board.left,
    vanguard: board.vanguard,
    right: board.right,
    leftStars: board.leftStars,
    vanguardStars: board.vanguardStars,
    rightStars: board.rightStars,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    average: averageStars(scores),
    ratingCount: scores.length,
    myRating: mine,
    comments: [...board.comments]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((row) => ({
        id: row.id,
        username: row.username,
        text: row.text,
        createdAt: row.createdAt,
      })),
  };
}

function ratingScore(board: BoardRecord): number {
  const avg = averageStars(board.ratings.map((row) => row.stars)) ?? 0;
  return avg * board.ratings.length + board.comments.length * 0.2;
}

export async function listBoards(): Promise<BoardRecord[]> {
  const file = await readJsonFile(boardsFile(), EMPTY);
  return file.boards;
}

export async function getBoard(id: string): Promise<BoardRecord | null> {
  const boards = await listBoards();
  return boards.find((board) => board.id === id) ?? null;
}

export async function queryBoards(filter: {
  dragonId?: string;
  stars?: number;
  troop?: BoardLine["troop"];
  mode?: BoardLine["mode"];
  viewerId?: string | null;
  limit?: number;
}): Promise<BoardPublic[]> {
  const boards = await listBoards();
  const filtered = boards.filter((board) => {
    if (filter.dragonId && !boardHasDragon(board, filter.dragonId, filter.stars)) {
      return false;
    }
    if (filter.troop && board.troop !== filter.troop) return false;
    if (filter.mode && board.mode !== filter.mode) return false;
    return true;
  });
  filtered.sort((a, b) => {
    const score = ratingScore(b) - ratingScore(a);
    if (score !== 0) return score;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  const limit = filter.limit ?? 40;
  return filtered.slice(0, limit).map((board) => toPublicBoard(board, filter.viewerId));
}

export async function upsertSuggestedLines(
  lines: BoardLine[],
  viewerId?: string | null,
): Promise<BoardPublic[]> {
  const now = new Date().toISOString();
  const order: string[] = [];
  await mutateJsonFile(boardsFile(), EMPTY, (file) => {
    const byId = new Map(file.boards.map((board) => [board.id, board]));
    for (const line of lines) {
      const id = boardIdFor(line);
      order.push(id);
      const existing = byId.get(id);
      if (existing) {
        existing.updatedAt = now;
        continue;
      }
      if (byId.size >= MAX_BOARDS) continue;
      byId.set(id, {
        ...line,
        id,
        createdAt: now,
        updatedAt: now,
        ratings: [],
        comments: [],
      });
    }
    return { boards: [...byId.values()] };
  });
  const boards = await listBoards();
  const map = new Map(boards.map((board) => [board.id, board]));
  return order
    .map((id) => map.get(id))
    .filter((board): board is BoardRecord => Boolean(board))
    .map((board) => toPublicBoard(board, viewerId));
}

export async function rateBoard(
  boardId: string,
  user: SessionUser,
  stars: number,
): Promise<BoardPublic | { error: string }> {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { error: "Rate the line from 1 to 5 stars." };
  }
  const now = new Date().toISOString();
  let missing = false;
  const file = await mutateJsonFile(boardsFile(), EMPTY, (current) => {
    const board = current.boards.find((row) => row.id === boardId);
    if (!board) {
      missing = true;
      return current;
    }
    const existing = board.ratings.find((row) => row.userId === user.id);
    if (existing) {
      existing.stars = stars;
      existing.updatedAt = now;
    } else {
      board.ratings.push({ userId: user.id, stars, updatedAt: now });
    }
    board.updatedAt = now;
    return current;
  });
  if (missing) return { error: "That line is not on the board." };
  const board = file.boards.find((row) => row.id === boardId);
  if (!board) return { error: "That line is not on the board." };
  return toPublicBoard(board, user.id);
}

export async function commentOnBoard(
  boardId: string,
  user: SessionUser,
  textRaw: string,
): Promise<BoardPublic | { error: string }> {
  const err = commentError(textRaw);
  if (err) return { error: err };
  const text = sanitizeComment(textRaw);
  const now = new Date().toISOString();
  let missing = false;
  const file = await mutateJsonFile(boardsFile(), EMPTY, (current) => {
    const board = current.boards.find((row) => row.id === boardId);
    if (!board) {
      missing = true;
      return current;
    }
    board.comments.push({
      id: `cmt_${randomBytes(8).toString("hex")}`,
      userId: user.id,
      username: user.username,
      text,
      createdAt: now,
    });
    board.updatedAt = now;
    return current;
  });
  if (missing) return { error: "That line is not on the board." };
  const board = file.boards.find((row) => row.id === boardId);
  if (!board) return { error: "That line is not on the board." };
  return toPublicBoard(board, user.id);
}
