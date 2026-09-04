/**
 * Local copilot + ChatGPT export. Run: npx tsx --tsconfig tsconfig.json scripts/check-ai.ts
 */
import { samplePit } from "@/data/sample";
import { localComboLines } from "@/lib/ai/local";
import { guessTroopMode, lineupFromAiLine, localCoachAnswer } from "@/lib/ai/coach";
import { chatgptCoachExport, chatgptSuggestExport } from "@/lib/ai/export";
import { makeSuggestRequest } from "@/lib/ai/prompt";
import { collectRoster } from "@/lib/ai/roster";
import { stubLineup, stubState } from "@/lib/ai/stub";

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
const chat = chatgptSuggestExport(request);
if (!chat.includes("vhagar")) throw new Error("chatgpt export missing vhagar");
if (!chat.includes("Player note")) throw new Error("missing note");
if (!chat.includes("on:")) throw new Error("missing on: tags");
if (!chat.includes("Skip other teams is on")) {
  throw new Error("missing skip-used instruction");
}
if (!chat.includes("Left / Vanguard / Right")) {
  throw new Error("chatgpt export missing seat labels");
}
if (chat.includes("JSON only") || chat.includes("Reply with JSON")) {
  throw new Error("chatgpt export should not ask for JSON");
}
if (!chat.includes("Current meta")) {
  throw new Error("chatgpt export missing current meta");
}
if (!chat.includes("Best online DPS lineup")) {
  throw new Error("chatgpt export missing online DPS meta");
}
if (!chat.includes("meta:online-dps Left") || !chat.includes("meta:online-dps Vanguard")) {
  throw new Error("chatgpt export missing meta roster tags");
}
if (!chat.includes("Do not invent a different")) {
  throw new Error("chatgpt export missing meta lock");
}
const coachExport = chatgptCoachExport({
  request,
  turns: [{ role: "user", text: "Build a shield PvP core from my pit" }],
  draft: "Who soaks if Vhagar is already marching?",
});
if (!coachExport.includes("Player:")) {
  throw new Error("coach export missing conversation");
}
if (!coachExport.includes("Who soaks if Vhagar is already marching?")) {
  throw new Error("coach export missing draft question");
}
if (!coachExport.includes("Do not return JSON")) {
  throw new Error("coach export missing ChatGPT rules");
}
const lines = localComboLines(lineup, state, pit);
if (lines.length < 1) throw new Error("no local lines");
const spear = guessTroopMode("Spear rally with a healer");
if (spear.troop !== "spearmen" || spear.mode !== "rally") {
  throw new Error("guess troop/mode failed");
}
const local = localCoachAnswer(
  "shield pvp",
  request,
  stubState(request),
  stubLineup(request),
);
if (local.lines.length < 1) throw new Error("local coach empty");
if (/openai|api key/i.test(local.reply)) {
  throw new Error("local copilot should not mention OpenAI");
}
const filled = lineupFromAiLine(local.lines[0], state, "pit");
if (!filled.slots.left || !filled.slots.vanguard || !filled.slots.right) {
  throw new Error("seated line missing a slot");
}
const skipVhagar = localCoachAnswer(
  "Who soaks if Vhagar is already marching?",
  request,
  stubState(request),
  stubLineup(request),
);
if (
  skipVhagar.lines.some(
    (line) =>
      line.left === "vhagar" ||
      line.vanguard === "vhagar" ||
      line.right === "vhagar",
  )
) {
  throw new Error("copilot seated Vhagar after asked to skip");
}
const freeRequest = { ...request, skipUsed: false };
const metaAsk = localCoachAnswer(
  "Seat the online DPS meta core",
  freeRequest,
  stubState(freeRequest),
  stubLineup(freeRequest),
);
const metaHead = metaAsk.lines[0];
if (
  !metaHead ||
  metaHead.left !== "malachite" ||
  metaHead.vanguard !== "vhagar" ||
  metaHead.right !== "venator"
) {
  throw new Error("copilot did not seat the online DPS meta core");
}
const spearAsk = localCoachAnswer(
  "Spear rally with a healer",
  freeRequest,
  stubState(freeRequest),
  stubLineup(freeRequest),
);
if (spearAsk.lines[0]?.name === "Online DPS core") {
  throw new Error("spear rally should not force the online DPS core");
}
if (spearAsk.lines[0] && spearAsk.lines[0].troop !== "spearmen") {
  throw new Error("spear rally should keep spearmen");
}
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
