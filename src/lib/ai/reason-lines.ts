import { explainLineThorough } from "@/lib/ai/coach";
import type { AiLine } from "@/lib/ai/prompt";
import { buildRosterBlock } from "@/lib/ai/prompt";
import type { SuggestRequest } from "@/lib/ai/roster";
import type { PitState } from "@/lib/types";

/** Marker openAiPromptError looks for so reason-line prompts can call /api/openai/complete. */
export const REASON_LINES_MARKER = "REASON_LINES_V1";

export type ReasonLinesContext = {
  request: SuggestRequest;
  state: PitState;
  candidates: AiLine[];
  maxPicks?: number;
  anchorId?: string | null;
  question?: string;
};

function candidateDigest(line: AiLine, index: number, ctx: ReasonLinesContext): string {
  const digest = explainLineThorough(line, ctx.state, ctx.request.pool, {
    compact: true,
  });
  return `${index}. ${line.name} (${line.left}/${line.vanguard}/${line.right}) — ${digest}`;
}

export function buildReasonLinesPrompt(ctx: ReasonLinesContext): string {
  const max = Math.min(ctx.maxPicks ?? 3, ctx.candidates.length, 6);
  const anchor = ctx.anchorId
    ? `Anchor dragon id: ${ctx.anchorId}\n`
    : "";
  const question = ctx.question?.trim()
    ? `Task: ${ctx.question.trim()}\n`
    : "Task: Pick the strongest teams for this roster and filters.\n";

  return `You are the in-app Copilot for Game of Thrones: Dragonfire.
${REASON_LINES_MARKER}

${question}${anchor}Troop: ${ctx.request.troop} (${ctx.request.mode}), pool: ${ctx.request.pool}

Reason from jobs (soak, recovery, finisher), +20% troop affinity, real star ranks, habit unlocks (2/4/6/8/10★), breed partner rules, and status chains. Community meta lines in the notes are hints only — do not copy them blindly when stars, habits, or a missing partner break the synergy.

--- Roster ---
${buildRosterBlock(ctx.request)}

--- Candidate teams (local ranker — pick only by index, do not invent seats) ---
${ctx.candidates.map((line, i) => candidateDigest(line, i, ctx)).join("\n\n")}

Reply with JSON only (no markdown):
{"picks":[{"index":number,"why":"one short sentence"}]}
- Pick exactly ${max} distinct indices (0-based) in best-to-weakest order.
- "why" should cite mechanics (habit live vs locked, flank, partner), not "because meta".`;

}

export function parseReasonLinesResponse(
  text: string,
  candidates: AiLine[],
): AiLine[] | null {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;
  try {
    const payload = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
      picks?: { index?: number; why?: string }[];
    };
    if (!Array.isArray(payload.picks) || payload.picks.length === 0) return null;
    const out: AiLine[] = [];
    const used = new Set<number>();
    for (const pick of payload.picks) {
      const index = pick.index;
      if (typeof index !== "number" || index < 0 || index >= candidates.length) {
        continue;
      }
      if (used.has(index)) continue;
      used.add(index);
      const line = candidates[index];
      const why = pick.why?.trim();
      out.push(why ? { ...line, why } : line);
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

export async function fetchReasonedLines(
  prompt: string,
  candidates: AiLine[],
  signal?: AbortSignal,
): Promise<AiLine[] | null> {
  try {
    const res = await fetch("/api/openai/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      signal,
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { reply?: string };
    if (typeof payload.reply !== "string" || !payload.reply.trim()) return null;
    return parseReasonLinesResponse(payload.reply, candidates);
  } catch {
    return null;
  }
}