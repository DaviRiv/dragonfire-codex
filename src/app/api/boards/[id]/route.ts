import { NextResponse } from "next/server";
import { getBoard, toPublicBoard } from "@/lib/server/boards";
import { getSession, jsonError } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getSession();
  const board = await getBoard(id);
  if (!board) return jsonError("That line is not on the board.", 404);
  return NextResponse.json({ board: toPublicBoard(board, session?.id) });
}
