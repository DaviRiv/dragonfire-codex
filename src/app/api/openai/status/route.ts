import { NextResponse } from "next/server";
import { openaiConfigured } from "@/lib/server/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether the host has a server-side OpenAI key (never exposes the key). */
export async function GET() {
  return NextResponse.json({ available: openaiConfigured() });
}