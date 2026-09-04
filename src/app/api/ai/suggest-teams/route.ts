import { NextResponse } from "next/server";
import { localComboLines } from "@/lib/ai/local";
import { completeChat, keyFromRequest } from "@/lib/ai/openai";
import { parseAiLines } from "@/lib/ai/parse";
import { buildUserPrompt } from "@/lib/ai/prompt";
import { parseRosterCards, type SuggestRequest } from "@/lib/ai/roster";
import { stubLineup, stubState } from "@/lib/ai/stub";
import { MODES, TROOP_TYPES } from "@/lib/labels";

export const runtime = "nodejs";

function readRequest(body: unknown): SuggestRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Send a roster payload.");
  }
  const row = body as Partial<SuggestRequest>;
  if (row.pool !== "pit" && row.pool !== "hatchery") {
    throw new Error("Pool must be pit or hatchery.");
  }
  if (!TROOP_TYPES.includes(row.troop as SuggestRequest["troop"])) {
    throw new Error("Unknown troop.");
  }
  if (!MODES.includes(row.mode as SuggestRequest["mode"])) {
    throw new Error("Unknown mode.");
  }
  const roster = parseRosterCards(row.roster).slice(0, 80);
  if (roster.length === 0) {
    throw new Error("Roster is empty.");
  }
  const seat = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, 48) : null;
  return {
    pool: row.pool,
    note: typeof row.note === "string" ? row.note.slice(0, 500) : undefined,
    troop: row.troop as SuggestRequest["troop"],
    mode: row.mode as SuggestRequest["mode"],
    skipUsed: Boolean(row.skipUsed),
    lineupName:
      typeof row.lineupName === "string" && row.lineupName.trim()
        ? row.lineupName.trim().slice(0, 80)
        : "Line",
    current: {
      left: seat(row.current?.left),
      vanguard: seat(row.current?.vanguard),
      right: seat(row.current?.right),
    },
    roster,
  };
}

export async function POST(request: Request) {
  try {
    const payload = readRequest(await request.json());
    const userPrompt = buildUserPrompt(payload);
    const auth = keyFromRequest(request);

    if (!auth) {
      const lines = localComboLines(
        stubLineup(payload),
        stubState(payload),
        payload.roster,
      );
      return NextResponse.json({
        source: "local" as const,
        lines,
        warning:
          "Not logged in to OpenAI. Used the local ranker. Log in with an API key, or copy the prompt into ChatGPT.",
      });
    }

    try {
      const raw = await completeChat(auth.key, userPrompt);
      const lines = parseAiLines(
        raw,
        payload.roster,
        payload.troop,
        payload.mode,
      );
      return NextResponse.json({
        source: "model" as const,
        via: auth.source,
        lines,
      });
    } catch (error) {
      const lines = localComboLines(
        stubLineup(payload),
        stubState(payload),
        payload.roster,
      );
      const message =
        error instanceof Error ? error.message : "model failed";
      const who =
        auth.source === "user" ? "your OpenAI key" : "the server key";
      return NextResponse.json({
        source: "local" as const,
        lines,
        warning: `OpenAI failed with ${who} (${message.slice(0, 80)}). Showing the local ranker instead.`,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not suggest teams.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
