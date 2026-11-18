import { GAME_FACTS } from "@/data/game-facts";
import { chatgptMetaTemplate } from "@/data/meta";
import { findDragon } from "@/lib/dragons";
import { explainLineThorough } from "@/lib/ai/coach";
import { buildRosterBlock, CHATGPT_EXPORT_RULES, type AiLine } from "@/lib/ai/prompt";
import type { AiPool, SuggestRequest } from "@/lib/ai/roster";
import type { PitState } from "@/lib/types";

export const DEFAULT_CHATGPT_QUESTION =
  "If this is online / PvP DPS and Malachite, Vhagar, and Venator are free in the roster, seat that meta core first. Then give 1–2 alternates from leftovers. Explain Left, Vanguard, and Right in plain English.";

export type ChatGptExportTurn = {
  role: "user" | "assistant";
  text: string;
};

function factsBlock() {
  return GAME_FACTS.map((fact) => `- ${fact}`).join("\n");
}

function header(role: "coach" | "builder") {
  const who =
    role === "coach"
      ? "You are coaching a Game of Thrones: Dragonfire player in ChatGPT."
      : "You are building three-dragon lines for a Game of Thrones: Dragonfire player in ChatGPT.";
  return `${who}

Game facts:
${factsBlock()}

${chatgptMetaTemplate()}

${CHATGPT_EXPORT_RULES}`;
}

export function chatgptSuggestExport(request: SuggestRequest): string {
  const current = `${request.current.left ?? "empty"} / ${request.current.vanguard ?? "empty"} / ${request.current.right ?? "empty"}`;
  const note = request.note?.trim()
    ? `\nPlayer note:\n${request.note.trim()}\n`
    : "";
  return `${header("builder")}

--- Roster ---
${buildRosterBlock(request)}
Line name: ${request.lineupName}
Current seats (L / V / R): ${current}
${note}
${DEFAULT_CHATGPT_QUESTION}`;
}

export function chatgptCoachExport(opts: {
  request: SuggestRequest;
  turns: ChatGptExportTurn[];
  draft?: string;
}): string {
  const conversation = opts.turns
    .map(
      (turn) =>
        `${turn.role === "user" ? "Player" : "Copilot"}: ${turn.text.trim()}`,
    )
    .filter((line) => line.length > 8)
    .join("\n\n");
  const draft = opts.draft?.trim() ?? "";
  const question =
    draft ||
    (opts.turns.length === 0
      ? DEFAULT_CHATGPT_QUESTION
      : "Continue from the conversation above. If you have not already, suggest 2–3 three-dragon lines.");

  return `${header("coach")}

--- Roster ---
${buildRosterBlock(opts.request)}
${conversation ? `\n--- Conversation so far ---\n${conversation}\n` : ""}
--- Current question ---
${question}`;
}

export function copilotChatPrompt(opts: {
  question: string;
  anchorId?: string | null;
  request: SuggestRequest;
  lines: AiLine[];
  turns: ChatGptExportTurn[];
  state: PitState;
}): string {
  const anchorName = opts.anchorId
    ? (findDragon(opts.anchorId)?.name ?? opts.anchorId)
    : null;
  const lineSummary = opts.lines
    .slice(0, 3)
    .map((line, index) => {
      const digest = explainLineThorough(line, opts.state, opts.request.pool, {
        compact: true,
      });
      return `${index + 1}. ${line.name} — ${digest}`;
    })
    .join("\n\n");
  const conversation = opts.turns
    .slice(-6)
    .map(
      (turn) =>
        `${turn.role === "user" ? "Player" : "Copilot"}: ${turn.text.trim()}`,
    )
    .filter((line) => line.length > 8)
    .join("\n\n");

  return `You are the in-app Copilot for Game of Thrones: Dragonfire. Write like a patient coach in 2–4 short paragraphs of plain text (no markdown, no bullet lists, no numbered options in the reply).

The UI already shows team cards with Left / Vanguard / Right — do NOT restate the full roster or repeat card labels. Focus on mechanics: who tanks or mitigates Vanguard, sustain vs burst on the wings, the +20% troop affinity rule, habit flanks, status chains (Burn, Expose, etc.), and breed partner triggers from the verified notes below.

Be thorough but readable. If alternates exist, compare them in one sentence (what swaps and what you trade). Never invent dragons or kits. NEVER praise breaking troop affinity unless the verified data says no full-affinity line exists.

Game facts:
${factsBlock()}

${anchorName ? `Build around: ${anchorName}\n` : ""}Filter troop: ${opts.request.troop}, mode: ${opts.request.mode}, pool: ${opts.request.pool}

Verified teams (ranked — your answer must align with #1):
${lineSummary || "(No complete 3-dragon line matched these filters.)"}

--- Roster context ---
${buildRosterBlock(opts.request)}
${conversation ? `\n--- Recent turns ---\n${conversation}\n` : ""}
Player question: ${opts.question}`;
}

export function chatgptExportFilename(
  kind: "coach" | "suggest",
  pool: AiPool,
) {
  return `dragonfire-chatgpt-${kind}-${pool}.txt`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
