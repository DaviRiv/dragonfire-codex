/**
 * Ask AI roster + local fallback. Run: npx tsx --tsconfig tsconfig.json scripts/check-ai.ts
 */
import { samplePit } from "@/data/sample";
import { localComboLines } from "@/lib/ai/local";
import { parseAiLines } from "@/lib/ai/parse";
import { filledPrompt, makeSuggestRequest } from "@/lib/ai/prompt";
import { collectRoster } from "@/lib/ai/roster";

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
