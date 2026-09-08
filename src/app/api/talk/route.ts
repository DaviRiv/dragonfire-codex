import { NextResponse } from "next/server";
import { isTalkCategory } from "@/lib/talk-types";
import { createThread, listThreads } from "@/lib/server/talk";
import { getSession, jsonError } from "@/lib/server/session";
import type { TalkLine } from "@/lib/talk-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("category");
  const category = raw && isTalkCategory(raw) ? raw : undefined;
  const dragonId = url.searchParams.get("dragonId")?.trim() || undefined;
  const threads = await listThreads({ category, dragonId });
  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return jsonError("Register an account to start a thread.", 401);
  }
  let body: {
    title?: string;
    body?: string;
    category?: string;
    boardId?: string | null;
    line?: TalkLine | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Send a title and a first post.", 400);
  }
  const result = await createThread(session, {
    title: body.title ?? "",
    body: body.body ?? "",
    category: body.category,
    boardId: body.boardId,
    line: body.line ?? null,
  });
  if ("error" in result) return jsonError(result.error, 400);
  return NextResponse.json({ thread: result });
}
