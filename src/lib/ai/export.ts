import { GAME_FACTS } from "@/data/game-facts";
import { buildRosterBlock, CHATGPT_EXPORT_RULES } from "@/lib/ai/prompt";
import type { AiPool, SuggestRequest } from "@/lib/ai/roster";

export const DEFAULT_CHATGPT_QUESTION =
  "Suggest 2–3 three-dragon lines from this roster and explain Left, Vanguard, and Right in plain English.";

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
        `${turn.role === "user" ? "Player" : "Coach"}: ${turn.text.trim()}`,
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
