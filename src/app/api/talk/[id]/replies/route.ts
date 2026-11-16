import { NextResponse } from "next/server";
import { replyToThread } from "@/lib/server/talk";
import { getSession, jsonError } from "@/lib/server/session";
import { guardTalkReply } from "@/lib/server/write-guard";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return jsonError("Register an account to reply.", 401);
  }
  const limited = guardTalkReply(session.id);
  if (!limited.ok) {
    return jsonError(
      `Reply limit reached. Try again in ${limited.retryAfterSec}s.`,
      429,
    );
  }
  const { id } = await context.params;
  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return jsonError("Write something before posting.", 400);
  }
  const result = await replyToThread(id, session, body.text ?? "");
  if ("error" in result) return jsonError(result.error, 400);
  return NextResponse.json({ thread: result });
}
