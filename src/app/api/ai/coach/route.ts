import { NextResponse } from "next/server";
import { buildCoachMessages, localCoachAnswer } from "@/lib/ai/coach";
import { completeMessages, keyFromRequest } from "@/lib/ai/openai";
import { parseCoachReply } from "@/lib/ai/parse";
import { parseRosterCards, type SuggestRequest } from "@/lib/ai/roster";
import { stubLineup, stubState } from "@/lib/ai/stub";
import { MODES, TROOP_TYPES } from "@/lib/labels";

export const runtime = "nodejs";

type HistoryTurn = { role: "user" | "assistant"; content: string };

function readCoachRequest(body: unknown): {
  payload: SuggestRequest;
  question: string;
  history: HistoryTurn[];
} {
  if (!body || typeof body !== "object") {
    throw new Error("Send a roster payload.");
  }
  const row = body as Partial<SuggestRequest> & {
    question?: unknown;
    history?: unknown;
  };
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
  const question =
    typeof row.question === "string" ? row.question.trim().slice(0, 800) : "";
  if (!question) throw new Error("Ask something about a formation.");
  const history: HistoryTurn[] = Array.isArray(row.history)
    ? row.history
        .filter(
          (turn): turn is HistoryTurn =>
            Boolean(turn) &&
            typeof turn === "object" &&
            (turn as HistoryTurn).role &&
            typeof (turn as HistoryTurn).content === "string",
        )
        .filter(
          (turn) => turn.role === "user" || turn.role === "assistant",
        )
        .slice(-8)
        .map((turn) => ({
          role: turn.role,
          content: turn.content.slice(0, 1200),
        }))
    : [];
  return {
    question,
    history,
    payload: {
      pool: row.pool,
      note: question,
      troop: row.troop as SuggestRequest["troop"],
      mode: row.mode as SuggestRequest["mode"],
      skipUsed: Boolean(row.skipUsed),
      lineupName:
        typeof row.lineupName === "string" && row.lineupName.trim()
          ? row.lineupName.trim().slice(0, 80)
          : "Coach",
      current: { left: null, vanguard: null, right: null },
      roster,
    },
  };
}

export async function POST(request: Request) {
  try {
    const { payload, question, history } = readCoachRequest(
      await request.json(),
    );
    const lineup = stubLineup(payload);
    const state = stubState(payload);
    const auth = keyFromRequest(request);

    if (!auth) {
      const answer = localCoachAnswer(question, payload, state, lineup);
      return NextResponse.json({
        source: "local" as const,
        reply: answer.reply,
        lines: answer.lines,
        warning:
          "Not logged in to OpenAI. Ranked a line locally. Log in for a real conversation.",
      });
    }

    try {
      const raw = await completeMessages(
        auth.key,
        buildCoachMessages(payload, question, history),
        { temperature: 0.5, timeoutMs: 40000 },
      );
      const parsed = parseCoachReply(
        raw,
        payload.roster,
        payload.troop,
        payload.mode,
      );
      return NextResponse.json({
        source: "model" as const,
        via: auth.source,
        reply: parsed.reply,
        lines: parsed.lines,
      });
    } catch (error) {
      const answer = localCoachAnswer(question, payload, state, lineup);
      const message =
        error instanceof Error ? error.message : "model failed";
      const who =
        auth.source === "user" ? "your OpenAI key" : "the server key";
      return NextResponse.json({
        source: "local" as const,
        reply: answer.reply,
        lines: answer.lines,
        warning: `OpenAI failed with ${who} (${message.slice(0, 80)}). Showing a local line instead.`,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not talk about formations.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
