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

const moonNames: [number, string, string[]][] = [
  [1, "New Moon", ["Rising Tide Chance", "Instinct", "Damage Dealt"]],
  [2, "Reactive Instincts", ["Instinct", "Initiative"]],
  [3, "Full Moon", ["Rising Tide Chance", "Damage Rate"]],
  [4, "Blood Moon", ["Damage Dealt", "Bleed Chance"]],
  [5, "Eclipsing Strike", ["Eclipsing Strike Chance"]],
];
for (const [habit, title, labels] of moonNames) {
  const row = insightForSource("moondancer", { kind: "habit", habit });
  if (!row) fail(`Moondancer habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Moondancer habit ${habit} title is ${row.title}, expected ${title}`);
  }
  if (row.scale.some((line) => /power/i.test(line.label))) {
    fail(`${title} must not invent Power`);
  }
  for (const label of labels) {
    const line = row.scale.find((item) => item.label === label);
    if (!line) {
      fail(
        `${title} missing ${label}: ${row.scale.map((item) => item.label).join(", ")}`,
      );
    }
  }
  if (row.scale.some((line) => /doubled|1\.5x/i.test(line.label))) {
    fail(`${title} should hide doubled / 1.5x derived rows`);
  }
}

const newMoon = insightForSource("moondancer", { kind: "habit", habit: 1 });
if (newMoon?.scale.find((row) => row.label === "Rising Tide Chance")?.values.join(",") !== "25%,30%,35%,42.5%,50%") {
  fail(`New Moon chance ${newMoon?.scale.find((row) => row.label === "Rising Tide Chance")?.values.join(",")}`);
}
const eclipse = insightForSource("moondancer", { kind: "habit", habit: 5 });
if (eclipse?.scale.find((row) => row.label === "Eclipsing Strike Chance")?.values.join(",") !== "20%,26%,32%,40%,50%") {
  fail("Eclipsing Strike chance mismatch");
}
if (findAbilityInsight("New Moon", { dragonId: "moondancer" })?.id !== newMoon?.id) {
  fail("hovering New Moon should open Moondancer habit 1");
}
if (findAbilityInsight("Blood Moon", { dragonId: "moondancer" })?.title !== "Blood Moon") {
  fail("hovering Blood Moon should open that habit");
}

const venator = getCatalogDragon("venator");
if (!venator) fail("missing Venator");
const venatorNames: [number, string, string[], string][] = [
  [1, "Hunter's Bane", ["Intelligence"], "-30%,-36%,-42%,-51%,-60%"],
  [2, "Dragon's Might", ["Damage Dealt"], "12.5%,15%,17.5%,21.25%,25%"],
  [3, "Feral Precision", ["Damage Rate", "Double-Strike Chance"], "20%,24%,28%,34%,40%"],
  [4, "Armor Break", ["Damage Received"], "8%,9.6%,11.2%,13.6%,16%"],
  [5, "Desperate Ambush", ["Damage Rate", "Overwhelm Chance"], "60%,78%,96%,120%,150%"],
];
for (const [habit, title, labels, firstValues] of venatorNames) {
  const row = insightForSource("venator", { kind: "habit", habit });
  if (!row) fail(`Venator habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Venator habit ${habit} title is ${row.title}, expected ${title}`);
  }
  if (row.scale.some((line) => /power/i.test(line.label))) {
    fail(`${title} must not invent Power`);
  }
  for (const label of labels) {
    const line = row.scale.find((item) => item.label === label);
    if (!line) {
      fail(
        `${title} missing ${label}: ${row.scale.map((item) => item.label).join(", ")}`,
      );
    }
  }
  const first = row.scale.find((item) => item.label === labels[0]);
  if (first?.values.join(",") !== firstValues) {
    fail(`${title} ${labels[0]} ${first?.values.join(",")} !== ${firstValues}`);
  }
}
const feral = insightForSource("venator", { kind: "habit", habit: 3 });
if (
  feral?.scale.find((row) => row.label === "Double-Strike Chance")?.values.join(
    ",",
  ) !== "40%,42%,44%,47%,50%"
) {
  fail("Feral Precision Double-Strike chance mismatch");
}
const ambush = insightForSource("venator", { kind: "habit", habit: 5 });
if (
  ambush?.scale.find((row) => row.label === "Overwhelm Chance")?.values.join(
    ",",
  ) !== "12%,15.6%,19.2%,24%,30%"
) {
  fail("Desperate Ambush Overwhelm chance mismatch");
}
if (findAbilityInsight("Hunter's Bane", { dragonId: "venator" })?.title !== "Hunter's Bane") {
  fail("hovering Hunter's Bane should open Venator habit 1");
}
if (findAbilityInsight("Feral Strike", { dragonId: "venator" })?.title !== "Feral Precision") {
  fail("hovering Feral Strike should open Feral Precision");
}

console.log("ability insight checks passed");
