/**
 * Ability insight extraction. Run: npx tsx --tsconfig tsconfig.json scripts/check-ability-insight.ts
 */
import { getCatalogDragon } from "@/data/dragons";
import {
  findAbilityInsight,
  insightForSource,
  insightsForDragon,
  namedStacksIn,
  scaleRowsFromRanks,
} from "@/lib/ability-insight";
import { habitRankTexts } from "@/lib/habits";

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const vermax = getCatalogDragon("vermax");
if (!vermax) fail("missing Vermax");

const habit3 = insightForSource("vermax", { kind: "habit", habit: 3 });
if (!habit3) fail("Vermax habit 3 missing");
if (habit3.title !== "Rallying Flame") {
  fail(`Vermax habit 3 title is ${habit3.title}, expected Rallying Flame`);
}
if (!habit3.names.includes("Rallying Flame")) {
  fail(`names missing Rallying Flame: ${habit3.names.join(", ")}`);
}
if (!habit3.names.includes("Spreading Blaze")) {
  fail(`names missing Spreading Blaze: ${habit3.names.join(", ")}`);
}
if (!habit3.body.includes("Max 4 Stacks")) {
  fail("habit 3 body is not the full Rallying Flame text");
}

const chance = habit3.scale.filter((row) => /chance/i.test(row.label));
if (chance.length < 2) {
  fail(`expected two chance rows, got ${JSON.stringify(habit3.scale)}`);
}
const rally = chance.find((row) => /rallying flame/i.test(row.label));
if (!rally) fail(`no Rallying Flame chance row: ${JSON.stringify(habit3.scale)}`);
if (rally.values.join(",") !== "50%,60%,70%,85%,100%") {
  fail(`Rallying Flame chance ${rally.values.join(",")} !== 50–100`);
}
const blaze = chance.find((row) => /spreading blaze/i.test(row.label));
if (!blaze) fail(`no Spreading Blaze chance row: ${JSON.stringify(habit3.scale)}`);
if (blaze.values.join(",") !== "50%,60%,70%,85%,100%") {
  fail(`Spreading Blaze chance ${blaze.values.join(",")}`);
}
if (habit3.scale.some((row) => /power/i.test(row.label))) {
  fail("must not invent Power numbers");
}
if (habit3.body.includes("2,500") || habit3.scale.some((row) => row.values.includes("2,500"))) {
  fail("must not invent 2,500 Power");
}

const hovered = findAbilityInsight("Rallying Flame", { dragonId: "vermax" });
if (!hovered || hovered.id !== habit3.id) {
  fail("hovering Rallying Flame should open Vermax habit 3");
}

const ranks = habitRankTexts("vermax", 2);
if (!ranks) fail("Vermax habit 3 should have rank text");
const fromRanks = scaleRowsFromRanks(ranks);
if (fromRanks.some((row) => row.values.includes("340"))) {
  fail("scale parser invented 340");
}

const command = insightForSource("vermax", { kind: "command" });
if (!command?.names.includes("Spreading Blaze")) {
  fail("Vermax command should name Spreading Blaze");
}

const stacks = namedStacksIn(habit3.body);
if (!stacks.includes("Rallying Flame") || !stacks.includes("Spreading Blaze")) {
  fail(`stack parse ${stacks.join(", ")}`);
}

const moondancer = getCatalogDragon("moondancer");
if (!moondancer) fail("missing Moondancer");
const moonKit = insightsForDragon(moondancer);
const rising = moonKit.find((item) => item.names.includes("Rising Tide"));
if (!rising) fail("Moondancer kit missing Rising Tide");
const blade = moonKit.find((item) => item.names.includes("Crescent Blade"));
if (!blade) fail("Moondancer kit missing Crescent Blade");
if (moonKit.some((item) => item.names.includes("Moondancer"))) {
  fail("dragon names must not be treated as abilities");
}

console.log("ability insight checks passed");
