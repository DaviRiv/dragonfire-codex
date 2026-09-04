import { NextResponse } from "next/server";
import { localComboLines } from "@/lib/ai/local";
import { completeChat, keyFromRequest } from "@/lib/ai/openai";
import { parseAiLines } from "@/lib/ai/parse";
import { buildUserPrompt } from "@/lib/ai/prompt";
import { parseRosterCards, type SuggestRequest } from "@/lib/ai/roster";
import { MODES, TROOP_TYPES } from "@/lib/labels";
import { emptySlots } from "@/lib/lineup";
import type { Lineup, PitState } from "@/lib/types";

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

function stubLineup(request: SuggestRequest): Lineup {
  return {
    id: "ai-stub",
    name: request.lineupName,
    kind: request.pool === "pit" ? "pit" : "theory",
    mode: request.mode,
    troop: request.troop,
    notes: "",
    slots: emptySlots(),
    ignoreLevel: false,
    craftStars: 10,
    excludeUsed: request.skipUsed,
    updatedAt: new Date().toISOString(),
  };
}

function stubState(request: SuggestRequest): PitState {
  return {
    version: 2,
    owned: request.roster
      .filter((card) => card.owned)
      .map((card) => ({
        id: `own-${card.id}`,
        dragonId: card.id,
        starRank: card.stars ?? 1,
        reignLevel: card.reign ?? 1,
        notes: "",
      })),
    customDragons: [],
    lineups: [stubLineup(request)],
    teams: [],
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
