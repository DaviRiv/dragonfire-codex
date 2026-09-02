/**
 * Composition ranking checks. Run: npx tsx --tsconfig tsconfig.json scripts/check-comp.ts
 */
import { samplePit } from "@/data/sample";
import { findDragon } from "@/lib/dragons";
import { lineGapHeadline, lineProfile } from "@/lib/comp";
import { makePick } from "@/lib/lineup";
import { isFinisher, isHealer, isMitigation } from "@/lib/roles";
import { suggestDragons } from "@/lib/suggest";
import type { Lineup, SlotId } from "@/lib/types";

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function names(rows: { dragon: { name: string } }[], n = 5): string {
  return rows
    .slice(0, n)
    .map((row) => row.dragon.name)
    .join(", ");
}

const state = samplePit();
const shield = state.lineups.find((row) => row.name === "Shield wall");
if (!shield) fail("missing Shield wall");

function clone(
  lineup: Lineup,
  slots: Partial<Lineup["slots"]>,
  extra?: Partial<Lineup>,
): Lineup {
  return {
    ...lineup,
    ...extra,
    slots: { ...lineup.slots, ...slots },
    excludeUsed: false,
  };
}

function suggest(lineup: Lineup, slot: SlotId) {
  return suggestDragons({ lineup, slot, state });
}

function matesOf(lineup: Lineup, slot: SlotId) {
  return (["left", "vanguard", "right"] as SlotId[])
    .filter((id) => id !== slot)
    .map((id) => lineup.slots[id])
    .filter((pick): pick is NonNullable<typeof pick> => pick != null)
    .map((pick) => {
      const dragon = findDragon(pick.dragonId, state.customDragons);
      if (!dragon) fail(`missing ${pick.dragonId}`);
      return { dragon, atStars: pick.starRank };
    });
}

const malachite = findDragon("malachite")!;
const vhagar = findDragon("vhagar")!;
const venator = findDragon("venator")!;
const caraxes = findDragon("caraxes")!;
const daemoros = findDragon("daemoros")!;
const syrax = findDragon("syrax")!;

if (!isHealer(malachite) || !isHealer(syrax)) fail("healers not classified");
if (!isMitigation(vhagar)) fail("Vhagar should mitigate");
if (!isFinisher(venator) || !isFinisher(caraxes) || !isFinisher(daemoros)) {
  fail("finishers not classified");
}
if (isFinisher(malachite)) fail("Malachite should not count as the finisher");

const soakOnly = clone(shield, {
  left: null,
  vanguard: makePick("vhagar", 4, 30),
  right: null,
});
const soakHeadline = lineGapHeadline(matesOf(soakOnly, "left"));
if (!soakHeadline?.includes("Vhagar soaks, nobody Recovers")) {
  fail(`soak headline: ${soakHeadline}`);
}
if (!soakHeadline.includes("Pick a healer")) fail(`soak pick: ${soakHeadline}`);
const soakLeft = suggest(soakOnly, "left");
const soakHealIdx = soakLeft.findIndex((row) => isHealer(row.dragon));
const soakBurnIdx = soakLeft.findIndex((row) => row.dragon.id === "daemoros");
const soakDpsIdx = soakLeft.findIndex((row) => row.dragon.id === "venator");
if (soakHealIdx !== 0) fail(`soak left should start with a healer, got ${names(soakLeft)}`);
if (!soakLeft.slice(0, 3).every((row) => isHealer(row.dragon))) {
  fail(`first three soak picks should be healers, got ${names(soakLeft)}`);
}
if (soakBurnIdx >= 0 && soakHealIdx > soakBurnIdx) {
  fail("Daemoros Burn ranked above a healer");
}
if (soakDpsIdx >= 0 && soakHealIdx > soakDpsIdx) {
  fail("Venator ranked above a healer on a soak line");
}
if (!soakLeft[0].reasons.some((text) => /Healer for this line/i.test(text))) {
  fail(`healer reason missing: ${soakLeft[0].reasons.join(" | ")}`);
}

const tauntLine = clone(shield, {
  left: null,
  vanguard: makePick("vhagar", 4, 30),
  right: makePick("daemoros", 5, 25),
});
const tauntHeadline = lineGapHeadline(matesOf(tauntLine, "left"));
if (!tauntHeadline?.includes("Daemoros feeds Burn")) {
  fail(`taunt headline: ${tauntHeadline}`);
}
if (!tauntHeadline.includes("nobody Recovers")) fail(`taunt recovery: ${tauntHeadline}`);
const tauntLeft = suggest(tauntLine, "left");
if (!isHealer(tauntLeft[0].dragon)) {
  fail(`taunt+soak left should be a healer, got ${names(tauntLeft)}`);
}

const kitBurn = clone(shield, {
  left: null,
  vanguard: makePick("vhagar", 4, 30),
  right: makePick("caraxes", 4, 26),
});
const kitProfile = lineProfile(matesOf(kitBurn, "left"));
if (kitProfile.tauntFeed?.feeder.id !== "caraxes" || kitProfile.tauntFeed.live) {
  fail(`kit Burn feed: ${JSON.stringify(kitProfile.tauntFeed)}`);
}
const kitHeadline = lineGapHeadline(matesOf(kitBurn, "left"));
if (!kitHeadline?.includes("Caraxes is here for Burn")) {
  fail(`kit headline: ${kitHeadline}`);
}

const holdLine = clone(shield, {
  left: makePick("malachite", 5, 28),
  vanguard: makePick("vhagar", 4, 30),
  right: null,
});
const holdHeadline = lineGapHeadline(matesOf(holdLine, "right"));
if (!holdHeadline?.includes("Malachite and Vhagar can hold")) {
  fail(`hold headline: ${holdHeadline}`);
}
const holdRight = suggest(holdLine, "right");
if (!isFinisher(holdRight[0].dragon)) {
  fail(`hold right should be a finisher, got ${names(holdRight)}`);
}
if (isHealer(holdRight[0].dragon)) fail("healer ranked as the finisher");
if (!holdRight[0].reasons.some((text) => /Damage to balance/i.test(text))) {
  fail(`damage reason missing: ${holdRight[0].reasons.join(" | ")}`);
}

const healOnly = clone(shield, {
  left: makePick("malachite", 5, 28),
  vanguard: null,
  right: null,
});
const healHeadline = lineGapHeadline(matesOf(healOnly, "vanguard"));
if (!healHeadline?.includes("Malachite heals, nobody Taunts")) {
  fail(`heal headline: ${healHeadline}`);
}
const healVanguard = suggest(healOnly, "vanguard");
if (!isMitigation(healVanguard[0].dragon)) {
  fail(`heal vanguard should mitigate, got ${names(healVanguard)}`);
}

const replaceHeal = clone(shield, shield.slots);
const replaceHealList = suggest(replaceHeal, "left");
if (!isHealer(replaceHealList[0].dragon)) {
  fail(`replace Malachite should rank a healer, got ${names(replaceHealList)}`);
}

console.log("ok soak", soakHeadline);
console.log("  left", names(soakLeft, 4));
console.log("ok taunt", tauntHeadline);
console.log("  left", names(tauntLeft, 4));
console.log("ok kit", kitHeadline);
console.log("ok hold", holdHeadline);
console.log("  right", names(holdRight, 4));
console.log("ok heal", healHeadline);
console.log("  vanguard", names(healVanguard, 4));
console.log("ok replace left", names(replaceHealList, 4));
