import { NextResponse } from "next/server";
import { parseBoardLine } from "@/lib/boards";
import { MODES, TROOP_TYPES } from "@/lib/labels";
import { queryBoards, upsertSuggestedLines } from "@/lib/server/boards";
import { getSession, jsonError } from "@/lib/server/session";
import { guardBoardSuggest } from "@/lib/server/write-guard";
import type { LineupMode, TroopType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isTroop(value: string | null): value is TroopType {
  return Boolean(value && (TROOP_TYPES as readonly string[]).includes(value));
}

function isMode(value: string | null): value is LineupMode {
  return Boolean(value && (MODES as readonly string[]).includes(value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dragonId = url.searchParams.get("dragonId")?.trim() || undefined;
  const starsRaw = url.searchParams.get("stars");
  const stars =
    starsRaw && /^\d+$/.test(starsRaw) ? Number(starsRaw) : undefined;
  const troopRaw = url.searchParams.get("troop");
  const modeRaw = url.searchParams.get("mode");
  const session = await getSession();
  const boards = await queryBoards({
    dragonId,
    stars: stars && stars >= 1 && stars <= 10 ? stars : undefined,
    troop: isTroop(troopRaw) ? troopRaw : undefined,
    mode: isMode(modeRaw) ? modeRaw : undefined,
    viewerId: session?.id,
  });
  return NextResponse.json({ boards });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return jsonError("Register an account to post a line for review.", 401);
  }
  const limited = guardBoardSuggest(session.id);
  if (!limited.ok) {
    return jsonError(
      `Board post limit reached. Try again in ${limited.retryAfterSec}s.`,
      429,
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Send a three-dragon line.", 400);
  }
  const parsed = parseBoardLine(body);
  if ("error" in parsed) return jsonError(parsed.error, 400);
  const boards = await upsertSuggestedLines([parsed], session.id);
  const board = boards[0];
  if (!board) return jsonError("Could not save that line.", 500);
  return NextResponse.json({ board });
}
