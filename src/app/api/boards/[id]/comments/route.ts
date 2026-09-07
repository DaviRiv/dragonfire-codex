import { NextResponse } from "next/server";
import { commentOnBoard } from "@/lib/server/boards";
import { getSession, jsonError } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return jsonError("Register an account to leave a note.", 401);
  }
  const { id } = await context.params;
  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return jsonError("Write a note before posting.", 400);
  }
  const result = await commentOnBoard(id, session, body.text ?? "");
  if ("error" in result) return jsonError(result.error, 400);
  return NextResponse.json({ board: result });
}
