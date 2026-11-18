/**
 * Army auto-builder: pit grid, cap, and rank helpers.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-army-builder.ts
 */
import { emptyPit } from "@/lib/dragons";
import { makePick } from "@/lib/lineup";
import {
  canAutoBuildPitTeam,
  pitTeamGrid,
  rankAutoPitLine,
  pitSetupReady,
} from "@/lib/army-builder";
import {
  enforceUniquePitDragons,
  MAX_PIT_TEAMS,
  repeatedPitDragons,
} from "@/lib/pit-teams";
import { samplePit } from "@/data/sample";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

const sample = samplePit();
assert(pitSetupReady(sample), "sample pit should be setup-ready");
assert(pitTeamGrid(sample).length === MAX_PIT_TEAMS, "grid has 5 slots");
assert(
  pitTeamGrid(sample).filter((s) => s.lineup).length >= 1,
  "sample has pit lineups",
);

const empty = emptyPit();
assert(!pitSetupReady(empty), "empty pit not ready");
assert(!canAutoBuildPitTeam(empty), "cannot auto-build with no owned");

const draft = { ...empty };
for (const id of ["vhagar", "malachite", "venator", "arrax", "syrax"]) {
  draft.owned.push({
    id: `o-${id}`,
    dragonId: id,
    starRank: 5,
    reignLevel: 20,
    habits: [1, 2, 3],
    habitRanks: [0, 0, 0],
    notes: "",
  });
}
assert(pitSetupReady(draft), "three+ owned ready");
assert(canAutoBuildPitTeam(draft), "can build with free dragons");

const rank = rankAutoPitLine(draft);
assert(rank && rank.picks.length === 3, "auto rank fills three seats");

const duplicated = samplePit();
const pit = duplicated.lineups.filter((lineup) => lineup.kind === "pit");
const first = pit[0];
const second = pit[1];
if (first?.slots.left && second) {
  second.slots.right = { ...first.slots.left };
}
assert(
  repeatedPitDragons(duplicated).length > 0,
  "fixture should contain a repeated pit dragon",
);
const unique = enforceUniquePitDragons(duplicated);
assert(
  repeatedPitDragons(unique).length === 0,
  "normalization removes repeated pit dragons",
);

console.log("check-army-builder: ok");