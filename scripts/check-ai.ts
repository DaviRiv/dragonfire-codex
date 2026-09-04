/**
 * Ask AI roster + local fallback. Run: npx tsx --tsconfig tsconfig.json scripts/check-ai.ts
 */
import { samplePit } from "@/data/sample";
import { localComboLines } from "@/lib/ai/local";
import { guessTroopMode, localCoachAnswer } from "@/lib/ai/coach";
import { parseAiLines, parseCoachReply } from "@/lib/ai/parse";
import { filledPrompt, makeSuggestRequest } from "@/lib/ai/prompt";
import { isUserApiKey, maskOpenAiKey } from "@/lib/ai/keys";
import { collectRoster } from "@/lib/ai/roster";
import { stubLineup, stubState } from "@/lib/ai/stub";

if (!isUserApiKey("sk-abcdefghijklmnopqrstuvwxyz")) {
  throw new Error("valid key rejected");
}
if (isUserApiKey("not-a-key")) throw new Error("junk key accepted");
if (maskOpenAiKey("sk-abcdefghijklmnopqrstuvwxyz") !== "sk-…wxyz") {
  throw new Error("mask mismatch");
}

const state = samplePit();
const lineup = state.lineups[0];
const pit = collectRoster(state, lineup, "pit");
const hatch = collectRoster(state, lineup, "hatchery");
if (pit.length !== state.owned.length) {
  throw new Error(`pit roster ${pit.length} != owned ${state.owned.length}`);
}
if (hatch.length < 20) throw new Error("hatchery too small");
if (!pit.some((card) => card.otherTeam)) {
  throw new Error("pit roster should tag dragons already on other teams");
}
const request = makeSuggestRequest(lineup, state, "pit", pit, "need a healer");
const prompt = filledPrompt(request);
if (!prompt.includes("vhagar")) throw new Error("missing vhagar");
if (!prompt.includes("Player note")) throw new Error("missing note");
if (!prompt.includes("on:")) throw new Error("missing on: tags");
if (!prompt.includes("Skip other teams is on")) {
  throw new Error("missing skip-used instruction");
}
const lines = localComboLines(lineup, state, pit);
if (lines.length < 1) throw new Error("no local lines");
const parsed = parseAiLines(
  JSON.stringify({ lines }),
  pit,
  "shieldbearers",
  "pvp",
);
if (parsed.length !== lines.length) throw new Error("parse mismatch");
const spear = guessTroopMode("Spear rally with a healer");
if (spear.troop !== "spearmen" || spear.mode !== "rally") {
  throw new Error("guess troop/mode failed");
}
const coach = parseCoachReply(
  JSON.stringify({
    reply: "Run the shield wall.",
    lines,
  }),
  pit,
  "shieldbearers",
  "pvp",
);
if (coach.reply !== "Run the shield wall.") throw new Error("coach reply");
if (coach.lines.length !== lines.length) throw new Error("coach lines");
const local = localCoachAnswer(
  "shield pvp",
  request,
  stubState(request),
  stubLineup(request),
);
if (local.lines.length < 1) throw new Error("local coach empty");
console.log(
  "ok pit",
  pit.length,
  "hatchery",
  hatch.length,
  "lines",
  lines
    .map((line) => `${line.left}/${line.vanguard}/${line.right}`)
    .join(" | "),
);
console.log("prompt chars", prompt.length);
