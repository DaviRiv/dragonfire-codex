/**
 * Copilot conversation memory: a follow-up must inherit what the thread
 * already agreed on, and the transcript must survive a reload.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-coach-chat.ts
 */
import {
  DEFAULT_MODE,
  DEFAULT_TROOP,
  historyForContext,
  parseStoredTurns,
  planTurn,
  threadMemory,
  turnsForStorage,
  type ChatTurn,
} from "@/lib/ai/conversation";
import { detectIntent, detectOrdinal, directNames } from "@/lib/ai/intent";
import type { AiLine } from "@/lib/ai/prompt";
import type { RosterCard } from "@/lib/ai/roster";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

function card(id: string, name: string, jobs: string[] = []): RosterCard {
  return {
    id,
    name,
    breed: "warrior",
    jobs,
    stars: 5,
    reign: 30,
    aff: "shieldbearers",
    flank: "left",
    needs: "none",
    gives: "none",
    kit: "",
    owned: true,
  };
}

const roster: RosterCard[] = [
  card("malachite", "Malachite", ["Heal"]),
  card("vhagar", "Vhagar", ["Tank"]),
  card("venator", "Venator", ["DPS"]),
  card("arrax", "Arrax", ["DPS"]),
  card("syrax", "Syrax", ["CC"]),
  card("meleys", "Meleys", ["Heal"]),
];

function line(name: string, ids: [string, string, string]): AiLine {
  return {
    name,
    troop: "shieldbearers",
    mode: "pvp",
    left: ids[0],
    vanguard: ids[1],
    right: ids[2],
    why: `${name} why`,
  };
}

let seq = 0;
function ask(text: string): ChatTurn {
  seq += 1;
  return {
    id: `u${seq}`,
    requestId: `r${seq}`,
    role: "user",
    text,
    createdAt: seq,
    status: "done",
  };
}

function answer(text: string, lines: AiLine[] = []): ChatTurn {
  return {
    id: `a${seq}`,
    requestId: `r${seq}`,
    role: "assistant",
    text,
    createdAt: seq,
    status: "done",
    lines,
  };
}

// --- Intent parsing -------------------------------------------------------

assert(detectIntent("What's my best PvP formation?") === "formation", "opening ask is a formation ask");
assert(detectIntent("What if I use cavalry?") === "formation", "a troop switch is still a formation ask");
assert(detectIntent("Give me another option without Malachite") === "another", "'another option' asks for a fresh line");
assert(detectIntent("Which of those is strongest?") === "compare", "'which of those' compares");
assert(detectIntent("Why?") === "explain", "'why' explains");
assert(detectIntent("Now build one for PvE") === "formation", "a mode switch is a formation ask");
assert(detectIntent("Start over") === "reset", "'start over' clears the thread");
assert(detectOrdinal("use the first option") === 0, "first option is index 0");
assert(detectOrdinal("compare the second one") === 1, "second option is index 1");

// "keep Vhagar" must not read as Castle Defense.
assert(
  planTurn("keep Vhagar and swap the rest", [], roster).mode === DEFAULT_MODE,
  "'keep <name>' is not a defense request",
);

// --- Name direction -------------------------------------------------------

const swap = directNames("Replace Vhagar", roster);
assert(swap.exclude.includes("vhagar"), "'replace X' holds X back");
const busy = directNames("Vhagar is already marching", roster);
assert(busy.exclude.includes("vhagar"), "'X is marching' holds X back");
const back = directNames("bring back Vhagar", roster);
assert(back.include.includes("vhagar"), "'bring back X' frees X again");

// --- The brief's conversation ---------------------------------------------

const pvp = line("Shield core", ["malachite", "vhagar", "venator"]);
const cav = line("Cavalry core", ["meleys", "syrax", "arrax"]);

const thread: ChatTurn[] = [];
thread.push(ask("What's my best PvP formation?"), answer("...", [pvp]));

const afterCavalry = planTurn("What if I use cavalry?", thread, roster);
assert(afterCavalry.troop === "cavalry", "a named troop wins");
assert(afterCavalry.mode === "pvp", "mode carries over when it is not restated");

thread.push(ask("What if I use cavalry?"), answer("...", [cav]));

