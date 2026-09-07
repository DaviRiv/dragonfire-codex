import { NextResponse } from "next/server";
import { getCatalogDragon } from "@/data/dragons";
import { suggestTeamsAround } from "@/lib/ai/around";
import { MODES, TROOP_TYPES } from "@/lib/labels";
import { upsertSuggestedLines } from "@/lib/server/boards";
import { getSession, jsonError } from "@/lib/server/session";
import type { LineupMode, TroopType } from "@/lib/types";

export const runtime = "nodejs";

function isTroop(value: unknown): value is TroopType {
  return (
    typeof value === "string" &&
    (TROOP_TYPES as readonly string[]).includes(value)
  );
}

function isMode(value: unknown): value is LineupMode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return jsonError("Register an account to use Copilot.", 401);
  }
  let body: {
    dragonId?: string;
    stars?: number;
    troop?: string;
    mode?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Pick a dragon and a star rank.", 400);
  }
  const dragon = getCatalogDragon(body.dragonId ?? "");
  if (!dragon) return jsonError("Pick a released dragon.", 400);
  const stars = Math.round(Number(body.stars));
  if (!Number.isInteger(stars) || stars < 1 || stars > 10) {
    return jsonError("Stars must be 1 through 10.", 400);
  }
  if (!isTroop(body.troop)) return jsonError("Pick a troop type.", 400);
  if (!isMode(body.mode)) return jsonError("Pick a march mode.", 400);

  const lines = suggestTeamsAround({
    dragonId: dragon.id,
    stars,
    troop: body.troop,
    mode: body.mode,
  });
  if (lines.length === 0) {
    return jsonError("Copilot could not seat three dragons around that pick.", 422);
  }
  const boards = await upsertSuggestedLines(lines, session.id);
  return NextResponse.json({ boards });
}
