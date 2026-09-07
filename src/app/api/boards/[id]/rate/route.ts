import { NextResponse } from "next/server";
import { rateBoard } from "@/lib/server/boards";
import { getSession, jsonError } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return jsonError("Register an account to rate a line.", 401);
  }
  const { id } = await context.params;
  let body: { stars?: number };
  try {
    body = (await request.json()) as { stars?: number };
  } catch {
    return jsonError("Rate the line from 1 to 5 stars.", 400);
  }
  const result = await rateBoard(id, session, Number(body.stars));
  if ("error" in result) return jsonError(result.error, 400);
  return NextResponse.json({ board: result });
}