const afterReplace = planTurn("Replace Vhagar.", thread, roster);
assert(afterReplace.troop === "cavalry", "troop stays cavalry two turns later");
assert(afterReplace.excludeIds.includes("vhagar"), "Vhagar is held back");

thread.push(ask("Replace Vhagar."), answer("...", [cav]));

const anotherPlan = planTurn(
  "Give me another option without Malachite.",
  thread,
  roster,
);
assert(anotherPlan.intent === "another", "'another option' keeps its intent");
assert(anotherPlan.excludeIds.includes("vhagar"), "an earlier exclusion is sticky");
assert(anotherPlan.excludeIds.includes("malachite"), "the new exclusion is added");
assert(
  ["meleys", "syrax", "arrax"].every((id) => anotherPlan.excludeIds.includes(id)),
  "'another' will not hand back the same three seats",
);

thread.push(
  ask("Give me another option without Malachite."),
  answer("...", [cav, pvp]),
);

const comparePlan = planTurn("Which of those is strongest?", thread, roster);
assert(comparePlan.intent === "compare", "compare survives the thread");
assert(comparePlan.referenced.length === 2, "compare points at both offered lines");

thread.push(ask("Which of those is strongest?"), answer("...", [cav, pvp]));

const whyPlan = planTurn("Why?", thread, roster);
assert(whyPlan.intent === "explain", "a bare 'why' still explains");
assert(whyPlan.referenced.length > 0, "'why' has something to explain");
assert(whyPlan.troop === "cavalry", "'why' does not reset the troop");

thread.push(ask("Why?"), answer("...", [cav]));

const pvePlan = planTurn("Now build one for PvE.", thread, roster);
assert(pvePlan.mode === "pve", "a named mode wins");
assert(pvePlan.troop === "cavalry", "an unnamed troop still carries over");
assert(pvePlan.excludeIds.includes("vhagar"), "exclusions survive a mode switch");

// --- Role targeting and reset --------------------------------------------

const healerSwap = planTurn(
  "replace the healer",
  [ask("best pvp"), answer("...", [pvp])],
  roster,
);
assert(
  healerSwap.excludeIds.includes("malachite"),
  "'replace the healer' points at the healer actually seated",
);

const resetPlan = planTurn("Start over, everyone is free.", thread, roster);
assert(resetPlan.excludeIds.length === 0, "a reset clears every exclusion");
assert(resetPlan.troop === DEFAULT_TROOP, "a reset returns to the default troop");

const memoryAfterReset = threadMemory(
  [...thread, ask("start over"), ask("what about spears?")],
  roster,
);
assert(memoryAfterReset.excluded.length === 0, "reset wipes memory for later turns");
assert(memoryAfterReset.troop === "spearmen", "turns after a reset still count");

// --- Context window -------------------------------------------------------

const long: ChatTurn[] = [];
for (let i = 0; i < 40; i++) {
  seq += 1;
  long.push(ask(`question ${i}`), answer(`answer ${i}`));
}
const window = historyForContext(long);
assert(window.length <= 12, "the context window is capped by turn count");
assert(window[0].role === "user", "the window never opens on a dangling answer");
assert(
  window[window.length - 1].text === "answer 39",
  "the window keeps the most recent turns",
);
const tight = historyForContext(long, { maxTurns: 50, maxChars: 60 });
assert(tight.length < 12, "the context window is also capped by characters");

// --- Persistence ----------------------------------------------------------

const pendingTurn: ChatTurn = {
  id: "a-p",
  requestId: "r-p",
  role: "assistant",
  text: "",
  createdAt: 1,
  status: "pending",
};
const saved = turnsForStorage([ask("hello"), pendingTurn]);
assert(
  saved.every((turn) => turn.status !== "pending"),
  "pending work is never written to storage",
);

const restored = parseStoredTurns([
  { ...ask("hello"), id: "u-x", requestId: "r-x" },
  { ...pendingTurn, requestId: "r-x" },
  { nonsense: true },
]);
assert(restored.length === 2, "junk rows are dropped, real ones survive");
assert(restored[1].status === "error", "a reload turns pending work into a retryable error");
assert(restored[1].error?.retryable === true, "the player can retry after a reload");
assert(parseStoredTurns("not an array").length === 0, "a corrupt save reads as empty");

console.log("check-coach-chat: ok");
