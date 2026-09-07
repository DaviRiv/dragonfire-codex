import { NextResponse } from "next/server";
import { queryBoards } from "@/lib/server/boards";
import { getSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dragonId = url.searchParams.get("dragonId")?.trim() || undefined;
  const starsRaw = url.searchParams.get("stars");
  const stars =
    starsRaw && /^\d+$/.test(starsRaw) ? Number(starsRaw) : undefined;
  const session = await getSession();
  const boards = await queryBoards({
    dragonId,
    stars: stars && stars >= 1 && stars <= 10 ? stars : undefined,
    viewerId: session?.id,
  });
  return NextResponse.json({ boards });
}
