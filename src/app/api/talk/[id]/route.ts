import { NextResponse } from "next/server";
import { getThread } from "@/lib/server/talk";
import { jsonError } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const thread = await getThread(id);
  if (!thread) return jsonError("That thread is gone.", 404);
  return NextResponse.json({ thread });
}
