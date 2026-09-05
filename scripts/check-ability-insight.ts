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
import { tokenizeAbilityText } from "@/lib/ability-text";

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

const malachite = getCatalogDragon("malachite");
if (!malachite) fail("missing Malachite");
const malachiteNames: [number, string, string[], string][] = [
  [1, "Forest's Instinct", ["Damage Dealt", "Damage Received"], "8%,9.6%,11.2%,13.6%,16%"],
  [2, "Wise Vigor", ["Instinct", "Recovery Dealt"], "20%,24%,28%,34%,40%"],
  [3, "Thunderous Roar", ["Advantage Chance"], "10%,12%,14%,17%,20%"],
  [4, "Collective Might", ["Strength"], "12.5%,15%,17.5%,21.25%,25%"],
  [5, "Lightning Strike", ["Lightning Strike Chance"], "40%,52%,64%,80%,100%"],
];
for (const [habit, title, labels, firstValues] of malachiteNames) {
  const row = insightForSource("malachite", { kind: "habit", habit });
  if (!row) fail(`Malachite habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Malachite habit ${habit} title is ${row.title}, expected ${title}`);
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
const forest = insightForSource("malachite", { kind: "habit", habit: 1 });
if (
  forest?.scale.find((row) => row.label === "Damage Received")?.values.join(
    ",",
  ) !== "-8%,-9.6%,-11.2%,-13.6%,-16%"
) {
  fail("Forest's Instinct Damage Received mismatch");
}
const roar = insightForSource("malachite", { kind: "habit", habit: 3 });
if (roar?.scale.some((row) => row.values.includes("20%") && row.label !== "Advantage Chance")) {
  fail("Thunderous Roar should skip the constant Advantage +20%");
}
const bolt = insightForSource("malachite", { kind: "habit", habit: 5 });
if (bolt?.scale.some((row) => /strength/i.test(row.label))) {
  fail("Lightning Strike should skip the constant Strength +25%");
}
if (
  findAbilityInsight("Forest's Instinct", { dragonId: "malachite" })?.title !==
  "Forest's Instinct"
) {
  fail("hovering Forest's Instinct should open Malachite habit 1");
}
if (
  findAbilityInsight("Lightning Strike", { dragonId: "malachite" })?.title !==
  "Lightning Strike"
) {
  fail("hovering Lightning Strike should open Malachite habit 5");
}

const rhysarion = getCatalogDragon("rhysarion");
if (!rhysarion) fail("missing Rhysarion");
const rhysarionNames: [number, string, string[], string][] = [
  [1, "Ebbing Fury", ["Damage Dealt", "Recovery Rate"], "-27.5%,-33%,-38.5%,-46.75%,-55%"],
  [2, "Sharp Resolve", ["Strength/Intelligence"], "16%,19.2%,22.4%,27.2%,32%"],
  [3, "Echoing Melody", ["Recovery Rate"], "60%,72%,84%,102%,120%"],
  [4, "Unbroken Devotion", ["Recovery Received"], "20%,24%,28%,34%,40%"],
  [5, "Inspiring Melody", ["Inspiring Melody Chance"], "20%,26%,32%,40%,50%"],
];
for (const [habit, title, labels, firstValues] of rhysarionNames) {
  const row = insightForSource("rhysarion", { kind: "habit", habit });
  if (!row) fail(`Rhysarion habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Rhysarion habit ${habit} title is ${row.title}, expected ${title}`);
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
const fury = insightForSource("rhysarion", { kind: "habit", habit: 1 });
if (
  fury?.scale.find((row) => row.label === "Recovery Rate")?.values.join(",") !==
  "25%,30%,35%,42.5%,50%"
) {
  fail("Ebbing Fury Recovery Rate mismatch");
}
const melody = insightForSource("rhysarion", { kind: "habit", habit: 5 });
if (melody?.scale.some((row) => row.label === "Initiative")) {
  fail("Inspiring Melody should skip the constant Initiative +20%");
}
if (melody?.scale.some((row) => /^Resistance$/i.test(row.label))) {
  fail("Inspiring Melody should skip the constant Resistance -15%");
}
if (
  findAbilityInsight("Ebbing Fury", { dragonId: "rhysarion" })?.title !==
  "Ebbing Fury"
) {
  fail("hovering Ebbing Fury should open Rhysarion habit 1");
}
if (
  findAbilityInsight("Inspiring Melody", { dragonId: "rhysarion" })?.title !==
  "Inspiring Melody"
) {
  fail("hovering Inspiring Melody should open Rhysarion habit 5");
}

const sunfyre = getCatalogDragon("sunfyre");
if (!sunfyre) fail("missing Sunfyre");
const sunfyreNames: [number, string, string[], string][] = [
  [1, "Radiant Majesty", ["Damage Dealt"], "5%,6%,7%,8.5%,10%"],
  [2, "Extinguish", ["Damage Dealt"], "-13.5%,-16.2%,-18.9%,-22.95%,-27%"],
  [3, "The King's Ire", ["Damage Rate", "Intelligence"], "50%,60%,70%,85%,100%"],
  [4, "Unbroken Splendor", ["Fire Damage Received", "Damage Received", "Cleanse Chance"], "-7.5%,-9%,-10.5%,-12.75%,-15%"],
  [5, "Adaptive Glory", ["Recovery Rate", "Damage Dealt", "Instinct", "Initiative"], "30%,39%,48%,60%,75%"],
];
for (const [habit, title, labels, firstValues] of sunfyreNames) {
  const row = insightForSource("sunfyre", { kind: "habit", habit });
  if (!row) fail(`Sunfyre habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Sunfyre habit ${habit} title is ${row.title}, expected ${title}`);
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
const ire = insightForSource("sunfyre", { kind: "habit", habit: 3 });
if (
  ire?.scale.find((row) => row.label === "Intelligence")?.values.join(",") !==
  "-15%,-18%,-21%,-25.5%,-30%"
) {
  fail("The King's Ire Intelligence mismatch");
}
const splendor = insightForSource("sunfyre", { kind: "habit", habit: 4 });
if (
  splendor?.scale.find((row) => row.label === "Cleanse Chance")?.values.join(
    ",",
  ) !== "25%,30%,35%,42.5%,50%"
) {
  fail("Unbroken Splendor Cleanse Chance mismatch");
}
if (splendor?.scale.some((row) => row.values.join(",") === "50%,50%,50%,50%,50%")) {
  fail("Unbroken Splendor should skip constant 50% troop capacity");
}
const glory = insightForSource("sunfyre", { kind: "habit", habit: 5 });
if (
  glory?.scale.find((row) => row.label === "Damage Dealt")?.values.join(",") !==
  "12%,15.6%,19.2%,24%,30%"
) {
  fail("Adaptive Glory Damage Dealt buff mismatch");
}
if (
  glory?.scale.find((row) => row.label === "Damage Dealt (2)")?.values.join(
    ",",
  ) !== "-12%,-15.6%,-19.2%,-24%,-30%"
) {
  fail("Adaptive Glory Damage Dealt debuff mismatch");
}
if (
  glory?.scale.find((row) => row.label === "Initiative")?.values.join(",") !==
  "6%,7.8%,9.6%,12%,15%"
) {
  fail("Adaptive Glory Initiative mismatch");
}
const majesty = insightForSource("sunfyre", { kind: "habit", habit: 1 });
if (majesty?.scale.some((row) => row.values.includes("75%") || row.label === "Troop Capacity")) {
  fail("Radiant Majesty should skip constant troop-capacity percents");
}
if (
  findAbilityInsight("Radiant Majesty", { dragonId: "sunfyre" })?.title !==
  "Radiant Majesty"
) {
  fail("hovering Radiant Majesty should open Sunfyre habit 1");
}
if (
  findAbilityInsight("The King's Ire", { dragonId: "sunfyre" })?.title !==
  "The King's Ire"
) {
  fail("hovering The King's Ire should open Sunfyre habit 3");
}

function glossNames(insight: { glosses: { name: string }[] } | undefined) {
  return (insight?.glosses ?? []).map((row) => row.name);
}

const firstStrike = findAbilityInsight("First-Strike", { dragonId: "malachite" });
if (!firstStrike || firstStrike.title !== "First-Strike") {
  fail(`First-Strike hover opened ${firstStrike?.title ?? "nothing"}`);
}
if (firstStrike.kind !== "buff") fail("First-Strike should be the status card");
if (firstStrike.polarity !== "buff") fail("First-Strike is a buff");
if (!/act before all other combatants/i.test(firstStrike.body)) {
  fail("First-Strike body missing the Star Progression glossary line");
}

const doubleStrike = findAbilityInsight("Double-Strike");
if (doubleStrike?.title !== "Double-Strike" || doubleStrike.kind !== "buff") {
  fail(`Double-Strike hover opened ${doubleStrike?.title ?? "nothing"}`);
}
if (!/2nd Basic Attack/i.test(doubleStrike.body)) {
  fail("Double-Strike body missing the glossary line");
}

const advantage = findAbilityInsight("Advantage", { dragonId: "malachite" });
if (advantage?.title !== "Advantage" || advantage.kind !== "buff") {
  fail(`Advantage hover opened ${advantage?.title ?? "nothing"}`);
}
if (advantage.polarity !== "buff") fail("Advantage is a buff");
if (!/Damage Dealt/i.test(advantage.body)) {
  fail("Advantage body missing Damage Dealt");
}

const overwhelm = findAbilityInsight("Overwhelm", { dragonId: "venator" });
if (overwhelm?.title !== "Overwhelm" || overwhelm.kind !== "buff") {
  fail(`Overwhelm hover opened ${overwhelm?.title ?? "nothing"}`);
}
if (overwhelm.polarity !== "debuff") fail("Overwhelm is a debuff");

const lightning = insightForSource("malachite", { kind: "habit", habit: 5 });
if (!glossNames(lightning).includes("First-Strike")) {
  fail(`Lightning Strike glosses missing First-Strike: ${glossNames(lightning)}`);
}
if (!glossNames(lightning).includes("Double-Strike")) {
  fail(`Lightning Strike glosses missing Double-Strike: ${glossNames(lightning)}`);
}
if (lightning?.glosses.some((row) => row.polarity !== "buff")) {
  fail("Lightning Strike glossary lines should be buffs");
}

const roarGloss = insightForSource("malachite", { kind: "habit", habit: 3 });
if (!glossNames(roarGloss).includes("Advantage")) {
  fail(`Thunderous Roar glosses missing Advantage: ${glossNames(roarGloss)}`);
}

const feralGloss = insightForSource("venator", { kind: "habit", habit: 3 });
if (glossNames(feralGloss).includes("Double-Strike")) {
  fail("Feral Precision already explains Double-Strike; do not duplicate the gloss");
}

const risingTide = findAbilityInsight("Rising Tide", { dragonId: "moondancer" });
if (risingTide?.kind !== "buff" || risingTide.title !== "Rising Tide") {
  fail(`Rising Tide hover opened ${risingTide?.kind}:${risingTide?.title}`);
}
if (!/Damage Received/i.test(risingTide.body) || !/-2\.5%/.test(risingTide.body)) {
  fail(`Rising Tide body should be the Hub stack line: ${risingTide.body}`);
}
if (!/Max 8 stacks/i.test(risingTide.body)) {
  fail(`Rising Tide should keep Max 8 stacks: ${risingTide.body}`);
}
if (!/^Each stack of Rising Tide /i.test(risingTide.body)) {
  fail(`Rising Tide name was swallowed by the extractor: ${risingTide.body}`);
}
if (risingTide.polarity !== "buff") fail("Rising Tide is a defensive buff");

const crescent = findAbilityInsight("Crescent Blade", { dragonId: "moondancer" });
if (crescent?.kind !== "buff" || crescent.title !== "Crescent Blade") {
  fail(`Crescent Blade hover opened ${crescent?.kind}:${crescent?.title}`);
}
if (!/Sentinel/i.test(crescent.body) || !/Rising Tide/i.test(crescent.body)) {
  fail(`Crescent Blade body should be the grant line: ${crescent.body}`);
}
if (crescent.polarity !== "buff") fail("Crescent Blade is a buff");

const wrath = findAbilityInsight("Infectious Wrath", { dragonId: "seasmoke" });
if (wrath?.kind !== "buff") {
  fail(`Infectious Wrath should extract as a stack: ${wrath?.kind}:${wrath?.title}`);
}
if (wrath.polarity !== "debuff") {
  fail(`Infectious Wrath should be a debuff: ${wrath.body}`);
}

const erosion = findAbilityInsight("Steady Erosion", { dragonId: "solstryker" });
if (erosion?.kind !== "buff") {
  fail(`Steady Erosion should extract as a stack: ${erosion?.kind}:${erosion?.title}`);
}
if (erosion.polarity !== "debuff") {
  fail(`Steady Erosion should be a debuff: ${erosion.body}`);
}

const moonCommand = insightForSource("moondancer", { kind: "command" });
if (glossNames(moonCommand).includes("Rising Tide")) {
  fail("Moondancer command already defines Rising Tide; do not duplicate the gloss");
}
if (glossNames(moonCommand).includes("Crescent Blade")) {
  fail("Moondancer command already defines Crescent Blade; do not duplicate the gloss");
}

const newMoonGloss = insightForSource("moondancer", { kind: "habit", habit: 1 });
if (!glossNames(newMoonGloss).includes("Rising Tide")) {
  fail(`New Moon glosses missing Rising Tide: ${glossNames(newMoonGloss)}`);
}
if (!glossNames(newMoonGloss).includes("Advantage")) {
  fail(`New Moon glosses missing Advantage: ${glossNames(newMoonGloss)}`);
}
if (glossNames(newMoonGloss).includes("Crescent Blade")) {
  fail("New Moon does not mention Crescent Blade");
}

const fullMoonGloss = insightForSource("moondancer", { kind: "habit", habit: 3 });
if (!glossNames(fullMoonGloss).includes("Crescent Blade")) {
  fail(`Full Moon glosses missing Crescent Blade: ${glossNames(fullMoonGloss)}`);
}
if (!glossNames(fullMoonGloss).includes("Rising Tide")) {
  fail(`Full Moon glosses missing Rising Tide: ${glossNames(fullMoonGloss)}`);
}

if (findAbilityInsight("New Moon", { dragonId: "moondancer" })?.kind !== "habit") {
  fail("New Moon must stay the habit card");
}
if (findAbilityInsight("Rallying Flame", { dragonId: "vermax" })?.kind !== "habit") {
  fail("Rallying Flame must stay the habit card");
}
if (findAbilityInsight("Lightning Strike", { dragonId: "malachite" })?.kind !== "habit") {
  fail("Lightning Strike must stay the habit card");
}

if (lightning?.scale.some((row) => /power/i.test(row.label))) {
  fail("Lightning Strike must not invent Power");
}

const firstStrikeTone = tokenizeAbilityText("grant First-Strike").find(
  (part) => part.value === "First-Strike",
)?.tone;
if (firstStrikeTone !== "buff") {
  fail(`First-Strike text tone is ${firstStrikeTone}, expected buff`);
}
const overwhelmTone = tokenizeAbilityText("afflict Overwhelm").find(
  (part) => part.value === "Overwhelm",
)?.tone;
if (overwhelmTone !== "debuff") {
  fail(`Overwhelm text tone is ${overwhelmTone}, expected debuff`);
}

console.log("ability insight checks passed");
