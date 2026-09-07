/**
 * Ability insight extraction. Run: npx tsx --tsconfig tsconfig.json scripts/check-ability-insight.ts
 */
import { getCatalogDragon } from "@/data/dragons";
import { commandHeading } from "@/data/command-names";
import { catalogFor } from "@/lib/dragon-catalog";
import {
  findAbilityInsight,
  insightForSource,
  insightsForDragon,
  namedChips,
  namedStacksIn,
  scaleRowsFromRanks,
  statusMarkPolarity,
} from "@/lib/ability-insight";
import { namedStatusPolarity } from "@/lib/status-polarity";
import { commandLine, habitRankTexts, habitText, dragonKit, habitRankOf, normalizeHabitRanks } from "@/lib/habits";
import { tokenizeAbilityText } from "@/lib/ability-text";
import { formatRoundTimingSentences } from "@/lib/ability-copy";
import { normalizePitState } from "@/lib/dragons";

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

const vermaxNames: [number, string, string[], string][] = [
  [1, "Trial by Flame", ["Fire Damage Received (<75%)", "Fire Damage Received (<50%)", "Fire Damage Received (<25%)"], "-5%,-6%,-7%,-8.5%,-10%"],
  [2, "Reactive Instincts", ["Instinct", "Initiative"], "18%,21.6%,25.2%,30.6%,36%"],
  [3, "Rallying Flame", ["Rallying Flame Chance", "Spreading Blaze Chance"], "50%,60%,70%,85%,100%"],
  [4, "Dragon's Valor", ["Damage Received", "Strength"], "-5%,-6%,-7%,-8.5%,-10%"],
  [5, "Unyielding Resolve", ["Advantage Chance"], "20%,26%,32%,40%,50%"],
];
for (const [habit, title, labels, firstValues] of vermaxNames) {
  const row = insightForSource("vermax", { kind: "habit", habit });
  if (!row) fail(`Vermax habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Vermax habit ${habit} title is ${row.title}, expected ${title}`);
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
const trial = insightForSource("vermax", { kind: "habit", habit: 1 });
if (
  trial?.scale.find((row) => row.label === "Fire Damage Received (<50%)")?.values.join(
    ",",
  ) !== "-10%,-12%,-14%,-17%,-20%"
) {
  fail("Trial by Flame <50% mismatch");
}
if (
  trial?.scale.find((row) => row.label === "Fire Damage Received (<25%)")?.values.join(
    ",",
  ) !== "-15%,-18%,-21%,-25.5%,-30%"
) {
  fail("Trial by Flame <25% mismatch");
}
if (
  trial?.scale.some((row) =>
    ["75%", "50%", "25%"].every((value) => row.values.includes(value)),
  )
) {
  fail("Trial by Flame should skip constant troop-capacity percents");
}
if (/allies below 75%/i.test(trial?.body ?? "")) {
  fail("do not rewrite Hub Trial by Flame spelling");
}
const instincts = insightForSource("vermax", { kind: "habit", habit: 2 });
if (
  instincts?.scale.find((row) => row.label === "Initiative")?.values.join(",") !==
  "9%,10.8%,12.6%,15.3%,18%"
) {
  fail("Reactive Instincts Initiative mismatch");
}
const valor = insightForSource("vermax", { kind: "habit", habit: 4 });
if (
  valor?.scale.find((row) => row.label === "Strength")?.values.join(",") !==
  "8.5%,10.2%,11.9%,14.45%,17%"
) {
  fail("Dragon's Valor Strength mismatch");
}
const resolve = insightForSource("vermax", { kind: "habit", habit: 5 });
if (resolve?.scale.some((row) => row.values.join(",") === "30%,39%,48%,60%,75%")) {
  fail("Unyielding Resolve should skip 1.5x derived Advantage chance");
}
if (resolve?.scale.some((row) => row.values.join(",") === "15%,15%,15%,15%,15%")) {
  fail("Unyielding Resolve should skip constant Advantage +15%");
}
if (
  glossNames(resolve).includes("Advantage") === false ||
  glossNames(resolve).includes("Weakened") === false
) {
  fail("Unyielding Resolve should gloss Advantage and Weakened");
}
if (
  findAbilityInsight("Trial by Flame", { dragonId: "vermax" })?.title !==
  "Trial by Flame"
) {
  fail("hovering Trial by Flame should open Vermax habit 1");
}
if (
  findAbilityInsight("Reactive Instincts", { dragonId: "vermax" })?.habit !== 2
) {
  fail("hovering Reactive Instincts on Vermax should open Vermax habit 2");
}
if (
  findAbilityInsight("Unyielding Resolve", { dragonId: "vermax" })?.title !==
  "Unyielding Resolve"
) {
  fail("hovering Unyielding Resolve should open Vermax habit 5");
}
const vermaxCatalog = catalogFor(vermax);
if (vermaxCatalog.namedCount !== 5 || vermaxCatalog.needsScreenshot) {
  fail("Vermax habit names from Star Progression should be complete");
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
if (
  findAbilityInsight("Extinguish", { dragonId: "sunfyre" })?.title !== "Extinguish"
) {
  fail("hovering Extinguish should open Sunfyre habit 2");
}
if (
  findAbilityInsight("Unbroken Splendor", { dragonId: "sunfyre" })?.title !==
  "Unbroken Splendor"
) {
  fail("hovering Unbroken Splendor should open Sunfyre habit 4");
}
if (
  findAbilityInsight("Adaptive Glory", { dragonId: "sunfyre" })?.title !==
  "Adaptive Glory"
) {
  fail("hovering Adaptive Glory should open Sunfyre habit 5");
}
const sunCatalog = catalogFor(sunfyre);
if (sunCatalog.namedCount !== 5 || sunCatalog.needsScreenshot) {
  fail("Sunfyre habit names from Star Progression should be complete");
}

const kalspire = getCatalogDragon("kalspire");
if (!kalspire) fail("missing Kalspire");
const kalspireNames: [number, string, string[], string][] = [
  [1, "Robust Insight", ["Strength/Instinct"], "20%,24%,28%,34%,40%"],
  [2, "Battle Cunning", ["Strength/Intelligence"], "-6.5%,-7.8%,-9.1%,-11.05%,-13%"],
  [3, "Tactical Assault", ["Damage Rate", "Panic Chance"], "25%,30%,35%,42.5%,50%"],
  [4, "Dragon's Insight", ["Damage Received", "Instinct"], "-6%,-7.2%,-8.4%,-10.2%,-12%"],
  [5, "Radiant Conqueror", ["Damage Dealt"], "-10%,-13%,-16%,-20%,-25%"],
];
for (const [habit, title, labels, firstValues] of kalspireNames) {
  const row = insightForSource("kalspire", { kind: "habit", habit });
  if (!row) fail(`Kalspire habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Kalspire habit ${habit} title is ${row.title}, expected ${title}`);
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
const assault = insightForSource("kalspire", { kind: "habit", habit: 3 });
if (
  assault?.scale.find((row) => row.label === "Panic Chance")?.values.join(",") !==
  "15%,18%,21%,25.5%,30%"
) {
  fail("Tactical Assault Panic Chance mismatch");
}
if (
  findAbilityInsight("Robust Insight", { dragonId: "kalspire" })?.title !==
  "Robust Insight"
) {
  fail("hovering Robust Insight should open Kalspire habit 1");
}
if (
  findAbilityInsight("Radiant Conqueror", { dragonId: "kalspire" })?.title !==
  "Radiant Conqueror"
) {
  fail("hovering Radiant Conqueror should open Kalspire habit 5");
}
const kalCommand = insightForSource("kalspire", { kind: "command" });
if (!kalCommand) fail("Kalspire command missing");
if (kalCommand.title !== "Tactical Strike") {
  fail(`Kalspire command title is ${kalCommand.title}, expected Tactical Strike`);
}
if (/Tactical Strike gains/i.test(kalCommand.body)) {
  fail("do not rewrite Hub command text to screenshot wording");
}
const assaultBody = insightForSource("kalspire", { kind: "habit", habit: 3 })?.body ?? "";
if (/Tactical Strike gains/i.test(assaultBody)) {
  fail("do not rewrite Hub Tactical Assault text to screenshot wording");
}
if (
  findAbilityInsight("Tactical Strike", { dragonId: "kalspire" })?.kind !==
  "command"
) {
  fail("hovering Tactical Strike should open Kalspire's Command");
}
if (!namedChips(kalCommand).includes("Tactical Strike")) {
  fail("Kalspire command chips should include Tactical Strike");
}
const kalCatalog = catalogFor(kalspire);
if (kalCatalog.namedCount !== 5 || kalCatalog.needsScreenshot) {
  fail("Kalspire habit names from Star Progression should be complete");
}
if (kalCatalog.command.names.includes("Tactical Strike") === false) {
  fail("Dev catalog should list Tactical Strike on Kalspire's Command");
}

const caraxes = getCatalogDragon("caraxes");
if (!caraxes) fail("missing Caraxes");
const caraxesNames: [number, string, string[], string][] = [
  [1, "Battle Dread", ["Strength/Initiative"], "-6.5%,-7.8%,-9.1%,-11.05%,-13%"],
  [2, "Dragon's Flair", ["Damage Dealt"], "12.5%,15%,17.5%,21.25%,25%"],
  [3, "Crippling Inferno", ["Slow & Burn Chance"], "10%,12%,14%,17%,20%"],
  [4, "Mass Enfeeble", ["Damage Dealt"], "-5.5%,-6.6%,-7.7%,-9.35%,-11%"],
  [5, "Blood Wyrm", ["Damage Dealt", "Recovery Rate"], "8%,10.4%,12.8%,16%,20%"],
];
for (const [habit, title, labels, firstValues] of caraxesNames) {
  const row = insightForSource("caraxes", { kind: "habit", habit });
  if (!row) fail(`Caraxes habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Caraxes habit ${habit} title is ${row.title}, expected ${title}`);
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
const bloodWyrm = insightForSource("caraxes", { kind: "habit", habit: 5 });
if (
  bloodWyrm?.scale.find((row) => row.label === "Recovery Rate")?.values.join(",") !==
  "40%,52%,64%,80%,100%"
) {
  fail("Blood Wyrm Recovery Rate mismatch");
}
if (
  findAbilityInsight("Battle Dread", { dragonId: "caraxes" })?.title !==
  "Battle Dread"
) {
  fail("hovering Battle Dread should open Caraxes habit 1");
}
if (
  findAbilityInsight("Blood Wyrm", { dragonId: "caraxes" })?.title !== "Blood Wyrm"
) {
  fail("hovering Blood Wyrm should open Caraxes habit 5");
}
const carCatalog = catalogFor(caraxes);
if (carCatalog.namedCount !== 5 || carCatalog.needsScreenshot) {
  fail("Caraxes habit names from Star Progression should be complete");
}

const syrax = getCatalogDragon("syrax");
if (!syrax) fail("missing Syrax");
const syraxNames: [number, string, string[], string][] = [
  [1, "Mindful Synergy", ["Intelligence/Instinct"], "6.5%,7.8%,9.1%,11.05%,13%"],
  [2, "Flight Mastery", ["Initiative (Increase)", "Initiative (Reduction)"], "6%,7.2%,8.4%,10.2%,12%"],
  [3, "Strategic Revival", ["Recovery Rate", "Resistance Chance"], "50%,60%,70%,85%,100%"],
  [4, "Tactical Inferno", ["Damage Dealt"], "18%,21.6%,25.2%,30.6%,36%"],
  [5, "Mother's Mercy", ["Cleanse Chance"], "14%,18.2%,22.4%,28%,35%"],
];
for (const [habit, title, labels, firstValues] of syraxNames) {
  const row = insightForSource("syrax", { kind: "habit", habit });
  if (!row) fail(`Syrax habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Syrax habit ${habit} title is ${row.title}, expected ${title}`);
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
const flight = insightForSource("syrax", { kind: "habit", habit: 2 });
if (
  flight?.scale.find((row) => row.label === "Initiative (Reduction)")?.values.join(
    ",",
  ) !== "-6%,-7.2%,-8.4%,-10.2%,-12%"
) {
  fail("Flight Mastery Initiative (Reduction) mismatch");
}
const revival = insightForSource("syrax", { kind: "habit", habit: 3 });
if (
  revival?.scale.find((row) => row.label === "Resistance Chance")?.values.join(
    ",",
  ) !== "25%,30%,35%,42.5%,50%"
) {
  fail("Strategic Revival Resistance Chance mismatch");
}
if (revival?.scale.some((row) => row.values.join(",") === "75%,90%,105%,127.5%,150%")) {
  fail("Strategic Revival should skip 1.5x derived Recovery percents");
}
if (revival?.scale.some((row) => /^-20%/.test(row.values[0] ?? ""))) {
  fail("Strategic Revival should skip constant Resistance -20%");
}
if (/25% chance to grant/i.test(revival?.body ?? "")) {
  fail("do not rewrite Hub Strategic Revival text to screenshot wording");
}
if (!/Blazing Fury gains/i.test(revival?.body ?? "")) {
  fail("keep Hub Strategic Revival Blazing Fury gains text");
}
if (glossNames(revival).includes("Resistance")) {
  fail("Strategic Revival already explains Resistance; do not duplicate the glossary");
}
if (
  findAbilityInsight("Mindful Synergy", { dragonId: "syrax" })?.title !==
  "Mindful Synergy"
) {
  fail("hovering Mindful Synergy should open Syrax habit 1");
}
if (
  findAbilityInsight("Mother's Mercy", { dragonId: "syrax" })?.title !==
  "Mother's Mercy"
) {
  fail("hovering Mother's Mercy should open Syrax habit 5");
}
const syraxCommand = insightForSource("syrax", { kind: "command" });
if (!syraxCommand) fail("Syrax command missing");
if (syraxCommand.title !== "Blazing Fury") {
  fail(`Syrax command title is ${syraxCommand.title}, expected Blazing Fury`);
}
if (/Blazing Fury gains/i.test(syraxCommand.body)) {
  fail("do not rewrite Hub command text to screenshot wording");
}
if (
  findAbilityInsight("Blazing Fury", { dragonId: "syrax" })?.kind !== "command"
) {
  fail("hovering Blazing Fury should open Syrax's Command");
}
if (!namedChips(syraxCommand).includes("Blazing Fury")) {
  fail("Syrax command chips should include Blazing Fury");
}
const syraxCatalog = catalogFor(syrax);
if (syraxCatalog.namedCount !== 5 || syraxCatalog.needsScreenshot) {
  fail("Syrax habit names from Star Progression should be complete");
}
if (syraxCatalog.command.names.includes("Blazing Fury") === false) {
  fail("Dev catalog should list Blazing Fury on Syrax's Command");
}

const control = findAbilityInsight("Control", { dragonId: "syrax" });
if (!control || control.title !== "Control" || control.kind !== "buff") {
  fail(`Control hover opened ${control?.kind}:${control?.title}`);
}
if (control.polarity !== "debuff") fail("Control is a crowd-control category");
if (!/Stun, Stagger, Overwhelm, and Confusion/i.test(control.body)) {
  fail(`Control glossary missing Star Progression line: ${control.body}`);
}
if (
  glossNames(insightForSource("syrax", { kind: "habit", habit: 5 })).includes(
    "Control",
  ) === false
) {
  fail("Mother's Mercy should gloss Control");
}

const vhagar = getCatalogDragon("vhagar");
if (!vhagar) fail("missing Vhagar");
const vhagarNames: [number, string, string[], string][] = [
  [1, "Ancestral Shield", ["Damage Received", "Recovery Received"], "-12%,-14.4%,-16.8%,-20.4%,-24%"],
  [2, "Battle Leader", ["Damage Dealt"], "12.5%,15%,17.5%,21.25%,25%"],
  [3, "Eclipse Cover", ["Advantage & Weakened Chance"], "17.5%,21%,24.5%,29.8%,35%"],
  [4, "Blazing Onslaught", ["Damage Received"], "18%,21.6%,25.2%,30.6%,36%"],
  [5, "Skyward Titan", ["Strength", "Damage Received", "Damage Rate"], "5%,6.5%,8%,10%,12.5%"],
];
for (const [habit, title, labels, firstValues] of vhagarNames) {
  const row = insightForSource("vhagar", { kind: "habit", habit });
  if (!row) fail(`Vhagar habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Vhagar habit ${habit} title is ${row.title}, expected ${title}`);
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
const shield = insightForSource("vhagar", { kind: "habit", habit: 1 });
if (
  shield?.scale.find((row) => row.label === "Recovery Received")?.values.join(
    ",",
  ) !== "15%,18%,21%,25.5%,30%"
) {
  fail("Ancestral Shield Recovery Received mismatch");
}
const leader = insightForSource("vhagar", { kind: "habit", habit: 2 });
if (/excluding Basic Attacks/i.test(leader?.body ?? "")) {
  fail("do not rewrite Hub Battle Leader text to screenshot wording");
}
if (!/\(Command & Habits\)/.test(leader?.body ?? "")) {
  fail("keep Hub Battle Leader Command & Habits wording");
}
const eclipseCover = insightForSource("vhagar", { kind: "habit", habit: 3 });
if (/18% chance/i.test(eclipseCover?.body ?? "")) {
  fail("do not rewrite Hub Eclipse Cover 17.5% to screenshot 18%");
}
if (eclipseCover?.scale.some((row) => row.values.join(",") === "20%,20%,20%,20%,20%")) {
  fail("Eclipse Cover should skip constant Advantage/Weakened 20%");
}
if (
  glossNames(eclipseCover).includes("Advantage") === false ||
  glossNames(eclipseCover).includes("Weakened") === false
) {
  fail("Eclipse Cover should gloss Advantage and Weakened");
}
const onslaught = insightForSource("vhagar", { kind: "habit", habit: 4 });
if (/excluding Basic Attacks/i.test(onslaught?.body ?? "")) {
  fail("do not rewrite Hub Blazing Onslaught text to screenshot wording");
}
const titan = insightForSource("vhagar", { kind: "habit", habit: 5 });
if (
  titan?.scale.find((row) => row.label === "Damage Received")?.values.join(",") !==
  "-2.5%,-3.25%,-4%,-5%,-6.25%"
) {
  fail("Skyward Titan Damage Received mismatch");
}
if (
  titan?.scale.find((row) => row.label === "Damage Rate")?.values.join(",") !==
  "100%,130%,160%,200%,250%"
) {
  fail("Skyward Titan Damage Rate mismatch");
}
if (titan?.scale.some((row) => row.values.join(",") === "30%,30%,30%,30%,30%")) {
  fail("Skyward Titan should skip constant 30% Bulwark chance");
}
if (/-2%(?!\.)/.test(titan?.body ?? "") && !/-2\.5%/.test(titan?.body ?? "")) {
  fail("do not rewrite Hub Skyward Titan -2.5% to screenshot flavor -2%");
}
if (
  findAbilityInsight("Ancestral Shield", { dragonId: "vhagar" })?.title !==
  "Ancestral Shield"
) {
  fail("hovering Ancestral Shield should open Vhagar habit 1");
}
if (
  findAbilityInsight("Skyward Titan", { dragonId: "vhagar" })?.title !==
  "Skyward Titan"
) {
  fail("hovering Skyward Titan should open Vhagar habit 5");
}
const vhagarCommand = insightForSource("vhagar", { kind: "command" });
if (!vhagarCommand) fail("Vhagar command missing");
if (vhagarCommand.title !== "Command") {
  fail(`Vhagar command title is ${vhagarCommand.title}, expected Command`);
}
const vhagarCatalog = catalogFor(vhagar);
if (vhagarCatalog.namedCount !== 5 || vhagarCatalog.needsScreenshot) {
  fail("Vhagar habit names from Star Progression should be complete");
}

const seasmoke = getCatalogDragon("seasmoke");
if (!seasmoke) fail("missing Seasmoke");
const seasmokeNames: [number, string, string[], string][] = [
  [1, "Clever Maneuver", ["Intelligence", "Initiative"], "22%,26.4%,30.8%,37.4%,44%"],
  [2, "Wind's Favor", ["Initiative"], "12.5%,15%,17.5%,21.25%,25%"],
  [3, "Infectious Wrath", ["Recovery Received", "Damage Rate"], "-15%,-18%,-21%,-25.5%,-30%"],
  [4, "Cunning Ferocity", ["Intelligence", "Damage Dealt"], "7.5%,9%,10.5%,12.75%,15%"],
  [5, "Loyal Bond", ["Advantage Chance", "Resistance Chance"], "10%,13%,16%,20%,25%"],
];
for (const [habit, title, labels, firstValues] of seasmokeNames) {
  const row = insightForSource("seasmoke", { kind: "habit", habit });
  if (!row) fail(`Seasmoke habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Seasmoke habit ${habit} title is ${row.title}, expected ${title}`);
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
const clever = insightForSource("seasmoke", { kind: "habit", habit: 1 });
if (
  clever?.scale.find((row) => row.label === "Initiative")?.values.join(",") !==
  "12.5%,15%,17.5%,21.25%,25%"
) {
  fail("Clever Maneuver Initiative mismatch");
}
if (/Both effects are enhanced by Instinct/i.test(clever?.body ?? "")) {
  fail("do not rewrite Hub Clever Maneuver text to screenshot wording");
}
const infectious = insightForSource("seasmoke", { kind: "habit", habit: 3 });
if (/Cleansing Wrath gains/i.test(infectious?.body ?? "")) {
  fail("do not rewrite Hub Infectious Wrath text to screenshot wording");
}
if (!/Command gains/i.test(infectious?.body ?? "")) {
  fail("keep Hub Infectious Wrath Command gains text");
}
if (
  infectious?.scale.find((row) => row.label === "Damage Rate")?.values.join(
    ",",
  ) !== "30%,36%,42%,51%,60%"
) {
  fail("Infectious Wrath Damage Rate mismatch");
}
if (infectious?.scale.some((row) => row.values.join(",") === "60%,72%,84%,102%,120%")) {
  fail("Infectious Wrath should skip doubled Damage Rate with Panic");
}
if (glossNames(infectious).includes("Panic") === false) {
  fail("Infectious Wrath should gloss Panic");
}
const ferocity = insightForSource("seasmoke", { kind: "habit", habit: 4 });
if (
  ferocity?.scale.find((row) => row.label === "Damage Dealt")?.values.join(",") !==
  "5%,6%,7%,8.5%,10%"
) {
  fail("Cunning Ferocity Damage Dealt mismatch");
}
const loyalBond = insightForSource("seasmoke", { kind: "habit", habit: 5 });
if (
  loyalBond?.scale.find((row) => row.label === "Resistance Chance")?.values.join(
    ",",
  ) !== "10%,13%,16%,20%,25%"
) {
  fail("Loyal Bond Resistance Chance mismatch");
}
if (loyalBond?.scale.some((row) => row.values.join(",") === "20%,20%,20%,20%,20%")) {
  fail("Loyal Bond should skip constant Advantage/Resistance 20%");
}
if (loyalBond?.scale.some((row) => row.values.join(",") === "50%,50%,50%,50%,50%")) {
  fail("Loyal Bond should skip constant 50% troop capacity");
}
if (
  glossNames(loyalBond).includes("Advantage") === false ||
  glossNames(loyalBond).includes("Resistance") === false
) {
  fail("Loyal Bond should gloss Advantage and Resistance");
}
if (
  findAbilityInsight("Clever Maneuver", { dragonId: "seasmoke" })?.title !==
  "Clever Maneuver"
) {
  fail("hovering Clever Maneuver should open Seasmoke habit 1");
}
if (
  findAbilityInsight("Infectious Wrath", { dragonId: "seasmoke" })?.kind !==
  "habit"
) {
  fail("hovering Infectious Wrath should open Seasmoke habit 3");
}
if (
  findAbilityInsight("Loyal Bond", { dragonId: "seasmoke" })?.title !==
  "Loyal Bond"
) {
  fail("hovering Loyal Bond should open Seasmoke habit 5");
}
const seaCommand = insightForSource("seasmoke", { kind: "command" });
if (!seaCommand) fail("Seasmoke command missing");
if (seaCommand.title !== "Cleansing Wrath") {
  fail(`Seasmoke command title is ${seaCommand.title}, expected Cleansing Wrath`);
}
if (/Cleansing Wrath gains/i.test(seaCommand.body)) {
  fail("do not rewrite Hub command text to screenshot wording");
}
if (
  findAbilityInsight("Cleansing Wrath", { dragonId: "seasmoke" })?.kind !==
  "command"
) {
  fail("hovering Cleansing Wrath should open Seasmoke's Command");
}
if (!namedChips(seaCommand).includes("Cleansing Wrath")) {
  fail("Seasmoke command chips should include Cleansing Wrath");
}
const seaCatalog = catalogFor(seasmoke);
if (seaCatalog.namedCount !== 5 || seaCatalog.needsScreenshot) {
  fail("Seasmoke habit names from Star Progression should be complete");
}
if (seaCatalog.command.names.includes("Cleansing Wrath") === false) {
  fail("Dev catalog should list Cleansing Wrath on Seasmoke's Command");
}

const crimson = getCatalogDragon("crimson");
if (!crimson) fail("missing Crimson");
const crimsonNames: [number, string, string[], string][] = [
  [1, "Enervate", ["Damage Dealt"], "-13.5%,-16.2%,-18.9%,-22.95%,-27%"],
  [2, "Dragon's Intellect", ["Damage Received", "Intelligence"], "-6%,-7.2%,-8.4%,-10.2%,-12%"],
  [3, "Bloodscale Fury", ["Weakened Chance"], "17.5%,21%,24.5%,29.75%,35%"],
  [4, "Unlikely Hero", ["Damage Received", "Recovery Received"], "10%,12%,14%,17%,20%"],
  [5, "Vermin's Bane", ["Instinct/Initiative", "Stun Chance"], "-12%,-15.6%,-19.2%,-24%,-30%"],
];
for (const [habit, title, labels, firstValues] of crimsonNames) {
  const row = insightForSource("crimson", { kind: "habit", habit });
  if (!row) fail(`Crimson habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Crimson habit ${habit} title is ${row.title}, expected ${title}`);
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
const enervate = insightForSource("crimson", { kind: "habit", habit: 1 });
if (!/-13\.5%/.test(enervate?.body ?? "")) {
  fail("keep Hub Enervate -13.5%");
}
if (/excluding Basic Attacks/i.test(enervate?.body ?? "")) {
  fail("do not rewrite Hub Enervate text to screenshot wording");
}
const intellect = insightForSource("crimson", { kind: "habit", habit: 2 });
if (
  intellect?.scale.find((row) => row.label === "Intelligence")?.values.join(
    ",",
  ) !== "12%,14.4%,16.8%,20.4%,24%"
) {
  fail("Dragon's Intellect Intelligence mismatch");
}
const bloodscaleFury = insightForSource("crimson", { kind: "habit", habit: 3 });
if (!/17\.5% chance/i.test(bloodscaleFury?.body ?? "")) {
  fail("keep Hub Bloodscale Fury 17.5%");
}
if (/18% chance/i.test(bloodscaleFury?.body ?? "")) {
  fail("do not rewrite Hub Bloodscale Fury 17.5% to screenshot 18%");
}
if (/reduces the target's Damage Dealt/i.test(bloodscaleFury?.body ?? "")) {
  fail("do not copy Weakened glossary into Hub Bloodscale Fury text");
}
if (bloodscaleFury?.scale.some((row) => row.values.join(",") === "-20%,-20%,-20%,-20%,-20%")) {
  fail("Bloodscale Fury should skip constant Weakened -20%");
}
if (bloodscaleFury?.scale.some((row) => row.values.join(",") === "35%,42%,49%,59.5%,70%")) {
  fail("Bloodscale Fury should skip doubled Weakened chance");
}
if (glossNames(bloodscaleFury).includes("Weakened") === false) {
  fail("Bloodscale Fury should gloss Weakened");
}
const unlikelyHero = insightForSource("crimson", { kind: "habit", habit: 4 });
if (/Start of Each Round/i.test(unlikelyHero?.body ?? "")) {
  fail("do not rewrite Hub Unlikely Hero Each Round to screenshot wording");
}
if (/excluding Basic Attacks/i.test(unlikelyHero?.body ?? "")) {
  fail("do not rewrite Hub Unlikely Hero Command & Habits to screenshot wording");
}
if (!/Command & Habits/i.test(unlikelyHero?.body ?? "")) {
  fail("keep Hub Unlikely Hero Command & Habits text");
}
if (
  unlikelyHero?.scale.find((row) => row.label === "Recovery Received")?.values.join(
    ",",
  ) !== "-20%,-24%,-28%,-34%,-40%"
) {
  fail("Unlikely Hero Recovery Received mismatch");
}
if (unlikelyHero?.scale.some((row) => row.values.join(",") === "75%,75%,75%,75%,75%")) {
  fail("Unlikely Hero should skip constant 75% troop capacity");
}
if (unlikelyHero?.scale.some((row) => row.values.join(",") === "25%,25%,25%,25%,25%")) {
  fail("Unlikely Hero should skip constant 25% troop capacity");
}
const verminsBane = insightForSource("crimson", { kind: "habit", habit: 5 });
if (/Bloodscale Terror gains/i.test(verminsBane?.body ?? "")) {
  fail("do not rewrite Hub Vermin's Bane text to screenshot wording");
}
if (!/Command gains/i.test(verminsBane?.body ?? "")) {
  fail("keep Hub Vermin's Bane Command gains text");
}
if (
  verminsBane?.scale.find((row) => row.label === "Stun Chance")?.values.join(
    ",",
  ) !== "40%,52%,64%,80%,100%"
) {
  fail("Vermin's Bane Stun Chance mismatch");
}
if (verminsBane?.scale.some((row) => row.values.join(",") === "50%,50%,50%,50%,50%")) {
  fail("Vermin's Bane should skip constant 50% even-round chance");
}
if (glossNames(verminsBane).includes("Stun") === false) {
  fail("Vermin's Bane should gloss Stun");
}
if (
  findAbilityInsight("Enervate", { dragonId: "crimson" })?.title !== "Enervate"
) {
  fail("hovering Enervate should open Crimson habit 1");
}
if (
  findAbilityInsight("Bloodscale Fury", { dragonId: "crimson" })?.kind !==
  "habit"
) {
  fail("hovering Bloodscale Fury should open Crimson habit 3");
}
if (
  findAbilityInsight("Vermin's Bane", { dragonId: "crimson" })?.title !==
  "Vermin's Bane"
) {
  fail("hovering Vermin's Bane should open Crimson habit 5");
}
const crimsonCommand = insightForSource("crimson", { kind: "command" });
if (!crimsonCommand) fail("Crimson command missing");
if (crimsonCommand.title !== "Bloodscale Terror") {
  fail(
    `Crimson command title is ${crimsonCommand.title}, expected Bloodscale Terror`,
  );
}
if (/Bloodscale Terror gains/i.test(crimsonCommand.body)) {
  fail("do not rewrite Hub command text to screenshot wording");
}
if (
  findAbilityInsight("Bloodscale Terror", { dragonId: "crimson" })?.kind !==
  "command"
) {
  fail("hovering Bloodscale Terror should open Crimson's Command");
}
if (!namedChips(crimsonCommand).includes("Bloodscale Terror")) {
  fail("Crimson command chips should include Bloodscale Terror");
}
const crimsonCatalog = catalogFor(crimson);
if (crimsonCatalog.namedCount !== 5 || crimsonCatalog.needsScreenshot) {
  fail("Crimson habit names from Star Progression should be complete");
}
if (crimsonCatalog.command.names.includes("Bloodscale Terror") === false) {
  fail("Dev catalog should list Bloodscale Terror on Crimson's Command");
}
const crimsonWeakened = findAbilityInsight("Weakened", { dragonId: "crimson" });
if (
  crimsonWeakened?.dragonName !== "Crimson" ||
  crimsonWeakened.unlockStars !== 6
) {
  fail(
    `Weakened on Crimson should be 6★ Bloodscale Fury, got ${crimsonWeakened?.dragonName} ${crimsonWeakened?.unlockStars}`,
  );
}

const sheepstealer = getCatalogDragon("sheepstealer");
if (!sheepstealer) fail("missing Sheepstealer");
const sheepNames: [number, string, string[], string][] = [
  [
    1,
    "Stolen Flock",
    ["Fire Damage Dealt (Non-player)", "Fire Damage Dealt (per Stack)"],
    "10%,12%,14%,17%,20%",
  ],
  [2, "Dragon's Cunning", ["Intelligence", "Instinct"], "16%,19.2%,22.4%,27.2%,32%"],
  [3, "Baited Kill", ["Vulnerable Chance", "Cleanse Chance"], "25%,30%,35%,42.5%,50%"],
  [4, "Wary Beast", ["Evade Rate", "Recovery Received"], "10%,12%,14%,17%,20%"],
  [5, "Savage Claim", ["Damage Rate", "Recovery Rate"], "24%,31.2%,38.4%,48%,60%"],
];
for (const [habit, title, labels, firstValues] of sheepNames) {
  const row = insightForSource("sheepstealer", { kind: "habit", habit });
  if (!row) fail(`Sheepstealer habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Sheepstealer habit ${habit} title is ${row.title}, expected ${title}`);
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
const stolenFlock = insightForSource("sheepstealer", { kind: "habit", habit: 1 });
if (
  stolenFlock?.scale.find((row) => row.label === "Fire Damage Dealt (per Stack)")
    ?.values.join(",") !== "3%,3.6%,4.2%,5.1%,6%"
) {
  fail("Stolen Flock per-stack Fire Damage Dealt mismatch");
}
if (stolenFlock?.scale.some((row) => row.values.join(",") === "50%,50%,50%,50%,50%")) {
  fail("Stolen Flock should skip constant 50% stack chance");
}
const cunning = insightForSource("sheepstealer", { kind: "habit", habit: 2 });
if (
  cunning?.scale.find((row) => row.label === "Instinct")?.values.join(",") !==
  "-12%,-14.4%,-16.8%,-20.4%,-24%"
) {
  fail("Dragon's Cunning Instinct mismatch");
}
const baitedKill = insightForSource("sheepstealer", { kind: "habit", habit: 3 });
if (
  baitedKill?.scale.find((row) => row.label === "Cleanse Chance")?.values.join(
    ",",
  ) !== "50%,60%,70%,85%,100%"
) {
  fail("Baited Kill Cleanse Chance mismatch");
}
if (baitedKill?.scale.some((row) => row.values.join(",") === "20%,20%,20%,20%,20%")) {
  fail("Baited Kill should skip constant Vulnerable +20%");
}
if (
  baitedKill?.scale.filter(
    (row) => row.values.join(",") === "50%,60%,70%,85%,100%",
  ).length > 1
) {
  fail("Baited Kill should skip doubled Vulnerable chance");
}
if (baitedKill?.scale.some((row) => /prey/i.test(row.label))) {
  fail("Baited Kill should not label Vulnerable Chance as Prey");
}
if (!/Vulnerable \(\+20%\)/.test(baitedKill?.body ?? "")) {
  fail("keep Hub Baited Kill Vulnerable (+20%)");
}
if (/Vulnerable increases the target's Damage Received/i.test(baitedKill?.body ?? "")) {
  fail("do not copy Vulnerable glossary into Hub Baited Kill text");
}
if (glossNames(baitedKill).includes("Vulnerable") === false) {
  fail("Baited Kill should gloss Vulnerable");
}
if (glossNames(baitedKill).includes("Prey") === false) {
  fail("Baited Kill should gloss Prey");
}
const waryBeast = insightForSource("sheepstealer", { kind: "habit", habit: 4 });
if (
  waryBeast?.scale.find((row) => row.label === "Recovery Received")?.values.join(
    ",",
  ) !== "-10%,-12%,-14%,-17%,-20%"
) {
  fail("Wary Beast Recovery Received mismatch");
}
if (waryBeast?.scale.some((row) => row.values.join(",") === "50%,50%,50%,50%,50%")) {
  fail("Wary Beast should skip constant 50% troop capacity");
}
if (/Evade causes/i.test(waryBeast?.body ?? "")) {
  fail("do not rewrite Hub Wary Beast Evade cause to screenshot wording");
}
if (!/Evade cause each instance/i.test(waryBeast?.body ?? "")) {
  fail("keep Hub Wary Beast Evade definition");
}
if (glossNames(waryBeast).includes("Evade")) {
  fail("Wary Beast Hub already defines Evade; do not duplicate the glossary");
}
const savageClaim = insightForSource("sheepstealer", { kind: "habit", habit: 5 });
if (/Wild Hunt gains/i.test(savageClaim?.body ?? "")) {
  fail("do not rewrite Hub Savage Claim text to screenshot wording");
}
if (
  savageClaim?.scale.find((row) => row.label === "Recovery Rate")?.values.join(
    ",",
  ) !== "10%,13%,16%,20%,25%"
) {
  fail("Savage Claim Recovery Rate mismatch");
}
if (savageClaim?.scale.some((row) => row.values.join(",") === "72%,93.6%,115.2%,144%,180%")) {
  fail("Savage Claim should skip tripled Damage Rate");
}
if (savageClaim?.scale.some((row) => row.values.join(",") === "30%,39%,48%,60%,75%")) {
  fail("Savage Claim should skip tripled Recovery");
}
if (glossNames(savageClaim).includes("Prey") === false) {
  fail("Savage Claim should gloss Prey");
}
if (
  findAbilityInsight("Stolen Flock", { dragonId: "sheepstealer" })?.title !==
  "Stolen Flock"
) {
  fail("hovering Stolen Flock should open Sheepstealer habit 1");
}
if (
  findAbilityInsight("Baited Kill", { dragonId: "sheepstealer" })?.kind !== "habit"
) {
  fail("hovering Baited Kill should open Sheepstealer habit 3");
}
if (
  findAbilityInsight("Savage Claim", { dragonId: "sheepstealer" })?.title !==
  "Savage Claim"
) {
  fail("hovering Savage Claim should open Sheepstealer habit 5");
}
const sheepCommand = insightForSource("sheepstealer", { kind: "command" });
if (!sheepCommand) fail("Sheepstealer command missing");
if (sheepCommand.title !== "Wild Hunt") {
  fail(`Sheepstealer command title is ${sheepCommand.title}, expected Wild Hunt`);
}
if (/Wild Hunt gains/i.test(sheepCommand.body)) {
  fail("do not rewrite Hub command text to screenshot wording");
}
if (!/Prey reduces the target's Recovery Received/i.test(sheepCommand.body)) {
  fail("keep Hub Wild Hunt Prey definition");
}
if (/-30\$/.test(sheepCommand.body) === false) {
  fail("do not rewrite Hub Prey -30$ typo");
}
if (
  findAbilityInsight("Wild Hunt", { dragonId: "sheepstealer" })?.kind !== "command"
) {
  fail("hovering Wild Hunt should open Sheepstealer's Command");
}
if (!namedChips(sheepCommand).includes("Wild Hunt")) {
  fail("Sheepstealer command chips should include Wild Hunt");
}
if (!namedChips(sheepCommand).includes("Prey")) {
  fail("Sheepstealer command chips should include Prey");
}
const sheepCatalog = catalogFor(sheepstealer);
if (sheepCatalog.namedCount !== 5 || sheepCatalog.needsScreenshot) {
  fail("Sheepstealer habit names from Star Progression should be complete");
}
if (sheepCatalog.command.names.includes("Wild Hunt") === false) {
  fail("Dev catalog should list Wild Hunt on Sheepstealer's Command");
}
const sheepVulnerable = findAbilityInsight("Vulnerable", {
  dragonId: "sheepstealer",
});
if (!sheepVulnerable || sheepVulnerable.kind !== "buff") {
  fail(`Vulnerable hover opened ${sheepVulnerable?.kind}:${sheepVulnerable?.title}`);
}
if (sheepVulnerable.polarity !== "debuff") fail("Vulnerable is a debuff");
if (!/Damage Received/i.test(sheepVulnerable.body) || !/increases/i.test(sheepVulnerable.body)) {
  fail(`Vulnerable glossary missing Star Progression line: ${sheepVulnerable.body}`);
}
if (sheepVulnerable.dragonName !== "Sheepstealer" || sheepVulnerable.unlockStars !== 6) {
  fail(
    `Vulnerable on Sheepstealer should be 6★ Baited Kill, got ${sheepVulnerable.dragonName} ${sheepVulnerable.unlockStars}`,
  );
}
const sheepPrey = findAbilityInsight("Prey", { dragonId: "sheepstealer" });
if (!sheepPrey || sheepPrey.kind !== "buff") {
  fail(`Prey hover opened ${sheepPrey?.kind}:${sheepPrey?.title}`);
}
if (sheepPrey.polarity !== "debuff") fail("Prey is a debuff");
if (!/Recovery Received/i.test(sheepPrey.body) || !/reduces/i.test(sheepPrey.body)) {
  fail(`Prey glossary missing Recovery Received: ${sheepPrey.body}`);
}
if (sheepPrey.title === "Wild Hunt") {
  fail("hovering Prey should open the Prey debuff, not Wild Hunt");
}
const sheepEvade = findAbilityInsight("Evade", { dragonId: "sheepstealer" });
if (!sheepEvade || sheepEvade.kind !== "buff") {
  fail(`Evade hover opened ${sheepEvade?.kind}:${sheepEvade?.title}`);
}
if (sheepEvade.polarity !== "buff") fail("Evade is a buff");
if (!/chance to be ignored/i.test(sheepEvade.body)) {
  fail(`Evade glossary missing Star Progression line: ${sheepEvade.body}`);
}
if (statusMarkPolarity("Prey") !== "debuff") fail("Prey mark is a debuff");
if (statusMarkPolarity("Evade") !== "buff") fail("Evade mark is a buff");
if (statusMarkPolarity("Vulnerable") !== "debuff") fail("Vulnerable mark is a debuff");
if (statusMarkPolarity("Cleanse") !== "buff") fail("Cleanse mark is a buff");
if (statusMarkPolarity("Stolen Flock") !== "buff") {
  fail("Stolen Flock in habit text should get a buff arrow");
}
if (statusMarkPolarity("Wild Hunt") != null) {
  fail("Wild Hunt is the Command name, not a buff/debuff mark");
}
if (statusMarkPolarity("Recovery") != null) {
  fail("Recovery is a keyword, not a named buff/debuff");
}
const preyTone = tokenizeAbilityText("mark 1 Enemy as your Prey").find(
  (part) => part.value === "Prey",
)?.tone;
if (preyTone !== "debuff") {
  fail(`Prey text tone is ${preyTone}, expected debuff`);
}
const evadeTone = tokenizeAbilityText("gain Evade").find(
  (part) => part.value === "Evade",
)?.tone;
if (evadeTone !== "buff") {
  fail(`Evade text tone is ${evadeTone}, expected buff`);
}
const flockTone = tokenizeAbilityText("1 stack of Stolen Flock").find(
  (part) => part.value === "Stolen Flock",
)?.tone;
if (flockTone !== "buff") {
  fail(`Stolen Flock text tone is ${flockTone}, expected buff`);
}
const huntTone = tokenizeAbilityText("Wild Hunt").find(
  (part) => part.value === "Wild Hunt",
)?.tone;
if (huntTone !== "command") {
  fail(`Wild Hunt text tone is ${huntTone}, expected command`);
}

const daemoros = getCatalogDragon("daemoros");
if (!daemoros) fail("missing Daemoros");
const daemorosNames: [number, string, string[], string][] = [
  [1, "Instill Fear", ["Panic Chance"], "25%,30%,35%,42.5%,50%"],
  [2, "Powerful Reflexes", ["Strength/Initiative"], "16%,19.2%,22.4%,27.2%,32%"],
  [3, "Shroud of Shadows", ["Confusion Chance"], "15%,18%,21%,25.5%,30%"],
  [4, "Darkening Fear", ["Panic Chance"], "25%,30%,35%,42.5%,50%"],
  [5, "Phantom's Veil", ["Damage Received"], "-15%,-19.5%,-24%,-30%,-37.5%"],
];
for (const [habit, title, labels, firstValues] of daemorosNames) {
  const row = insightForSource("daemoros", { kind: "habit", habit });
  if (!row) fail(`Daemoros habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Daemoros habit ${habit} title is ${row.title}, expected ${title}`);
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
const instillFear = insightForSource("daemoros", { kind: "habit", habit: 1 });
if (!/Right Flank/i.test(instillFear?.body ?? "")) {
  fail("keep Hub Instill Fear Right Flank targeting");
}
if (!/Enemey/i.test(instillFear?.body ?? "")) {
  fail("do not rewrite Hub Instill Fear Enemey spelling");
}
if (instillFear?.scale.some((row) => row.values.join(",") === "-25%,-25%,-25%,-25%,-25%")) {
  fail("Instill Fear should skip constant Intelligence/Instinct -25%");
}
if (instillFear?.scale.some((row) => row.values.join(",") === "20%,20%,20%,20%,20%")) {
  fail("Instill Fear should skip constant Panic Damage Rate +20%");
}
if (glossNames(instillFear).includes("Panic") === false) {
  fail("Instill Fear should gloss Panic");
}
const powerfulReflexes = insightForSource("daemoros", { kind: "habit", habit: 2 });
if (!/Strength and Initiative/i.test(powerfulReflexes?.body ?? "")) {
  fail("keep Hub Powerful Reflexes Strength and Initiative text");
}
const shroud = insightForSource("daemoros", { kind: "habit", habit: 3 });
if (/mistake Allies for Enemies/i.test(shroud?.body ?? "")) {
  fail("do not copy Confusion glossary into Hub Shroud of Shadows text");
}
if (glossNames(shroud).includes("Confusion") === false) {
  fail("Shroud of Shadows should gloss Confusion");
}
const darkeningFear = insightForSource("daemoros", { kind: "habit", habit: 4 });
if (!/Left Flank/i.test(darkeningFear?.body ?? "")) {
  fail("keep Hub Darkening Fear Left Flank targeting");
}
if (!/Each Round 1:/i.test(darkeningFear?.body ?? "")) {
  fail("do not rewrite Hub Darkening Fear Each Round 1: to screenshot wording");
}
if (glossNames(darkeningFear).includes("Panic") === false) {
  fail("Darkening Fear should gloss Panic");
}
const phantomVeil = insightForSource("daemoros", { kind: "habit", habit: 5 });
if (/Start of Each Round/i.test(phantomVeil?.body ?? "")) {
  fail("do not rewrite Hub Phantom's Veil Each Round to screenshot wording");
}
if (!/Each Round: Reduce either your Physical, Tactical OR Fire Damage Received/i.test(
  phantomVeil?.body ?? "",
)) {
  fail("keep Hub Phantom's Veil Each Round text");
}
if (
  findAbilityInsight("Instill Fear", { dragonId: "daemoros" })?.title !==
  "Instill Fear"
) {
  fail("hovering Instill Fear should open Daemoros habit 1");
}
if (
  findAbilityInsight("Shroud of Shadows", { dragonId: "daemoros" })?.kind !==
  "habit"
) {
  fail("hovering Shroud of Shadows should open Daemoros habit 3");
}
if (
  findAbilityInsight("Phantom's Veil", { dragonId: "daemoros" })?.title !==
  "Phantom's Veil"
) {
  fail("hovering Phantom's Veil should open Daemoros habit 5");
}
const daeCommand = insightForSource("daemoros", { kind: "command" });
if (!daeCommand) fail("Daemoros command missing");
if (daeCommand.title !== "Command") {
  fail(`Daemoros command title is ${daeCommand.title}, expected Command`);
}
const daeCatalog = catalogFor(daemoros);
if (daeCatalog.namedCount !== 5 || daeCatalog.needsScreenshot) {
  fail("Daemoros habit names from Star Progression should be complete");
}
const daeConfusion = findAbilityInsight("Confusion", { dragonId: "daemoros" });
if (!daeConfusion || daeConfusion.kind !== "buff") {
  fail(`Confusion hover opened ${daeConfusion?.kind}:${daeConfusion?.title}`);
}
if (daeConfusion.polarity !== "debuff") fail("Confusion is a debuff");
if (!/mistake Allies for Enemies/i.test(daeConfusion.body)) {
  fail(`Confusion glossary missing Star Progression line: ${daeConfusion.body}`);
}
if (daeConfusion.dragonName !== "Daemoros" || daeConfusion.unlockStars !== 6) {
  fail(
    `Confusion on Daemoros should be 6★ Shroud of Shadows, got ${daeConfusion.dragonName} ${daeConfusion.unlockStars}`,
  );
}
const daePanic = findAbilityInsight("Panic", { dragonId: "daemoros" });
if (daePanic?.dragonName !== "Daemoros" || daePanic.unlockStars !== 2) {
  fail(
    `Panic on Daemoros should be 2★ Instill Fear, got ${daePanic?.dragonName} ${daePanic?.unlockStars}`,
  );
}
if (statusMarkPolarity("Confusion") !== "debuff") fail("Confusion mark is a debuff");
const confusionTone = tokenizeAbilityText("afflict Confusion").find(
  (part) => part.value === "Confusion",
)?.tone;
if (confusionTone !== "debuff") {
  fail(`Confusion text tone is ${confusionTone}, expected debuff`);
}

const shadowsong = getCatalogDragon("shadowsong");
if (!shadowsong) fail("missing Shadowsong");
const shadowNames: [number, string, string[], string][] = [
  [1, "Ensnare", ["Instinct/Initiative"], "-18%,-21.6%,-25.2%,-30.6%,-36%"],
  [2, "Blazing Onslaught", ["Damage Received"], "15%,18%,21%,25.5%,30%"],
  [3, "Scorched Earth", ["Vulnerable Chance"], "10%,12%,14%,17%,20%"],
  [4, "Dragon's Intellect", ["Damage Received", "Intelligence"], "-5%,-6%,-7%,-8.5%,-10%"],
  [5, "Blazing Conductor", ["Damage Rate", "Burn Chance", "Damage Rate (2)", "Burn Chance (2)"], "60%,78%,96%,120%,150%"],
];
for (const [habit, title, labels, firstValues] of shadowNames) {
  const row = insightForSource("shadowsong", { kind: "habit", habit });
  if (!row) fail(`Shadowsong habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Shadowsong habit ${habit} title is ${row.title}, expected ${title}`);
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
const ensnare = insightForSource("shadowsong", { kind: "habit", habit: 1 });
if (!/Instinct and Initiative/i.test(ensnare?.body ?? "")) {
  fail("keep Hub Ensnare Instinct and Initiative text");
}
if (!/3 rounds/i.test(ensnare?.body ?? "")) {
  fail("keep Hub Ensnare 3 rounds wording");
}
if (/3 round\(s\)/i.test(ensnare?.body ?? "")) {
  fail("do not rewrite Hub Ensnare rounds to screenshot round(s)");
}
const shadowOnslaught = insightForSource("shadowsong", { kind: "habit", habit: 2 });
if (/excluding Basic Attacks/i.test(shadowOnslaught?.body ?? "")) {
  fail("do not rewrite Hub Blazing Onslaught Command & Habits to screenshot wording");
}
if (!/Physical Damage \(Command & Habits\) Received/i.test(shadowOnslaught?.body ?? "")) {
  fail("keep Hub Blazing Onslaught Physical Damage (Command & Habits) Received");
}
if (!/Left Flank/i.test(shadowOnslaught?.body ?? "") || !/Right Flank/i.test(shadowOnslaught?.body ?? "")) {
  fail("keep Hub Blazing Onslaught Left Flank and Right Flank targeting");
}
if (shadowOnslaught?.scale.length !== 1) {
  fail(
    `Blazing Onslaught should be one Damage Received row, got ${shadowOnslaught?.scale.map((row) => row.label).join(", ")}`,
  );
}
const scorchedEarth = insightForSource("shadowsong", { kind: "habit", habit: 3 });
if (scorchedEarth?.scale.some((row) => row.values.join(",") === "15%,15%,15%,15%,15%")) {
  fail("Scorched Earth should skip constant Vulnerable +15%");
}
if (scorchedEarth?.scale.some((row) => row.values.join(",") === "20%,24%,28%,34%,40%")) {
  fail("Scorched Earth should skip doubled Vulnerable chance");
}
if (!/This chance is doubled \(\+20%\)/i.test(scorchedEarth?.body ?? "")) {
  fail("keep Hub Scorched Earth doubled (+20%)");
}
if (/This chance is doubled \(20%\)/i.test(scorchedEarth?.body ?? "")) {
  fail("do not rewrite Hub Scorched Earth doubled (+20%) to screenshot (24%) flavor");
}
if (/Increases the target's Damage Received/i.test(scorchedEarth?.body ?? "")) {
  fail("do not copy Vulnerable glossary into Hub Scorched Earth text");
}
if (glossNames(scorchedEarth).includes("Vulnerable") === false) {
  fail("Scorched Earth should gloss Vulnerable");
}
if (glossNames(scorchedEarth).includes("Panic") === false) {
  fail("Scorched Earth should gloss Panic");
}
const shadowIntellect = insightForSource("shadowsong", { kind: "habit", habit: 4 });
if (
  shadowIntellect?.scale.find((row) => row.label === "Intelligence")?.values.join(
    ",",
  ) !== "8.5%,10.2%,11.9%,14.45%,17%"
) {
  fail("Shadowsong Dragon's Intellect Intelligence mismatch");
}
if (
  findAbilityInsight("Dragon's Intellect", { dragonId: "shadowsong" })?.id !==
  shadowIntellect?.id
) {
  fail("hovering Dragon's Intellect on Shadowsong should open habit 4, not Crimson");
}
if (
  findAbilityInsight("Dragon's Intellect", { dragonId: "crimson" })?.id ===
  shadowIntellect?.id
) {
  fail("Crimson Dragon's Intellect must stay distinct from Shadowsong");
}
const blazingConductor = insightForSource("shadowsong", { kind: "habit", habit: 5 });
if (
  blazingConductor?.scale.find((row) => row.label === "Burn Chance")?.values.join(
    ",",
  ) !== "40%,52%,64%,80%,100%"
) {
  fail("Blazing Conductor Burn Chance mismatch");
}
if (
  blazingConductor?.scale.find((row) => row.label === "Damage Rate (2)")?.values.join(
    ",",
  ) !== "30%,39%,48%,60%,75%"
) {
  fail("Blazing Conductor Damage Rate (2) mismatch");
}
if (
  blazingConductor?.scale.find((row) => row.label === "Burn Chance (2)")?.values.join(
    ",",
  ) !== "20%,26%,32%,40%,50%"
) {
  fail("Blazing Conductor Burn Chance (2) mismatch");
}
if (/Breath of Fire gains/i.test(blazingConductor?.body ?? "")) {
  fail("do not rewrite Hub Blazing Conductor Command deal to Breath of Fire gains");
}
if (!/Command deal Fire Damage/i.test(blazingConductor?.body ?? "")) {
  fail("keep Hub Blazing Conductor Command deal Fire Damage");
}
if (glossNames(blazingConductor).includes("Burn") === false) {
  fail("Blazing Conductor should gloss Burn");
}
if (
  findAbilityInsight("Blazing Onslaught", { dragonId: "shadowsong" })?.id !==
  shadowOnslaught?.id
) {
  fail("hovering Blazing Onslaught on Shadowsong should open habit 2, not Vhagar");
}
if (
  findAbilityInsight("Blazing Onslaught", { dragonId: "vhagar" })?.id ===
  shadowOnslaught?.id
) {
  fail("Vhagar Blazing Onslaught must stay distinct from Shadowsong");
}
if (
  findAbilityInsight("Ensnare", { dragonId: "shadowsong" })?.title !== "Ensnare"
) {
  fail("hovering Ensnare should open Shadowsong habit 1");
}
if (
  findAbilityInsight("Blazing Conductor", { dragonId: "shadowsong" })?.title !==
  "Blazing Conductor"
) {
  fail("hovering Blazing Conductor should open Shadowsong habit 5");
}
const shadowCommand = insightForSource("shadowsong", { kind: "command" });
if (!shadowCommand) fail("Shadowsong command missing");
if (shadowCommand.title !== "Breath of Fire") {
  fail(`Shadowsong command title is ${shadowCommand.title}, expected Breath of Fire`);
}
if (/Breath of Fire gains/i.test(shadowCommand.body)) {
  fail("do not rewrite Hub command text to screenshot wording");
}
if (!/1\.5x/i.test(shadowCommand.body) || !/\+150%/.test(shadowCommand.body)) {
  fail("keep Hub Breath of Fire 1.5x Panic Damage Rate");
}
if (shadowCommand.scale.some((row) => /power/i.test(row.label))) {
  fail("Breath of Fire must not invent Power");
}
if (
  findAbilityInsight("Breath of Fire", { dragonId: "shadowsong" })?.kind !==
  "command"
) {
  fail("hovering Breath of Fire should open Shadowsong's Command");
}
if (!namedChips(shadowCommand).includes("Breath of Fire")) {
  fail("Shadowsong command chips should include Breath of Fire");
}
if (glossNames(shadowCommand).includes("Panic") === false) {
  fail("Breath of Fire should gloss Panic");
}
const breathTone = tokenizeAbilityText("Breath of Fire").find(
  (part) => part.value === "Breath of Fire",
)?.tone;
if (breathTone !== "command") {
  fail(`Breath of Fire text tone is ${breathTone}, expected command`);
}
const shadowCatalog = catalogFor(shadowsong);
if (shadowCatalog.namedCount !== 5 || shadowCatalog.needsScreenshot) {
  fail("Shadowsong habit names from Star Progression should be complete");
}
if (shadowCatalog.command.names.includes("Breath of Fire") === false) {
  fail("Dev catalog should list Breath of Fire on Shadowsong's Command");
}
const songVulnerable = findAbilityInsight("Vulnerable", { dragonId: "shadowsong" });
if (
  songVulnerable?.dragonName !== "Shadowsong" ||
  songVulnerable.unlockStars !== 6
) {
  fail(
    `Vulnerable on Shadowsong should be 6★ Scorched Earth, got ${songVulnerable?.dragonName} ${songVulnerable?.unlockStars}`,
  );
}
const songBurn = findAbilityInsight("Burn", { dragonId: "shadowsong" });
if (songBurn?.dragonName !== "Shadowsong" || songBurn.unlockStars !== 10) {
  fail(
    `Burn on Shadowsong should be 10★ Blazing Conductor, got ${songBurn?.dragonName} ${songBurn?.unlockStars}`,
  );
}

const tessarion = getCatalogDragon("tessarion");
if (!tessarion) fail("missing Tessarion");
const tessNames: [number, string, string[], string][] = [
  [1, "Sharpened Beauty", ["Damage Dealt"], "7%,8.4%,9.8%,11.9%,14%"],
  [2, "Blazing Leader", ["Damage Dealt"], "10%,12%,14%,17%,20%"],
  [3, "Molten Armor", ["Molten Armor Chance"], "25%,30%,35%,42.5%,50%"],
  [4, "Clever Maneuver", ["Intelligence", "Initiative"], "18%,21.6%,25.2%,30.6%,36%"],
  [5, "The Blue Queen", ["The Blue Queen Chance"], "40%,52%,64%,80%,100%"],
];
for (const [habit, title, labels, firstValues] of tessNames) {
  const row = insightForSource("tessarion", { kind: "habit", habit });
  if (!row) fail(`Tessarion habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Tessarion habit ${habit} title is ${row.title}, expected ${title}`);
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
const sharpenedBeauty = insightForSource("tessarion", { kind: "habit", habit: 1 });
if (!/Physical and Fire Damage Dealt/i.test(sharpenedBeauty?.body ?? "")) {
  fail("keep Hub Sharpened Beauty Physical and Fire Damage Dealt");
}
if (!/Double these effects \(\+14%\)/i.test(sharpenedBeauty?.body ?? "")) {
  fail("keep Hub Sharpened Beauty Double these effects (+14%)");
}
if (sharpenedBeauty?.scale.some((row) => row.values.join(",") === "14%,16.8%,19.6%,23.8%,28%")) {
  fail("Sharpened Beauty should skip doubled Damage Dealt");
}
if (sharpenedBeauty?.scale.length !== 1) {
  fail(
    `Sharpened Beauty should be one Damage Dealt row, got ${sharpenedBeauty?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (glossNames(sharpenedBeauty).includes("Advantage") === false) {
  fail("Sharpened Beauty should gloss Advantage");
}
const blazingLeader = insightForSource("tessarion", { kind: "habit", habit: 2 });
if (!/Left Flank/i.test(blazingLeader?.body ?? "")) {
  fail("keep Hub Blazing Leader Left Flank targeting");
}
if (!/Fire Damage Dealt/i.test(blazingLeader?.body ?? "")) {
  fail("keep Hub Blazing Leader Fire Damage Dealt");
}
const moltenArmor = insightForSource("tessarion", { kind: "habit", habit: 3 });
if (moltenArmor?.scale.some((row) => row.values.join(",") === "12%,12%,12%,12%,12%")) {
  fail("Molten Armor should skip constant Fire Damage Dealt +12% and Physical Damage Received -12%");
}
if (!/afflicted with Panic/i.test(moltenArmor?.body ?? "")) {
  fail("keep Hub Molten Armor Panic self-apply");
}
if (/2 round\(s\)/i.test(moltenArmor?.body ?? "")) {
  fail("do not rewrite Hub Molten Armor 2 rounds to screenshot round(s)");
}
if (glossNames(moltenArmor).includes("Panic") === false) {
  fail("Molten Armor should gloss Panic");
}
const tessManeuver = insightForSource("tessarion", { kind: "habit", habit: 4 });
if (/Start of Combat:/i.test(tessManeuver?.body ?? "")) {
  fail("do not rewrite Hub Tessarion Clever Maneuver to add Start of Combat");
}
if (/Both effects are enhanced by Instinct/i.test(tessManeuver?.body ?? "")) {
  fail("do not rewrite Hub Tessarion Clever Maneuver to screenshot Instinct wording");
}
if (
  tessManeuver?.scale.find((row) => row.label === "Initiative")?.values.join(
    ",",
  ) !== "9%,10.8%,12.6%,15.3%,18%"
) {
  fail("Tessarion Clever Maneuver Initiative mismatch");
}
if (
  findAbilityInsight("Clever Maneuver", { dragonId: "tessarion" })?.id !==
  tessManeuver?.id
) {
  fail("hovering Clever Maneuver on Tessarion should open habit 4, not Seasmoke");
}
if (
  findAbilityInsight("Clever Maneuver", { dragonId: "seasmoke" })?.id ===
  tessManeuver?.id
) {
  fail("Seasmoke Clever Maneuver must stay distinct from Tessarion");
}
const blueQueen = insightForSource("tessarion", { kind: "habit", habit: 5 });
if (blueQueen?.scale.some((row) => row.values.join(",") === "-10%,-10%,-10%,-10%,-10%")) {
  fail("The Blue Queen should skip constant Damage Received -10%");
}
if (blueQueen?.scale.some((row) => row.values.join(",") === "15%,15%,15%,15%,15%")) {
  fail("The Blue Queen should skip constant Intelligence +15%");
}
if (blueQueen?.scale.some((row) => row.values.join(",") === "-20%,-20%,-20%,-20%,-20%")) {
  fail("The Blue Queen should skip doubled Damage Received -20%");
}
if (blueQueen?.scale.some((row) => row.values.join(",") === "30%,30%,30%,30%,30%")) {
  fail("The Blue Queen should skip doubled Intelligence +30%");
}
if (!/enhanced by Intelligence/i.test(blueQueen?.body ?? "")) {
  fail("keep Hub The Blue Queen enhanced by Intelligence");
}
if (/2 round\(s\)/i.test(blueQueen?.body ?? "")) {
  fail("do not rewrite Hub The Blue Queen 2 rounds to screenshot round(s)");
}
if (
  findAbilityInsight("Sharpened Beauty", { dragonId: "tessarion" })?.title !==
  "Sharpened Beauty"
) {
  fail("hovering Sharpened Beauty should open Tessarion habit 1");
}
if (
  findAbilityInsight("The Blue Queen", { dragonId: "tessarion" })?.title !==
  "The Blue Queen"
) {
  fail("hovering The Blue Queen should open Tessarion habit 5");
}
const tessCommand = insightForSource("tessarion", { kind: "command" });
if (!tessCommand) fail("Tessarion command missing");
if (tessCommand.title !== "Command") {
  fail(`Tessarion command title is ${tessCommand.title}, expected Command`);
}
if (!/Double this effect \(-20%\)/i.test(tessCommand.body)) {
  fail("keep Hub Tessarion command Double this effect (-20%)");
}
const tessCatalog = catalogFor(tessarion);
if (tessCatalog.namedCount !== 5 || tessCatalog.needsScreenshot) {
  fail("Tessarion habit names from Star Progression should be complete");
}

const tairax = getCatalogDragon("tairax");
if (!tairax) fail("missing Tairax");
const tairaxNames: [number, string, string[], string][] = [
  [1, "Whisper of Ash", ["Strength/Initiative", "Intelligence/Initiative"], "-16%,-19.2%,-22.4%,-27.2%,-32%"],
  [2, "Sunder", ["Damage Received"], "7.5%,9%,10.5%,12.75%,15%"],
  [3, "Gleamstrike", ["Stagger Chance", "Damage Rate"], "37.5%,40%,42.5%,46.25%,50%"],
  [4, "Gift of Fire", ["Resistance Chance"], "17.5%,21%,24.5%,29.75%,35%"],
  [5, "Moonlit Hunt", ["Damage Dealt"], "12%,15.6%,19.2%,24%,30%"],
];
for (const [habit, title, labels, firstValues] of tairaxNames) {
  const row = insightForSource("tairax", { kind: "habit", habit });
  if (!row) fail(`Tairax habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Tairax habit ${habit} title is ${row.title}, expected ${title}`);
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
const whisperOfAsh = insightForSource("tairax", { kind: "habit", habit: 1 });
if (
  whisperOfAsh?.scale.find((row) => row.label === "Intelligence/Initiative")?.values.join(
    ",",
  ) !== "16%,19.2%,22.4%,27.2%,32%"
) {
  fail("Whisper of Ash Intelligence/Initiative mismatch");
}
if (!/Strength and Initiative/i.test(whisperOfAsh?.body ?? "")) {
  fail("keep Hub Whisper of Ash Strength and Initiative");
}
if (!/Intelligence and Initiative/i.test(whisperOfAsh?.body ?? "")) {
  fail("keep Hub Whisper of Ash Intelligence and Initiative");
}
if (!/5 round\(s\)/i.test(whisperOfAsh?.body ?? "")) {
  fail("keep Hub Whisper of Ash 5 round(s)");
}
const sunder = insightForSource("tairax", { kind: "habit", habit: 2 });
if (!/Control effects include Stun, Stagger, Overwhelm, and Confusion/i.test(sunder?.body ?? "")) {
  fail("keep Hub Sunder Control definition");
}
if (glossNames(sunder).includes("Control")) {
  fail("Sunder Hub already defines Control; do not duplicate the glossary");
}
const gleamstrike = insightForSource("tairax", { kind: "habit", habit: 3 });
if (/Burning Ward gains/i.test(gleamstrike?.body ?? "")) {
  fail("do not rewrite Hub Gleamstrike Command increase to Burning Ward gains");
}
if (!/Command increase chance to afflict Stagger to 37\.5%/i.test(gleamstrike?.body ?? "")) {
  fail("keep Hub Gleamstrike 37.5% Command chance");
}
if (/to 38%/.test(gleamstrike?.body ?? "")) {
  fail("do not rewrite Hub Gleamstrike 37.5% to screenshot 38%");
}
if (
  gleamstrike?.scale.find((row) => row.label === "Damage Rate")?.values.join(
    ",",
  ) !== "20%,24%,28%,34%,40%"
) {
  fail("Gleamstrike Damage Rate mismatch");
}
if (glossNames(gleamstrike).includes("Stagger")) {
  fail("Gleamstrike Hub already defines Stagger; do not duplicate the glossary");
}
if (glossNames(gleamstrike).includes("Control")) {
  fail("Gleamstrike Hub already defines Control; do not duplicate the glossary");
}
const giftOfFire = insightForSource("tairax", { kind: "habit", habit: 4 });
if (!/17\.5% chance/i.test(giftOfFire?.body ?? "")) {
  fail("keep Hub Gift of Fire 17.5%");
}
if (/18% chance/i.test(giftOfFire?.body ?? "")) {
  fail("do not rewrite Hub Gift of Fire 17.5% to screenshot 18%");
}
if (!/Resistance \(\+15%\)/i.test(giftOfFire?.body ?? "")) {
  fail("keep Hub Gift of Fire Resistance (+15%)");
}
if (/Resistance \(-15%\)/i.test(giftOfFire?.body ?? "")) {
  fail("do not rewrite Hub Gift of Fire Resistance (+15%) to screenshot (-15%)");
}
if (giftOfFire?.scale.some((row) => row.values.join(",") === "15%,15%,15%,15%,15%")) {
  fail("Gift of Fire should skip constant Resistance +15%");
}
if (glossNames(giftOfFire).includes("Resistance")) {
  fail("Gift of Fire Hub already defines Resistance; do not duplicate the glossary");
}
if (glossNames(giftOfFire).includes("Burn") === false) {
  fail("Gift of Fire should gloss Burn");
}
const moonlitHunt = insightForSource("tairax", { kind: "habit", habit: 5 });
if (moonlitHunt?.scale.some((row) => /evade/i.test(row.label))) {
  fail("Moonlit Hunt must not invent Evade Rate; Hub has no Evade percent");
}
if (moonlitHunt?.scale.some((row) => row.values.join(",") === "5%,6.5%,8%,10%,12.5%")) {
  fail("Moonlit Hunt must not invent Evade Rate 5–12.5%");
}
if (!/Evade causes each instance/i.test(moonlitHunt?.body ?? "")) {
  fail("keep Hub Moonlit Hunt Evade definition");
}
if (glossNames(moonlitHunt).includes("Evade")) {
  fail("Moonlit Hunt Hub already defines Evade; do not duplicate the glossary");
}
if (
  findAbilityInsight("Whisper of Ash", { dragonId: "tairax" })?.title !==
  "Whisper of Ash"
) {
  fail("hovering Whisper of Ash should open Tairax habit 1");
}
if (
  findAbilityInsight("Moonlit Hunt", { dragonId: "tairax" })?.title !==
  "Moonlit Hunt"
) {
  fail("hovering Moonlit Hunt should open Tairax habit 5");
}
if (
  findAbilityInsight("Gleamstrike", { dragonId: "tairax" })?.title !==
  "Gleamstrike"
) {
  fail("hovering Gleamstrike should open Tairax habit 3");
}
const tairaxCommand = insightForSource("tairax", { kind: "command" });
if (!tairaxCommand) fail("Tairax command missing");
if (tairaxCommand.title !== "Burning Ward") {
  fail(`Tairax command title is ${tairaxCommand.title}, expected Burning Ward`);
}
if (/Burning Ward gains/i.test(tairaxCommand.body)) {
  fail("do not rewrite Hub command text to screenshot wording");
}
if (
  findAbilityInsight("Burning Ward", { dragonId: "tairax" })?.kind !== "command"
) {
  fail("hovering Burning Ward should open Tairax's Command");
}
if (!namedChips(tairaxCommand).includes("Burning Ward")) {
  fail("Tairax command chips should include Burning Ward");
}
if (glossNames(tairaxCommand).includes("Stagger") === false) {
  fail("Burning Ward should gloss Stagger");
}
if (glossNames(tairaxCommand).includes("Burn") === false) {
  fail("Burning Ward should gloss Burn");
}
const wardTone = tokenizeAbilityText("Burning Ward").find(
  (part) => part.value === "Burning Ward",
)?.tone;
if (wardTone !== "command") {
  fail(`Burning Ward text tone is ${wardTone}, expected command`);
}
const tairaxCatalog = catalogFor(tairax);
if (tairaxCatalog.namedCount !== 5 || tairaxCatalog.needsScreenshot) {
  fail("Tairax habit names from Star Progression should be complete");
}
if (tairaxCatalog.command.names.includes("Burning Ward") === false) {
  fail("Dev catalog should list Burning Ward on Tairax's Command");
}
const tairaxStagger = findAbilityInsight("Stagger", { dragonId: "tairax" });
if (!tairaxStagger || tairaxStagger.kind !== "buff") {
  fail(`Stagger hover opened ${tairaxStagger?.kind}:${tairaxStagger?.title}`);
}
if (tairaxStagger.polarity !== "debuff") fail("Stagger is a debuff");
if (!/Attack Modifier Commands/i.test(tairaxStagger.body) || !/Basic Attacks/i.test(tairaxStagger.body)) {
  fail(`Stagger glossary missing Star Progression line: ${tairaxStagger.body}`);
}
if (tairaxStagger.dragonName !== "Tairax") {
  fail(`Stagger on Tairax should be Tairax's Command, got ${tairaxStagger.dragonName}`);
}
const tairaxResistance = findAbilityInsight("Resistance", { dragonId: "tairax" });
if (
  tairaxResistance?.dragonName !== "Tairax" ||
  tairaxResistance.unlockStars !== 8
) {
  fail(
    `Resistance on Tairax should be 8★ Gift of Fire, got ${tairaxResistance?.dragonName} ${tairaxResistance?.unlockStars}`,
  );
}

const velar = getCatalogDragon("velar");
if (!velar) fail("missing Velar");
const velarNames: [number, string, string[], string][] = [
  [1, "Strategic Leader", ["Damage Dealt"], "10%,12%,14%,17%,20%"],
  [2, "Quick Reflexes", ["Instinct/Initiative"], "16%,19.2%,22.4%,27.2%,32%"],
  [3, "Gales of Power", ["First-Strike & Slow Chance"], "12%,14.4%,16.8%,20.4%,24%"],
  [4, "Fierce Unity", ["Strength/Instinct"], "5%,6%,7%,8.5%,10%"],
  [5, "Breath of Renewal", ["Cleanse Chance", "Recovery Rate"], "12%,16%,19%,24%,30%"],
];
for (const [habit, title, labels, firstValues] of velarNames) {
  const row = insightForSource("velar", { kind: "habit", habit });
  if (!row) fail(`Velar habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Velar habit ${habit} title is ${row.title}, expected ${title}`);
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
const strategicLeader = insightForSource("velar", { kind: "habit", habit: 1 });
if (!/prioritizes the Vanguard/i.test(strategicLeader?.body ?? "")) {
  fail("keep Hub Strategic Leader Vanguard targeting");
}
if (!/Tactical Damage Dealt/i.test(strategicLeader?.body ?? "")) {
  fail("keep Hub Strategic Leader Tactical Damage Dealt");
}
const quickReflexes = insightForSource("velar", { kind: "habit", habit: 2 });
if (!/Instinct and Initiative/i.test(quickReflexes?.body ?? "")) {
  fail("keep Hub Quick Reflexes Instinct and Initiative");
}
const galesOfPower = insightForSource("velar", { kind: "habit", habit: 3 });
if (/causes the target to act/i.test(galesOfPower?.body ?? "") || /causes the target to attack/i.test(galesOfPower?.body ?? "")) {
  fail("do not copy First-Strike or Slow glossary into Hub Gales of Power text");
}
if (galesOfPower?.scale.length !== 1) {
  fail(
    `Gales of Power should be one shared chance row, got ${galesOfPower?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (glossNames(galesOfPower).includes("First-Strike") === false) {
  fail("Gales of Power should gloss First-Strike");
}
if (glossNames(galesOfPower).includes("Slow") === false) {
  fail("Gales of Power should gloss Slow");
}
const fierceUnity = insightForSource("velar", { kind: "habit", habit: 4 });
if (!/Strength and Instinct by \+5%/i.test(fierceUnity?.body ?? "")) {
  fail("keep Hub Fierce Unity Strength and Instinct +5%");
}
if (!/enhanced by Initiative/i.test(fierceUnity?.body ?? "")) {
  fail("keep Hub Fierce Unity enhanced by Initiative");
}
const breathOfRenewal = insightForSource("velar", { kind: "habit", habit: 5 });
if (/Whirlwind gains/i.test(breathOfRenewal?.body ?? "")) {
  fail("do not rewrite Hub Breath of Renewal Command gains to Whirlwind gains");
}
if (!/Command gains 12% chance to Cleanse/i.test(breathOfRenewal?.body ?? "")) {
  fail("keep Hub Breath of Renewal Command gains 12%");
}
if (
  breathOfRenewal?.scale.find((row) => row.label === "Recovery Rate")?.values.join(
    ",",
  ) !== "18%,23.4%,28.8%,36%,45%"
) {
  fail("Breath of Renewal Recovery Rate mismatch");
}
if (glossNames(breathOfRenewal).includes("Panic") === false) {
  fail("Breath of Renewal should gloss Panic");
}
if (glossNames(breathOfRenewal).includes("Burn") === false) {
  fail("Breath of Renewal should gloss Burn");
}
if (
  findAbilityInsight("Strategic Leader", { dragonId: "velar" })?.title !==
  "Strategic Leader"
) {
  fail("hovering Strategic Leader should open Velar habit 1");
}
if (
  findAbilityInsight("Breath of Renewal", { dragonId: "velar" })?.title !==
  "Breath of Renewal"
) {
  fail("hovering Breath of Renewal should open Velar habit 5");
}
const velarCommand = insightForSource("velar", { kind: "command" });
if (!velarCommand) fail("Velar command missing");
if (velarCommand.title !== "Whirlwind") {
  fail(`Velar command title is ${velarCommand.title}, expected Whirlwind`);
}
if (/Whirlwind gains/i.test(velarCommand.body)) {
  fail("do not rewrite Hub command text to screenshot wording");
}
if (
  findAbilityInsight("Whirlwind", { dragonId: "velar" })?.kind !== "command"
) {
  fail("hovering Whirlwind should open Velar's Command");
}
if (!namedChips(velarCommand).includes("Whirlwind")) {
  fail("Velar command chips should include Whirlwind");
}
if (glossNames(velarCommand).includes("Advantage") === false) {
  fail("Whirlwind should gloss Advantage");
}
const whirlTone = tokenizeAbilityText("Whirlwind").find(
  (part) => part.value === "Whirlwind",
)?.tone;
if (whirlTone !== "command") {
  fail(`Whirlwind text tone is ${whirlTone}, expected command`);
}
const velarCatalog = catalogFor(velar);
if (velarCatalog.namedCount !== 5 || velarCatalog.needsScreenshot) {
  fail("Velar habit names from Star Progression should be complete");
}
if (velarCatalog.command.names.includes("Whirlwind") === false) {
  fail("Dev catalog should list Whirlwind on Velar's Command");
}
const velarFirstStrike = findAbilityInsight("First-Strike", { dragonId: "velar" });
if (
  velarFirstStrike?.dragonName !== "Velar" ||
  velarFirstStrike.unlockStars !== 6
) {
  fail(
    `First-Strike on Velar should be 6★ Gales of Power, got ${velarFirstStrike?.dragonName} ${velarFirstStrike?.unlockStars}`,
  );
}
if (/attack before all other combatants/i.test(velarFirstStrike?.body ?? "")) {
  fail("do not rewrite First-Strike glossary act to screenshot attack");
}
const velarSlow = findAbilityInsight("Slow", { dragonId: "velar" });
if (velarSlow?.dragonName !== "Velar" || velarSlow.unlockStars !== 6) {
  fail(
    `Slow on Velar should be 6★ Gales of Power, got ${velarSlow?.dragonName} ${velarSlow?.unlockStars}`,
  );
}

const feskar = getCatalogDragon("feskar");
if (!feskar) fail("missing Feskar");
const feskarNames: [number, string, string[], string][] = [
  [1, "Resilient Bond", ["Damage Received (per Stack)"], "-6.5%,-7.8%,-9.1%,-11.05%,-13%"],
  [2, "Insightful Allies", ["Instinct"], "10%,12%,14%,17%,20%"],
  [3, "Emerald Inferno", ["Damage Rate"], "40%,48%,56%,68%,80%"],
  [4, "Quick-Witted", ["Intelligence/Initiative"], "16%,19.2%,22.4%,27.2%,32%"],
  [5, "Unyielding Grasp", ["Stagger Chance"], "10%,13%,16%,20%,25%"],
];
for (const [habit, title, labels, firstValues] of feskarNames) {
  const row = insightForSource("feskar", { kind: "habit", habit });
  if (!row) fail(`Feskar habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Feskar habit ${habit} title is ${row.title}, expected ${title}`);
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
const resilientBond = insightForSource("feskar", { kind: "habit", habit: 1 });
if (!/Physical Damage Received \(Command & Habits\)/i.test(resilientBond?.body ?? "")) {
  fail("keep Hub Resilient Bond Physical Damage Received (Command & Habits)");
}
if (/excluding Basic Attacks/i.test(resilientBond?.body ?? "")) {
  fail("do not rewrite Hub Resilient Bond Command & Habits to screenshot excluding Basic Attacks");
}
if (!/Each Round: If the target Ally retreated/i.test(resilientBond?.body ?? "")) {
  fail("keep Hub Resilient Bond Each Round retreat trigger");
}
if (/At the start of each round/i.test(resilientBond?.body ?? "")) {
  fail("do not rewrite Hub Resilient Bond Each Round to screenshot At the start of each round");
}
if (!/-6\.5%/.test(resilientBond?.body ?? "")) {
  fail("keep Hub Resilient Bond -6.5%");
}
if (/-6% until the end of combat/.test(resilientBond?.body ?? "")) {
  fail("do not rewrite Hub Resilient Bond -6.5% to screenshot -6%");
}
if (glossNames(resilientBond).includes("Resilient Bond")) {
  fail("Resilient Bond Hub already defines the stack; do not duplicate the glossary");
}
const insightfulAllies = insightForSource("feskar", { kind: "habit", habit: 2 });
if (!/Increase Instinct by \+10% \(enhanced by Instinct\)/i.test(insightfulAllies?.body ?? "")) {
  fail("keep Hub Insightful Allies Instinct +10% enhanced by Instinct");
}
const emeraldInferno = insightForSource("feskar", { kind: "habit", habit: 3 });
if (/Calculated Assault gains/i.test(emeraldInferno?.body ?? "")) {
  fail("do not rewrite Hub Emerald Inferno Command deal to Calculated Assault gains");
}
if (!/Command deal Fire Damage/i.test(emeraldInferno?.body ?? "")) {
  fail("keep Hub Emerald Inferno Command deal Fire Damage");
}
if (!/Physical Damage \(Command & Habits\)/i.test(emeraldInferno?.body ?? "")) {
  fail("keep Hub Emerald Inferno Physical Damage (Command & Habits)");
}
if (/excluding Basic Attacks/i.test(emeraldInferno?.body ?? "")) {
  fail("do not rewrite Hub Emerald Inferno Command & Habits to screenshot excluding Basic Attacks");
}
if (!/increased by 1\.5x against targets afflicted with Burn/i.test(emeraldInferno?.body ?? "")) {
  fail("keep Hub Emerald Inferno 1.5x Burn Damage Rate");
}
if (emeraldInferno?.scale.some((row) => row.values.join(",") === "60%,72%,84%,102%,120%")) {
  fail("Emerald Inferno should skip 1.5x derived Damage Rate");
}
if (emeraldInferno?.scale.length !== 1) {
  fail(
    `Emerald Inferno should be one Damage Rate row, got ${emeraldInferno?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (glossNames(emeraldInferno).includes("Burn") === false) {
  fail("Emerald Inferno should gloss Burn");
}
const quickWitted = insightForSource("feskar", { kind: "habit", habit: 4 });
if (!/Intelligence and Initiative/i.test(quickWitted?.body ?? "")) {
  fail("keep Hub Quick-Witted Intelligence and Initiative");
}
const unyieldingGrasp = insightForSource("feskar", { kind: "habit", habit: 5 });
if (!/prioritizes warriors/i.test(unyieldingGrasp?.body ?? "")) {
  fail("keep Hub Unyielding Grasp prioritizes warriors");
}
if (/3 round\(s\)/i.test(unyieldingGrasp?.body ?? "")) {
  fail("do not rewrite Hub Unyielding Grasp 3 rounds to screenshot round(s)");
}
if (/prevents the target from using/i.test(unyieldingGrasp?.body ?? "")) {
  fail("do not copy Stagger glossary into Hub Unyielding Grasp text");
}
if (glossNames(unyieldingGrasp).includes("Stagger") === false) {
  fail("Unyielding Grasp should gloss Stagger");
}
if (
  findAbilityInsight("Resilient Bond", { dragonId: "feskar" })?.title !==
  "Resilient Bond"
) {
  fail("hovering Resilient Bond should open Feskar habit 1");
}
if (
  findAbilityInsight("Unyielding Grasp", { dragonId: "feskar" })?.title !==
  "Unyielding Grasp"
) {
  fail("hovering Unyielding Grasp should open Feskar habit 5");
}
const feskarCommand = insightForSource("feskar", { kind: "command" });
if (!feskarCommand) fail("Feskar command missing");
if (feskarCommand.title !== "Calculated Assault") {
  fail(`Feskar command title is ${feskarCommand.title}, expected Calculated Assault`);
}
if (/Calculated Assault gains/i.test(feskarCommand.body)) {
  fail("do not rewrite Hub command text to screenshot wording");
}
if (
  findAbilityInsight("Calculated Assault", { dragonId: "feskar" })?.kind !== "command"
) {
  fail("hovering Calculated Assault should open Feskar's Command");
}
if (!namedChips(feskarCommand).includes("Calculated Assault")) {
  fail("Feskar command chips should include Calculated Assault");
}
const assaultTone = tokenizeAbilityText("Calculated Assault").find(
  (part) => part.value === "Calculated Assault",
)?.tone;
if (assaultTone !== "command") {
  fail(`Calculated Assault text tone is ${assaultTone}, expected command`);
}
if (statusMarkPolarity("Resilient Bond") !== "buff") {
  fail("Resilient Bond in habit text should get a buff arrow");
}
if (statusMarkPolarity("Calculated Assault") != null) {
  fail("Calculated Assault is the Command name, not a buff/debuff mark");
}
const bondTone = tokenizeAbilityText("1 stack of Resilient Bond").find(
  (part) => part.value === "Resilient Bond",
)?.tone;
if (bondTone !== "buff") {
  fail(`Resilient Bond text tone is ${bondTone}, expected buff`);
}
const feskarCatalog = catalogFor(feskar);
if (feskarCatalog.namedCount !== 5 || feskarCatalog.needsScreenshot) {
  fail("Feskar habit names from Star Progression should be complete");
}
if (feskarCatalog.command.names.includes("Calculated Assault") === false) {
  fail("Dev catalog should list Calculated Assault on Feskar's Command");
}
const feskarStagger = findAbilityInsight("Stagger", { dragonId: "feskar" });
if (!feskarStagger || feskarStagger.kind !== "buff") {
  fail(`Stagger hover opened ${feskarStagger?.kind}:${feskarStagger?.title}`);
}
if (feskarStagger.polarity !== "debuff") fail("Stagger is a debuff");
if (!/Attack Modifier Commands/i.test(feskarStagger.body) || !/Basic Attacks/i.test(feskarStagger.body)) {
  fail(`Stagger glossary missing Star Progression line: ${feskarStagger.body}`);
}
if (
  feskarStagger.dragonName !== "Feskar" ||
  feskarStagger.unlockStars !== 10
) {
  fail(
    `Stagger on Feskar should be 10★ Unyielding Grasp, got ${feskarStagger.dragonName} ${feskarStagger.unlockStars}`,
  );
}

const zivern = getCatalogDragon("zivern");
if (!zivern) fail("missing Zivern");
const zivernNames: [number, string, string[], string][] = [
  [1, "Battle Mastery", ["Strength/Instinct"], "-5%,-6%,-7%,-8.85%,-10.5%"],
  [2, "Keen Instinct", ["Intelligence/Instinct"], "16%,19.2%,22.4%,27.2%,32%"],
  [3, "Fearsome Reach", ["Panic Chance"], "30%,36%,42%,51%,60%"],
  [4, "Steel Shroud", ["Damage Received"], "-3.5%,-4.2%,-4.9%,-5.95%,-7%"],
  [5, "Cloak of Terror", ["Overwhelm Chance"], "10%,13%,16%,20%,25%"],
];
for (const [habit, title, labels, firstValues] of zivernNames) {
  const row = insightForSource("zivern", { kind: "habit", habit });
  if (!row) fail(`Zivern habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Zivern habit ${habit} title is ${row.title}, expected ${title}`);
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
const battleMastery = insightForSource("zivern", { kind: "habit", habit: 1 });
if (!/Strength and Instinct \(enhanced by Intelligence\) of 3 Enemies/i.test(battleMastery?.body ?? "")) {
  fail("keep Hub Battle Mastery Strength and Instinct enhanced by Intelligence");
}
if (battleMastery?.scale.some((row) => row.label === "Intelligence")) {
  fail("Battle Mastery must not label the scale as Intelligence");
}
const keenInstinct = insightForSource("zivern", { kind: "habit", habit: 2 });
if (!/Intelligence and Instinct/i.test(keenInstinct?.body ?? "")) {
  fail("keep Hub Keen Instinct Intelligence and Instinct");
}
const fearsomeReach = insightForSource("zivern", { kind: "habit", habit: 3 });
if (!/Odd-numbered Rounds: 30% chance/i.test(fearsomeReach?.body ?? "")) {
  fail("keep Hub Fearsome Reach 30% chance");
}
if (/2 round\(s\)/i.test(fearsomeReach?.body ?? "")) {
  fail("do not rewrite Hub Fearsome Reach 2 rounds to screenshot round(s)");
}
if (/deals Tactical Damage to the target each round/i.test(fearsomeReach?.body ?? "")) {
  fail("do not copy Panic glossary into Hub Fearsome Reach text");
}
if (fearsomeReach?.scale.some((row) => row.values.join(",") === "-15%,-15%,-15%,-15%,-15%")) {
  fail("Fearsome Reach should skip constant Instinct -15%");
}
if (fearsomeReach?.scale.some((row) => row.values.join(",") === "20%,20%,20%,20%,20%")) {
  fail("Fearsome Reach should skip constant Panic Damage Rate +20%");
}
if (fearsomeReach?.scale.length !== 1) {
  fail(
    `Fearsome Reach should be one chance row, got ${fearsomeReach?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (glossNames(fearsomeReach).includes("Panic") === false) {
  fail("Fearsome Reach should gloss Panic");
}
const steelShroud = insightForSource("zivern", { kind: "habit", habit: 4 });
if (!/Physical Damage Received \(Command & Habits\)/i.test(steelShroud?.body ?? "")) {
  fail("keep Hub Steel Shroud Physical Damage Received (Command & Habits)");
}
if (/excluding Basic Attacks/i.test(steelShroud?.body ?? "")) {
  fail("do not rewrite Hub Steel Shroud Command & Habits to screenshot excluding Basic Attacks");
}
if (!/-3\.5%/.test(steelShroud?.body ?? "")) {
  fail("keep Hub Steel Shroud -3.5%");
}
if (/by -3% of 2 other Allies/i.test(steelShroud?.body ?? "")) {
  fail("do not rewrite Hub Steel Shroud -3.5% to screenshot -3%");
}
if (steelShroud?.scale.length !== 1) {
  fail(
    `Steel Shroud should be one Damage Received row, got ${steelShroud?.scale.map((row) => row.label).join(", ")}`,
  );
}
const cloakOfTerror = insightForSource("zivern", { kind: "habit", habit: 5 });
if (!/This chance is doubled \(20%\)/i.test(cloakOfTerror?.body ?? "")) {
  fail("keep Hub Cloak of Terror doubled (20%) Vulnerable chance");
}
if (/2 round\(s\)/i.test(cloakOfTerror?.body ?? "")) {
  fail("do not rewrite Hub Cloak of Terror 2 rounds to screenshot round(s)");
}
if (/prevents the target from using Active Commands/i.test(cloakOfTerror?.body ?? "")) {
  fail("do not copy Overwhelm glossary into Hub Cloak of Terror text");
}
if (cloakOfTerror?.scale.some((row) => row.values.join(",") === "20%,26%,32%,40%,50%")) {
  fail("Cloak of Terror should skip doubled Vulnerable Overwhelm chance");
}
if (cloakOfTerror?.scale.length !== 1) {
  fail(
    `Cloak of Terror should be one Overwhelm Chance row, got ${cloakOfTerror?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (glossNames(cloakOfTerror).includes("Overwhelm") === false) {
  fail("Cloak of Terror should gloss Overwhelm");
}
if (glossNames(cloakOfTerror).includes("Vulnerable") === false) {
  fail("Cloak of Terror should gloss Vulnerable");
}
if (
  findAbilityInsight("Battle Mastery", { dragonId: "zivern" })?.title !==
  "Battle Mastery"
) {
  fail("hovering Battle Mastery should open Zivern habit 1");
}
if (
  findAbilityInsight("Cloak of Terror", { dragonId: "zivern" })?.title !==
  "Cloak of Terror"
) {
  fail("hovering Cloak of Terror should open Zivern habit 5");
}
const zivernCommand = insightForSource("zivern", { kind: "command" });
if (!zivernCommand) fail("Zivern command missing");
if (zivernCommand.title !== "Command") {
  fail(`Zivern command title is ${zivernCommand.title}, expected Command`);
}
const zivernCatalog = catalogFor(zivern);
if (zivernCatalog.namedCount !== 5 || zivernCatalog.needsScreenshot) {
  fail("Zivern habit names from Star Progression should be complete");
}
const zivernOverwhelm = findAbilityInsight("Overwhelm", { dragonId: "zivern" });
if (!zivernOverwhelm || zivernOverwhelm.kind !== "buff") {
  fail(`Overwhelm hover opened ${zivernOverwhelm?.kind}:${zivernOverwhelm?.title}`);
}
if (zivernOverwhelm.polarity !== "debuff") fail("Overwhelm is a debuff");
if (!/Active Commands/i.test(zivernOverwhelm.body) || !/Habits/i.test(zivernOverwhelm.body)) {
  fail(`Overwhelm glossary missing Star Progression line: ${zivernOverwhelm.body}`);
}
if (
  zivernOverwhelm.dragonName !== "Zivern" ||
  zivernOverwhelm.unlockStars !== 10
) {
  fail(
    `Overwhelm on Zivern should be 10★ Cloak of Terror, got ${zivernOverwhelm.dragonName} ${zivernOverwhelm.unlockStars}`,
  );
}
const zivernPanic = findAbilityInsight("Panic", { dragonId: "zivern" });
if (
  zivernPanic?.dragonName !== "Zivern" ||
  zivernPanic.unlockStars !== 6
) {
  fail(
    `Panic on Zivern should be 6★ Fearsome Reach, got ${zivernPanic?.dragonName} ${zivernPanic?.unlockStars}`,
  );
}

const vaeldra = getCatalogDragon("vaeldra");
if (!vaeldra) fail("missing Vaeldra");
const vaeldraNames: [number, string, string[], string][] = [
  [1, "Dragon's Valor", ["Damage Received", "Strength"], "-5%,-6%,-7%,-8.5%,-10%"],
  [2, "Ensnare", ["Instinct/Initiative"], "-18%,-21.6%,-25.2%,-30.6%,-36%"],
  [3, "Tempting Distraction", ["Damage Received"], "6%,7.2%,8.4%,10.2%,12%"],
  [4, "Infernal Force", ["Damage Dealt"], "12%,14.4%,16.8%,20.4%,24%"],
  [5, "Siren's Call", ["Damage Received", "Taunt & Stagger Chance"], "-10%,-13%,-16%,-20%,-25%"],
];
for (const [habit, title, labels, firstValues] of vaeldraNames) {
  const row = insightForSource("vaeldra", { kind: "habit", habit });
  if (!row) fail(`Vaeldra habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Vaeldra habit ${habit} title is ${row.title}, expected ${title}`);
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
const vaeldraValor = insightForSource("vaeldra", { kind: "habit", habit: 1 });
if (!/Reduce your Damage Received by -5% and increase your Strength by \+8\.5%/i.test(vaeldraValor?.body ?? "")) {
  fail("keep Hub Dragon's Valor Damage Received and Strength");
}
if (
  vaeldraValor?.scale.find((row) => row.label === "Strength")?.values.join(",") !==
  "8.5%,10.2%,11.9%,14.45%,17%"
) {
  fail("Vaeldra Dragon's Valor Strength mismatch");
}
const vaeldraEnsnare = insightForSource("vaeldra", { kind: "habit", habit: 2 });
if (!/Instinct and Initiative/i.test(vaeldraEnsnare?.body ?? "")) {
  fail("keep Hub Vaeldra Ensnare Instinct and Initiative");
}
if (!/3 round\(s\)/i.test(vaeldraEnsnare?.body ?? "")) {
  fail("keep Hub Vaeldra Ensnare 3 round(s)");
}
const temptingDistraction = insightForSource("vaeldra", { kind: "habit", habit: 3 });
if (!/Physical Damage Received \(Command & Habits\)/i.test(temptingDistraction?.body ?? "")) {
  fail("keep Hub Tempting Distraction Physical Damage Received (Command & Habits)");
}
if (/excluding Basic Attacks/i.test(temptingDistraction?.body ?? "")) {
  fail("do not rewrite Hub Tempting Distraction Command & Habits to screenshot excluding Basic Attacks");
}
if (/2 round\(s\)/i.test(temptingDistraction?.body ?? "")) {
  fail("do not rewrite Hub Tempting Distraction 2 rounds to screenshot round(s)");
}
if (glossNames(temptingDistraction).includes("Taunt") === false) {
  fail("Tempting Distraction should gloss Taunt");
}
const infernalForce = insightForSource("vaeldra", { kind: "habit", habit: 4 });
if (!/Physical Damage Dealt \(Command & Habits\)/i.test(infernalForce?.body ?? "")) {
  fail("keep Hub Infernal Force Physical Damage Dealt (Command & Habits)");
}
if (/excluding Basic Attacks/i.test(infernalForce?.body ?? "")) {
  fail("do not rewrite Hub Infernal Force Command & Habits to screenshot excluding Basic Attacks");
}
if (!/Each effects lasts/i.test(infernalForce?.body ?? "")) {
  fail("keep Hub Infernal Force Each effects lasts");
}
if (/Each effect lasts/i.test(infernalForce?.body ?? "") && !/Each effects lasts/i.test(infernalForce?.body ?? "")) {
  fail("do not rewrite Hub Infernal Force Each effects lasts");
}
const sirensCall = insightForSource("vaeldra", { kind: "habit", habit: 5 });
if (!/will be afflict with Stagger instead/i.test(sirensCall?.body ?? "")) {
  fail("keep Hub Siren's Call afflict spelling");
}
if (/will be afflicted with Stagger instead/i.test(sirensCall?.body ?? "")) {
  fail("do not rewrite Hub Siren's Call afflict to screenshot afflicted");
}
if (/3 round\(s\)/i.test(sirensCall?.body ?? "")) {
  fail("do not rewrite Hub Siren's Call 3 rounds to screenshot round(s)");
}
if (/forces the target to launch their Basic Attacks/i.test(sirensCall?.body ?? "")) {
  fail("do not copy Taunt glossary into Hub Siren's Call text");
}
if (/prevents the target from using Attack Modifier Commands/i.test(sirensCall?.body ?? "")) {
  fail("do not copy Stagger glossary into Hub Siren's Call text");
}
if (
  sirensCall?.scale.find((row) => row.label === "Taunt & Stagger Chance")?.values.join(
    ",",
  ) !== "40%,52%,64%,80%,100%"
) {
  fail("Siren's Call Taunt & Stagger Chance mismatch");
}
if (glossNames(sirensCall).includes("Taunt") === false) {
  fail("Siren's Call should gloss Taunt");
}
if (glossNames(sirensCall).includes("Stagger") === false) {
  fail("Siren's Call should gloss Stagger");
}
if (
  findAbilityInsight("Dragon's Valor", { dragonId: "vaeldra" })?.habit !== 1
) {
  fail("hovering Dragon's Valor on Vaeldra should open habit 1");
}
if (
  findAbilityInsight("Dragon's Valor", { dragonId: "vermax" })?.habit !== 4
) {
  fail("hovering Dragon's Valor on Vermax should still open habit 4");
}
if (
  findAbilityInsight("Ensnare", { dragonId: "vaeldra" })?.habit !== 2
) {
  fail("hovering Ensnare on Vaeldra should open habit 2");
}
if (
  findAbilityInsight("Ensnare", { dragonId: "shadowsong" })?.habit !== 1
) {
  fail("hovering Ensnare on Shadowsong should still open habit 1");
}
if (
  findAbilityInsight("Siren's Call", { dragonId: "vaeldra" })?.title !==
  "Siren's Call"
) {
  fail("hovering Siren's Call should open Vaeldra habit 5");
}
const vaeldraCommand = insightForSource("vaeldra", { kind: "command" });
if (!vaeldraCommand) fail("Vaeldra command missing");
if (vaeldraCommand.title !== "Command") {
  fail(`Vaeldra command title is ${vaeldraCommand.title}, expected Command`);
}
if (glossNames(vaeldraCommand).includes("Taunt") === false) {
  fail("Vaeldra Command should gloss Taunt");
}
const vaeldraCatalog = catalogFor(vaeldra);
if (vaeldraCatalog.namedCount !== 5 || vaeldraCatalog.needsScreenshot) {
  fail("Vaeldra habit names from Star Progression should be complete");
}
const vaeldraTaunt = findAbilityInsight("Taunt", { dragonId: "vaeldra" });
if (!vaeldraTaunt || vaeldraTaunt.kind !== "buff") {
  fail(`Taunt hover opened ${vaeldraTaunt?.kind}:${vaeldraTaunt?.title}`);
}
if (vaeldraTaunt.polarity !== "buff") fail("Taunt is a buff");
if (!/Basic Attacks/i.test(vaeldraTaunt.body) || !/against this dragon/i.test(vaeldraTaunt.body)) {
  fail(`Taunt glossary missing Star Progression line: ${vaeldraTaunt.body}`);
}
if (vaeldraTaunt.dragonName !== "Vaeldra" || vaeldraTaunt.unlockStars != null) {
  fail(
    `Taunt on Vaeldra should be Command, got ${vaeldraTaunt.dragonName} ${vaeldraTaunt.unlockStars}`,
  );
}
const vaeldraStagger = findAbilityInsight("Stagger", { dragonId: "vaeldra" });
if (
  vaeldraStagger?.dragonName !== "Vaeldra" ||
  vaeldraStagger.unlockStars !== 10
) {
  fail(
    `Stagger on Vaeldra should be 10★ Siren's Call, got ${vaeldraStagger?.dragonName} ${vaeldraStagger?.unlockStars}`,
  );
}

const tashix = getCatalogDragon("tashix");
if (!tashix) fail("missing Tashix");
const tashixNames: [number, string, string[], string][] = [
  [1, "Enervate", ["Damage Dealt"], "-10.5%,-12.6%,-14.7%,-17.85%,-21%"],
  [2, "Dragon's Cunning", ["Intelligence", "Instinct"], "12%,14.4%,16.8%,20.4%,24%"],
  [3, "Cunning Ruse", ["Weakened Chance"], "10%,12%,14%,17%,20%"],
  [4, "Battle Guile", ["Instinct/Initiative"], "-5%,-6%,-7%,-8.85%,-10.5%"],
  [5, "Veiled Ambush", ["Damage Rate"], "150%,220%,290%,380%,500%"],
];
for (const [habit, title, labels, firstValues] of tashixNames) {
  const row = insightForSource("tashix", { kind: "habit", habit });
  if (!row) fail(`Tashix habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Tashix habit ${habit} title is ${row.title}, expected ${title}`);
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
const tashixEnervate = insightForSource("tashix", { kind: "habit", habit: 1 });
if (!/-10\.5%/.test(tashixEnervate?.body ?? "")) {
  fail("keep Hub Tashix Enervate -10.5%");
}
if (/Reduce Tactical Damage Dealt by -12% of 1 Enemy/.test(tashixEnervate?.body ?? "")) {
  fail("do not rewrite Hub Tashix Enervate -10.5% to screenshot rank-2 flavor -12%");
}
const tashixCunning = insightForSource("tashix", { kind: "habit", habit: 2 });
if (!/Increase your Intelligence by \+12% and reduce Instinct by -10%/i.test(tashixCunning?.body ?? "")) {
  fail("keep Hub Tashix Dragon's Cunning Intelligence and Instinct");
}
if (/enhanced by Initiative/i.test(tashixCunning?.body ?? "")) {
  fail("do not rewrite Hub Tashix Dragon's Cunning to add screenshot enhanced by Initiative");
}
if (
  tashixCunning?.scale.find((row) => row.label === "Instinct")?.values.join(",") !==
  "-10%,-12%,-14%,-17%,-20%"
) {
  fail("Tashix Dragon's Cunning Instinct mismatch");
}
if (
  findAbilityInsight("Dragon's Cunning", { dragonId: "tashix" })?.habit !== 2
) {
  fail("hovering Dragon's Cunning on Tashix should open habit 2");
}
if (
  findAbilityInsight("Dragon's Cunning", { dragonId: "sheepstealer" })?.habit !== 2
) {
  fail("hovering Dragon's Cunning on Sheepstealer should still open habit 2");
}
const cunningRuse = insightForSource("tashix", { kind: "habit", habit: 3 });
if (!/This effect is checked separately/i.test(cunningRuse?.body ?? "")) {
  fail("keep Hub Cunning Ruse This effect is checked separately");
}
if (/This chance is checked separately/i.test(cunningRuse?.body ?? "")) {
  fail("do not rewrite Hub Cunning Ruse effect to screenshot chance");
}
if (!/afflict with Weakened \(-15%\) 3 Enemies/i.test(cunningRuse?.body ?? "")) {
  fail("keep Hub Cunning Ruse afflict with Weakened wording");
}
if (/2 round\(s\)/i.test(cunningRuse?.body ?? "")) {
  fail("do not rewrite Hub Cunning Ruse 2 rounds to screenshot round(s)");
}
if (/reduces the target's Damage Dealt/i.test(cunningRuse?.body ?? "")) {
  fail("do not copy Weakened glossary into Hub Cunning Ruse text");
}
if (cunningRuse?.scale.some((row) => row.values.join(",") === "20%,24%,28%,34%,40%")) {
  fail("Cunning Ruse should skip doubled Tactical Damage Weakened chance");
}
if (cunningRuse?.scale.some((row) => row.values.join(",") === "25%,25%,25%,25%,25%")) {
  fail("Cunning Ruse should skip constant Mirage 25% chance");
}
if (cunningRuse?.scale.some((row) => row.values.join(",") === "2.5%,2.5%,2.5%,2.5%,2.5%")) {
  fail("Cunning Ruse should skip constant Mirage +2.5%");
}
if (cunningRuse?.scale.length !== 1) {
  fail(
    `Cunning Ruse should be one Weakened Chance row, got ${cunningRuse?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (glossNames(cunningRuse).includes("Weakened") === false) {
  fail("Cunning Ruse should gloss Weakened");
}
if (glossNames(cunningRuse).includes("Mirage")) {
  fail("Cunning Ruse Hub already defines Mirage; do not duplicate the glossary");
}
const battleGuile = insightForSource("tashix", { kind: "habit", habit: 4 });
if (!/Instinct and Initiative by -5% \(enhanced by Initiative\)/i.test(battleGuile?.body ?? "")) {
  fail("keep Hub Battle Guile Instinct and Initiative enhanced by Initiative");
}
const veiledAmbush = insightForSource("tashix", { kind: "habit", habit: 5 });
if (!/If you have 7 or more Stacks of Mirage/i.test(veiledAmbush?.body ?? "")) {
  fail("keep Hub Veiled Ambush If you have 7 or more Stacks");
}
if (/If you 7 or more/i.test(veiledAmbush?.body ?? "")) {
  fail("do not rewrite Hub Veiled Ambush If you have to screenshot If you");
}
if (veiledAmbush?.scale.some((row) => row.values.join(",") === "25%,25%,25%,25%,25%")) {
  fail("Veiled Ambush should skip constant Mirage 25% chance");
}
if (veiledAmbush?.scale.length !== 1) {
  fail(
    `Veiled Ambush should be one Damage Rate row, got ${veiledAmbush?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (
  findAbilityInsight("Enervate", { dragonId: "tashix" })?.habit !== 1
) {
  fail("hovering Enervate on Tashix should open habit 1");
}
if (
  findAbilityInsight("Enervate", { dragonId: "crimson" })?.habit !== 1
) {
  fail("hovering Enervate on Crimson should still open habit 1");
}
if (
  findAbilityInsight("Veiled Ambush", { dragonId: "tashix" })?.title !==
  "Veiled Ambush"
) {
  fail("hovering Veiled Ambush should open Tashix habit 5");
}
const tashixCommand = insightForSource("tashix", { kind: "command" });
if (!tashixCommand) fail("Tashix command missing");
if (tashixCommand.title !== "Command") {
  fail(`Tashix command title is ${tashixCommand.title}, expected Command`);
}
if (!/Each Stack of Mirage increase your Fire Damage Dealt/i.test(tashixCommand.body)) {
  fail("keep Hub Tashix command Mirage increase spelling");
}
if (glossNames(tashixCommand).includes("Mirage")) {
  fail("Tashix command already defines Mirage; do not duplicate the glossary");
}
const tashixCatalog = catalogFor(tashix);
if (tashixCatalog.namedCount !== 5 || tashixCatalog.needsScreenshot) {
  fail("Tashix habit names from Star Progression should be complete");
}
const tashixMirage = findAbilityInsight("Mirage", { dragonId: "tashix" });
if (!tashixMirage || tashixMirage.kind !== "buff") {
  fail(`Mirage hover opened ${tashixMirage?.kind}:${tashixMirage?.title}`);
}
if (tashixMirage.polarity !== "buff") fail("Mirage is a buff");
if (!/Fire Damage Dealt/i.test(tashixMirage.body) || !/2\.5%/i.test(tashixMirage.body)) {
  fail(`Mirage missing stack definition: ${tashixMirage.body}`);
}
if (tashixMirage.unlockStars != null) {
  fail(`Mirage on Tashix should be Command, got ${tashixMirage.unlockStars}`);
}
if (statusMarkPolarity("Mirage") !== "buff") {
  fail("Mirage in habit text should get a buff arrow");
}
const mirageTone = tokenizeAbilityText("1 Stack of Mirage").find(
  (part) => part.value === "Mirage",
)?.tone;
if (mirageTone !== "buff") {
  fail(`Mirage text tone is ${mirageTone}, expected buff`);
}
const tashixWeakened = findAbilityInsight("Weakened", { dragonId: "tashix" });
if (
  tashixWeakened?.dragonName !== "Tashix" ||
  tashixWeakened.unlockStars !== 6
) {
  fail(
    `Weakened on Tashix should be 6★ Cunning Ruse, got ${tashixWeakened?.dragonName} ${tashixWeakened?.unlockStars}`,
  );
}

const antares = getCatalogDragon("antares");
if (!antares) fail("missing Antares");
const antaresNames: [number, string, string[], string][] = [
  [1, "Blazing Onslaught", ["Damage Received"], "11%,13.2%,15.4%,18.7%,22%"],
  [2, "Dragon's Flair", ["Damage Dealt"], "8%,9.6%,11.2%,13.6%,16%"],
  [3, "Fiery Precision", ["Damage Rate"], "20%,24%,28%,34%,40%"],
  [4, "Dragon's Intellect", ["Damage Received", "Intelligence"], "-4%,-4.8%,-5.6%,-6.8%,-8%"],
  [5, "Redemption", ["Intelligence/Initiative", "Immunity Chance"], "6%,7.8%,9.6%,12%,15%"],
];
for (const [habit, title, labels, firstValues] of antaresNames) {
  const row = insightForSource("antares", { kind: "habit", habit });
  if (!row) fail(`Antares habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Antares habit ${habit} title is ${row.title}, expected ${title}`);
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
const antaresOnslaught = insightForSource("antares", { kind: "habit", habit: 1 });
if (!/Physical Damage Received \(Command & Habits\)/i.test(antaresOnslaught?.body ?? "")) {
  fail("keep Hub Antares Blazing Onslaught Physical Damage Received (Command & Habits)");
}
if (/excluding Basic Attacks/i.test(antaresOnslaught?.body ?? "")) {
  fail("do not rewrite Hub Antares Blazing Onslaught Command & Habits to screenshot excluding Basic Attacks");
}
if (/3 round\(s\)/i.test(antaresOnslaught?.body ?? "")) {
  fail("do not rewrite Hub Antares Blazing Onslaught 3 rounds to screenshot round(s)");
}
if (antaresOnslaught?.scale.length !== 1) {
  fail(
    `Antares Blazing Onslaught should be one Damage Received row, got ${antaresOnslaught?.scale.map((row) => row.label).join(", ")}`,
  );
}
const antaresFlair = insightForSource("antares", { kind: "habit", habit: 2 });
if (!/Fire Damage Dealt by \+8%/i.test(antaresFlair?.body ?? "")) {
  fail("keep Hub Antares Dragon's Flair +8%");
}
if (/Fire Damage Dealt by \+9\.6%/i.test(antaresFlair?.body ?? "")) {
  fail("do not rewrite Hub Antares Dragon's Flair +8% to screenshot rank-2 flavor +9.6%");
}
const fieryPrecision = insightForSource("antares", { kind: "habit", habit: 3 });
if (!/Each Round: Command deal Fire Damage/i.test(fieryPrecision?.body ?? "")) {
  fail("keep Hub Fiery Precision Command deal Fire Damage");
}
if (/Relentless Pursuit gains/i.test(fieryPrecision?.body ?? "")) {
  fail("do not rewrite Hub Fiery Precision Command deal to Relentless Pursuit gains");
}
if (/causes the target to attack after all other combatants/i.test(fieryPrecision?.body ?? "")) {
  fail("do not copy Slow glossary into Hub Fiery Precision text");
}
if (glossNames(fieryPrecision).includes("Slow") === false) {
  fail("Fiery Precision should gloss Slow");
}
const antaresIntellect = insightForSource("antares", { kind: "habit", habit: 4 });
if (
  antaresIntellect?.scale.find((row) => row.label === "Intelligence")?.values.join(
    ",",
  ) !== "5%,6%,7%,8.5%,10%"
) {
  fail("Antares Dragon's Intellect Intelligence mismatch");
}
const redemption = insightForSource("antares", { kind: "habit", habit: 5 });
if (!/Each Round: 10% chance to grant yourself Immunity/i.test(redemption?.body ?? "")) {
  fail("keep Hub Redemption Each Round Immunity chance");
}
if (/Start of Each Round/i.test(redemption?.body ?? "")) {
  fail("do not rewrite Hub Redemption Each Round to screenshot Start of Each Round");
}
if (/2 round\(s\)/i.test(redemption?.body ?? "")) {
  fail("do not rewrite Hub Redemption 2 rounds to screenshot round(s)");
}
if (
  redemption?.scale.find((row) => row.label === "Immunity Chance")?.values.join(",") !==
  "10%,13%,16%,20%,25%"
) {
  fail("Redemption Immunity Chance mismatch");
}
if (redemption?.scale.some((row) => row.label === "Vulnerable & Weakened Chance")) {
  fail("Redemption chance should be Immunity Chance, not Vulnerable & Weakened Chance");
}
if (glossNames(redemption).includes("Vulnerable") === false) {
  fail("Redemption should gloss Vulnerable");
}
if (glossNames(redemption).includes("Weakened") === false) {
  fail("Redemption should gloss Weakened");
}
if (glossNames(redemption).includes("Immunity")) {
  fail("do not invent an Immunity glossary; Star Progression had no definition line");
}
if (
  findAbilityInsight("Blazing Onslaught", { dragonId: "antares" })?.habit !== 1
) {
  fail("hovering Blazing Onslaught on Antares should open habit 1");
}
if (
  findAbilityInsight("Blazing Onslaught", { dragonId: "vhagar" })?.habit !== 4
) {
  fail("hovering Blazing Onslaught on Vhagar should still open habit 4");
}
if (
  findAbilityInsight("Blazing Onslaught", { dragonId: "shadowsong" })?.habit !== 2
) {
  fail("hovering Blazing Onslaught on Shadowsong should still open habit 2");
}
if (
  findAbilityInsight("Dragon's Flair", { dragonId: "antares" })?.habit !== 2
) {
  fail("hovering Dragon's Flair on Antares should open habit 2");
}
if (
  findAbilityInsight("Dragon's Flair", { dragonId: "caraxes" })?.habit !== 2
) {
  fail("hovering Dragon's Flair on Caraxes should still open habit 2");
}
if (
  findAbilityInsight("Dragon's Intellect", { dragonId: "antares" })?.habit !== 4
) {
  fail("hovering Dragon's Intellect on Antares should open habit 4");
}
if (
  findAbilityInsight("Dragon's Intellect", { dragonId: "crimson" })?.habit !== 2
) {
  fail("hovering Dragon's Intellect on Crimson should still open habit 2");
}
if (
  findAbilityInsight("Dragon's Intellect", { dragonId: "shadowsong" })?.habit !== 4
) {
  fail("hovering Dragon's Intellect on Shadowsong should still open habit 4");
}
if (
  findAbilityInsight("Redemption", { dragonId: "antares" })?.title !== "Redemption"
) {
  fail("hovering Redemption should open Antares habit 5");
}
const antaresCommand = insightForSource("antares", { kind: "command" });
if (!antaresCommand) fail("Antares command missing");
if (antaresCommand.title !== "Relentless Pursuit") {
  fail(`Antares command title is ${antaresCommand.title}, expected Relentless Pursuit`);
}
if (/Relentless Pursuit gains/i.test(antaresCommand.body)) {
  fail("do not rewrite Hub Antares command to Relentless Pursuit gains");
}
if (
  findAbilityInsight("Relentless Pursuit", { dragonId: "antares" })?.kind !== "command"
) {
  fail("hovering Relentless Pursuit should open Antares Command");
}
if (!namedChips(antaresCommand).includes("Relentless Pursuit")) {
  fail("Antares command chips should include Relentless Pursuit");
}
if (glossNames(antaresCommand).includes("Vulnerable") === false) {
  fail("Antares Command should gloss Vulnerable");
}
const pursuitTone = tokenizeAbilityText("Relentless Pursuit").find(
  (part) => part.value === "Relentless Pursuit",
)?.tone;
if (pursuitTone !== "command") {
  fail(`Relentless Pursuit text tone is ${pursuitTone}, expected command`);
}
if (statusMarkPolarity("Relentless Pursuit") != null) {
  fail("Relentless Pursuit is the Command name, not a buff/debuff mark");
}
if (statusMarkPolarity("Immunity") !== "buff") {
  fail("Immunity in habit text should get a buff arrow");
}
const immunityTone = tokenizeAbilityText("grant yourself Immunity").find(
  (part) => part.value === "Immunity",
)?.tone;
if (immunityTone !== "buff") {
  fail(`Immunity text tone is ${immunityTone}, expected buff`);
}
const antaresCatalog = catalogFor(antares);
if (antaresCatalog.namedCount !== 5 || antaresCatalog.needsScreenshot) {
  fail("Antares habit names from Star Progression should be complete");
}
if (antaresCatalog.command.names.includes("Relentless Pursuit") === false) {
  fail("Dev catalog should list Relentless Pursuit on Antares Command");
}
const antaresVulnerable = findAbilityInsight("Vulnerable", { dragonId: "antares" });
if (!antaresVulnerable || antaresVulnerable.kind !== "buff") {
  fail(`Vulnerable hover opened ${antaresVulnerable?.kind}:${antaresVulnerable?.title}`);
}
if (antaresVulnerable.polarity !== "debuff") fail("Vulnerable is a debuff");
if (
  antaresVulnerable.dragonName !== "Antares" ||
  antaresVulnerable.unlockStars != null
) {
  fail(
    `Vulnerable on Antares should be Command, got ${antaresVulnerable.dragonName} ${antaresVulnerable.unlockStars}`,
  );
}
const antaresSlow = findAbilityInsight("Slow", { dragonId: "antares" });
if (
  antaresSlow?.neededBy?.dragonName !== "Antares" ||
  antaresSlow.neededBy.gates.some((gate) => gate.stars === 6) === false
) {
  fail(
    `Slow on Antares should need 6★ Fiery Precision, got ${JSON.stringify(antaresSlow?.neededBy)}`,
  );
}

const arrax = getCatalogDragon("arrax");
if (!arrax) fail("missing Arrax");
const arraxNames: [number, string, string[], string][] = [
  [1, "Headlong Into Danger", ["Damage Received", "Instinct"], "-10%,-8%,-6%,-3%,-0%"],
  [2, "Stone Bulwark", ["Damage Received"], "-2.5%,-3%,-3.5%,-4.25%,-5%"],
  [3, "Adaptive Guard", ["Damage Received"], "-9%,-10.8%,-12.6%,-15.3%,-18%"],
  [4, "Fire Ward", ["Damage Received (per Stack)"], "-5%,-6%,-7%,-8.5%,-10%"],
  [5, "Turn the Line", ["Damage Received"], "9%,11.7%,14.4%,18%,22.5%"],
];
for (const [habit, title, labels, firstValues] of arraxNames) {
  const row = insightForSource("arrax", { kind: "habit", habit });
  if (!row) fail(`Arrax habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Arrax habit ${habit} title is ${row.title}, expected ${title}`);
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
const headlong = insightForSource("arrax", { kind: "habit", habit: 1 });
if (!/increase your Physical Damage Received by -10%/i.test(headlong?.body ?? "")) {
  fail("keep Hub Headlong Into Danger Physical Damage Received -10%");
}
if (/Physical Damage Received by \+10%/i.test(headlong?.body ?? "")) {
  fail("do not rewrite Hub Headlong Into Danger -10% to screenshot +10%");
}
if (/Physical Damage Received by \+8%/i.test(headlong?.body ?? "")) {
  fail("do not rewrite Hub Headlong Into Danger L1 to screenshot rank-2 +8%");
}
if (/4 round\(s\)/i.test(headlong?.body ?? "")) {
  fail("do not rewrite Hub Headlong Into Danger 4 rounds to screenshot round(s)");
}
if (headlong?.scale.some((row) => row.values.join(",") === "25%,25%,25%,25%,25%")) {
  fail("Headlong Into Danger should skip constant Strength / Physical Damage Dealt");
}
if (headlong?.scale.some((row) => row.values.join(",") === "10%,10%,10%,10%,10%")) {
  fail("Headlong Into Danger should skip constant Initiative +10%");
}
if (
  headlong?.scale.find((row) => row.label === "Instinct")?.values.join(",") !==
  "-40%,-32%,-24%,-12%,-0%"
) {
  fail("Headlong Into Danger Instinct mismatch");
}
const stoneBulwark = insightForSource("arrax", { kind: "habit", habit: 2 });
if (!/Tactical Damage and Fire Damage Received/i.test(stoneBulwark?.body ?? "")) {
  fail("keep Hub Stone Bulwark Tactical Damage and Fire Damage Received");
}
if (!/-2\.5%/.test(stoneBulwark?.body ?? "")) {
  fail("keep Hub Stone Bulwark -2.5%");
}
if (/by -3% until the end of combat/.test(stoneBulwark?.body ?? "")) {
  fail("do not rewrite Hub Stone Bulwark -2.5% to screenshot rank-2 -3%");
}
if (stoneBulwark?.scale.length !== 1) {
  fail(
    `Stone Bulwark should be one Damage Received row, got ${stoneBulwark?.scale.map((row) => row.label).join(", ")}`,
  );
}
const adaptiveGuard = insightForSource("arrax", { kind: "habit", habit: 3 });
if (!/\(When leading Archers\)/i.test(adaptiveGuard?.body ?? "")) {
  fail("keep Hub Adaptive Guard (When leading Archers)");
}
if (!/When leading Shieldbearers\)/i.test(adaptiveGuard?.body ?? "")) {
  fail("keep Hub Adaptive Guard When leading Shieldbearers)");
}
if (/\(When leading Shieldbearers\)/i.test(adaptiveGuard?.body ?? "")) {
  fail("do not rewrite Hub Adaptive Guard missing paren to screenshot When leading Shieldbearers");
}
if (/4 round\(s\)/i.test(adaptiveGuard?.body ?? "")) {
  fail("do not rewrite Hub Adaptive Guard 4 rounds to screenshot round(s)");
}
if (adaptiveGuard?.scale.length !== 1) {
  fail(
    `Adaptive Guard should be one Damage Received row, got ${adaptiveGuard?.scale.map((row) => row.label).join(", ")}`,
  );
}
const fireWard = insightForSource("arrax", { kind: "habit", habit: 4 });
if (!/At the start of each round/i.test(fireWard?.body ?? "")) {
  fail("keep Hub Arrax Fire Ward At the start of each round");
}
if (/Each Round: If the target Ally retreated/.test(fireWard?.body ?? "")) {
  fail("do not rewrite Hub Arrax Fire Ward At the start of each round to Bevlorin Each Round");
}
if (!/reduces the target's Fire Damage Received/i.test(fireWard?.body ?? "")) {
  fail("keep Hub Arrax Fire Ward target's Fire Damage Received");
}
if (/Fire Damage \(Command & Habits\) Received/i.test(fireWard?.body ?? "")) {
  fail("do not rewrite Hub Arrax Fire Ward to Bevlorin Command & Habits wording");
}
if (glossNames(fireWard).includes("Fire Ward")) {
  fail("Fire Ward Hub already defines the stack; do not duplicate the glossary");
}
const turnTheLine = insightForSource("arrax", { kind: "habit", habit: 5 });
if (!/for 4 rounds/i.test(turnTheLine?.body ?? "")) {
  fail("keep Hub Turn the Line 4 rounds");
}
if (/4 round\(s\)/i.test(turnTheLine?.body ?? "")) {
  fail("do not rewrite Hub Turn the Line 4 rounds to screenshot round(s)");
}
if (
  findAbilityInsight("Fire Ward", { dragonId: "arrax" })?.kind !== "habit" ||
  findAbilityInsight("Fire Ward", { dragonId: "arrax" })?.habit !== 4
) {
  fail("hovering Fire Ward on Arrax should open habit 4");
}
if (findAbilityInsight("Fire Ward", { dragonId: "bevlorin" })?.habit !== 1) {
  fail("hovering Fire Ward on Bevlorin should open habit 1");
}
if (
  findAbilityInsight("Headlong Into Danger", { dragonId: "arrax" })?.habit !== 1
) {
  fail("hovering Headlong Into Danger should open Arrax habit 1");
}
if (
  findAbilityInsight("Turn the Line", { dragonId: "arrax" })?.title !==
  "Turn the Line"
) {
  fail("hovering Turn the Line should open Arrax habit 5");
}
const arraxCommand = insightForSource("arrax", { kind: "command" });
if (!arraxCommand) fail("Arrax command missing");
if (arraxCommand.title !== "Command") {
  fail(`Arrax command title is ${arraxCommand.title}, expected Command`);
}
if (arraxCommand.scale.some((row) => row.values.join(",") === "50%,50%,50%,50%,50%")) {
  fail("Arrax command should skip doubled Weakened chance");
}
if (glossNames(arraxCommand).includes("Weakened") === false) {
  fail("Arrax Command should gloss Weakened");
}
if (statusMarkPolarity("Fire Ward") !== "buff") {
  fail("Fire Ward in habit text should get a buff arrow");
}
const fireWardTone = tokenizeAbilityText("1 stack of Fire Ward").find(
  (part) => part.value === "Fire Ward",
)?.tone;
if (fireWardTone !== "buff") {
  fail(`Fire Ward text tone is ${fireWardTone}, expected buff`);
}
const arraxCatalog = catalogFor(arrax);
if (arraxCatalog.namedCount !== 5 || arraxCatalog.needsScreenshot) {
  fail("Arrax habit names from Star Progression should be complete");
}
const arraxWeakened = findAbilityInsight("Weakened", { dragonId: "arrax" });
if (
  arraxWeakened?.dragonName !== "Arrax" ||
  arraxWeakened.unlockStars != null
) {
  fail(
    `Weakened on Arrax should be Command, got ${arraxWeakened?.dragonName} ${arraxWeakened?.unlockStars}`,
  );
}

const arulix = getCatalogDragon("arulix");
if (!arulix) fail("missing Arulix");
const arulixNames: [number, string, string[], string][] = [
  [1, "Hypnotic Helix", ["Overwhelm Chance", "Stagger Chance"], "12.5%,15%,17.5%,21.3%,25%"],
  [2, "Battle Cunning", ["Strength/Intelligence"], "-4%,-4.8%,-5.6%,-6.8%,-8%"],
  [3, "Spiral Surge", ["Damage Rate"], "20%,24%,28%,34%,40%"],
  [4, "Iron Shell", ["Damage Received"], "-2.5%,-3%,-3.5%,-4.25%,-5%"],
  [5, "Mimicry", ["Mimicry Chance"], "25%,32.5%,40%,50%,62.5%"],
];
for (const [habit, title, labels, firstValues] of arulixNames) {
  const row = insightForSource("arulix", { kind: "habit", habit });
  if (!row) fail(`Arulix habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Arulix habit ${habit} title is ${row.title}, expected ${title}`);
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
const hypnoticHelix = insightForSource("arulix", { kind: "habit", habit: 1 });
if (!/12\.5% chance to Overwhelm/i.test(hypnoticHelix?.body ?? "")) {
  fail("keep Hub Hypnotic Helix 12.5%");
}
if (/15% chance to Overwhelm/i.test(hypnoticHelix?.body ?? "")) {
  fail("do not rewrite Hub Hypnotic Helix 12.5% to screenshot rank-2 flavor 15%");
}
if (/2 round\(s\)/i.test(hypnoticHelix?.body ?? "")) {
  fail("do not rewrite Hub Hypnotic Helix 2 rounds to screenshot round(s)");
}
if (/prioritize Fire Damage dealers/i.test(hypnoticHelix?.body ?? "")) {
  fail("do not rewrite Hub Hypnotic Helix prioritizes the Fire Damage dealers");
}
if (/prevents the target from using/i.test(hypnoticHelix?.body ?? "")) {
  fail("do not copy Overwhelm or Stagger glossary into Hub Hypnotic Helix text");
}
if (
  hypnoticHelix?.scale.find((row) => row.label === "Stagger Chance")?.values.join(
    ",",
  ) !== "12.5%,15%,17.5%,21.3%,25%"
) {
  fail("Hypnotic Helix Stagger Chance mismatch");
}
if (hypnoticHelix?.scale.length !== 2) {
  fail(
    `Hypnotic Helix should be Overwhelm Chance and Stagger Chance, got ${hypnoticHelix?.scale.map((row) => row.label).join(", ")}`,
  );
}
const battleCunning = insightForSource("arulix", { kind: "habit", habit: 2 });
if (!/Reduce Strength and Intelligence by -4%/i.test(battleCunning?.body ?? "")) {
  fail("keep Hub Arulix Battle Cunning -4%");
}
if (/Reduce Strength and Intelligence by -4\.8%/i.test(battleCunning?.body ?? "")) {
  fail("do not rewrite Hub Arulix Battle Cunning -4% to screenshot rank-2 flavor -4.8%");
}
const spiralSurge = insightForSource("arulix", { kind: "habit", habit: 3 });
if (!/Damage Rate:\+20%/i.test(spiralSurge?.body ?? "")) {
  fail("keep Hub Spiral Surge Damage Rate:+20%");
}
if (spiralSurge?.scale.length !== 1) {
  fail(
    `Spiral Surge should be one Damage Rate row, got ${spiralSurge?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (
  spiralSurge?.scale.some((row) => row.values.join(",") === "30%,36%,42%,51%,60%")
) {
  fail("Spiral Surge should skip 1.5x Round 5 Damage Rate");
}
if (
  spiralSurge?.scale.some((row) => row.values.join(",") === "40%,48%,56%,68%,80%")
) {
  fail("Spiral Surge should skip 2x Round 8 Damage Rate");
}
const ironShell = insightForSource("arulix", { kind: "habit", habit: 4 });
if (!/Physical Damage Received \(Command and Habits\)/i.test(ironShell?.body ?? "")) {
  fail("keep Hub Iron Shell Physical Damage Received (Command and Habits)");
}
if (/excluding Basic Attacks/i.test(ironShell?.body ?? "")) {
  fail("do not rewrite Hub Iron Shell Command and Habits to screenshot excluding Basic Attacks");
}
if (!/-2\.5%/.test(ironShell?.body ?? "")) {
  fail("keep Hub Iron Shell -2.5%");
}
if (/by -2% until the end of combat/.test(ironShell?.body ?? "")) {
  fail("do not rewrite Hub Iron Shell -2.5% to screenshot body -2%");
}
if (ironShell?.scale.length !== 1) {
  fail(
    `Iron Shell should be one Damage Received row, got ${ironShell?.scale.map((row) => row.label).join(", ")}`,
  );
}
const mimicry = insightForSource("arulix", { kind: "habit", habit: 5 });
if (!/Start of Each Round: If any ally is afflicted with Weakened or Vulnerable/i.test(mimicry?.body ?? "")) {
  fail("keep Hub Mimicry Start of Each Round");
}
if (/2 round\(s\)/i.test(mimicry?.body ?? "")) {
  fail("do not rewrite Hub Mimicry 2 rounds to screenshot round(s)");
}
if (/32\.5% chance to apply that same effect to 1 Enemy/i.test(mimicry?.body ?? "")) {
  fail("do not rewrite Hub Mimicry 25% to screenshot rank-2 flavor 32.5%");
}
if (/reduces the target's Damage Dealt/i.test(mimicry?.body ?? "") || /increases the target's Damage Received/i.test(mimicry?.body ?? "")) {
  fail("do not copy Weakened or Vulnerable glossary into Hub Mimicry text");
}
if (mimicry?.scale.length !== 1) {
  fail(
    `Mimicry should be one Mimicry Chance row, got ${mimicry?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (glossNames(mimicry).includes("Weakened") === false) {
  fail("Mimicry should gloss Weakened");
}
if (glossNames(mimicry).includes("Vulnerable") === false) {
  fail("Mimicry should gloss Vulnerable");
}
if (glossNames(mimicry).includes("Advantage") === false) {
  fail("Mimicry should gloss Advantage");
}
if (glossNames(mimicry).includes("Resistance") === false) {
  fail("Mimicry should gloss Resistance");
}
if (glossNames(hypnoticHelix).includes("Overwhelm") === false) {
  fail("Hypnotic Helix should gloss Overwhelm");
}
if (glossNames(hypnoticHelix).includes("Stagger") === false) {
  fail("Hypnotic Helix should gloss Stagger");
}
if (
  findAbilityInsight("Hypnotic Helix", { dragonId: "arulix" })?.habit !== 1
) {
  fail("hovering Hypnotic Helix should open Arulix habit 1");
}
if (
  findAbilityInsight("Battle Cunning", { dragonId: "arulix" })?.habit !== 2
) {
  fail("hovering Battle Cunning on Arulix should open habit 2");
}
if (
  findAbilityInsight("Battle Cunning", { dragonId: "kalspire" })?.habit !== 2
) {
  fail("hovering Battle Cunning on Kalspire should still open habit 2");
}
if (
  findAbilityInsight("Battle Cunning", { dragonId: "arulix" })?.scale.find(
    (row) => row.label === "Strength/Intelligence",
  )?.values.join(",") !== "-4%,-4.8%,-5.6%,-6.8%,-8%"
) {
  fail("Arulix Battle Cunning should keep -4% scale, not Kalspire -6.5%");
}
if (
  findAbilityInsight("Battle Cunning", { dragonId: "kalspire" })?.scale.find(
    (row) => row.label === "Strength/Intelligence",
  )?.values.join(",") !== "-6.5%,-7.8%,-9.1%,-11.05%,-13%"
) {
  fail("Kalspire Battle Cunning should keep -6.5% scale");
}
if (
  findAbilityInsight("Spiral Surge", { dragonId: "arulix" })?.habit !== 3
) {
  fail("hovering Spiral Surge should open Arulix habit 3");
}
if (
  findAbilityInsight("Iron Shell", { dragonId: "arulix" })?.habit !== 4
) {
  fail("hovering Iron Shell should open Arulix habit 4");
}
if (findAbilityInsight("Mimicry", { dragonId: "arulix" })?.title !== "Mimicry") {
  fail("hovering Mimicry should open Arulix habit 5");
}
const arulixCommand = insightForSource("arulix", { kind: "command" });
if (!arulixCommand) fail("Arulix command missing");
if (arulixCommand.title !== "Command") {
  fail(`Arulix command title is ${arulixCommand.title}, expected Command`);
}
if (commandHeading("arulix") !== "Command") {
  fail("Arulix command heading should stay Command");
}
if (!/Reounds 1,2,3,5,8/i.test(arulixCommand.body)) {
  fail("keep Hub Arulix Command Reounds spelling");
}
if (/Rounds 1,2,3,5,8: Deal Tactical Damage/i.test(arulixCommand.body)) {
  fail("do not rewrite Hub Arulix Command Reounds to Rounds");
}
const arulixCatalog = catalogFor(arulix);
if (arulixCatalog.namedCount !== 5 || arulixCatalog.needsScreenshot) {
  fail("Arulix habit names from Star Progression should be complete");
}
const arulixOverwhelm = findAbilityInsight("Overwhelm", { dragonId: "arulix" });
if (
  arulixOverwhelm?.dragonName !== "Arulix" ||
  arulixOverwhelm.unlockStars !== 2
) {
  fail(
    `Overwhelm on Arulix should be 2★ Hypnotic Helix, got ${arulixOverwhelm?.dragonName} ${arulixOverwhelm?.unlockStars}`,
  );
}
if (!/Active Commands and Habits on their turn/i.test(arulixOverwhelm?.body ?? "")) {
  fail(`Overwhelm glossary missing Star Progression line: ${arulixOverwhelm?.body}`);
}
const arulixStagger = findAbilityInsight("Stagger", { dragonId: "arulix" });
if (
  arulixStagger?.dragonName !== "Arulix" ||
  arulixStagger.unlockStars !== 2
) {
  fail(
    `Stagger on Arulix should be 2★ Hypnotic Helix, got ${arulixStagger?.dragonName} ${arulixStagger?.unlockStars}`,
  );
}
if (!/Attack Modifier Commands/i.test(arulixStagger?.body ?? "") || !/Basic Attacks/i.test(arulixStagger?.body ?? "")) {
  fail(`Stagger glossary missing Star Progression line: ${arulixStagger?.body}`);
}
if (/on their turn/i.test(arulixStagger?.body ?? "")) {
  fail("do not extend Stagger glossary with Hypnotic Helix on their turn");
}

const dawnseeker = getCatalogDragon("dawnseeker");
if (!dawnseeker) fail("missing Dawnseeker");
const dawnseekerNames: [number, string, string[], string][] = [
  [1, "Tactical Inferno", ["Damage Dealt"], "9%,10.8%,12.6%,15.3%,18%"],
  [2, "Unbroken Devotion", ["Recovery Received"], "15%,18%,21%,25.5%,30%"],
  [3, "Sunbreak", ["Damage Rate", "Recovery Rate"], "100%,110%,120%,135%,150%"],
  [4, "Wind's Favor", ["Initiative"], "8%,9.6%,11.2%,13.6%,16%"],
  [5, "First Light", ["Intelligence/Instinct", "First-Strike Chance"], "5%,6.5%,8%,10%,12.5%"],
];
for (const [habit, title, labels, firstValues] of dawnseekerNames) {
  const row = insightForSource("dawnseeker", { kind: "habit", habit });
  if (!row) fail(`Dawnseeker habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Dawnseeker habit ${habit} title is ${row.title}, expected ${title}`);
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
const tacticalInferno = insightForSource("dawnseeker", { kind: "habit", habit: 1 });
if (!/Increase the Tactical Damage Dealt of 1 Ally in any lane \(prioritizes the Left Flank\)/i.test(tacticalInferno?.body ?? "")) {
  fail("keep Hub Dawnseeker Tactical Inferno Left Flank / Tactical Damage Dealt");
}
if (!/by \+9% for 3 rounds/i.test(tacticalInferno?.body ?? "")) {
  fail("keep Hub Dawnseeker Tactical Inferno +9%");
}
if (/by \+10\.8% for 3 rounds/i.test(tacticalInferno?.body ?? "")) {
  fail("do not rewrite Hub Dawnseeker Tactical Inferno +9% to screenshot rank-2 flavor +10.8%");
}
if (/3 round\(s\)/i.test(tacticalInferno?.body ?? "")) {
  fail("do not rewrite Hub Dawnseeker Tactical Inferno 3 rounds to screenshot round(s)");
}
const infernoRanks = habitRankTexts("dawnseeker", 0);
if (!infernoRanks?.[1]?.startsWith("start of Round 1")) {
  fail("keep Hub Dawnseeker Tactical Inferno L2 start of Round 1");
}
const unbrokenDevotion = insightForSource("dawnseeker", { kind: "habit", habit: 2 });
if (!/Increase Recovery Received by \+15%/i.test(unbrokenDevotion?.body ?? "")) {
  fail("keep Hub Dawnseeker Unbroken Devotion +15%");
}
if (/Increase Recovery Received by \+18%/i.test(unbrokenDevotion?.body ?? "")) {
  fail("do not rewrite Hub Dawnseeker Unbroken Devotion +15% to screenshot rank-2 flavor +18%");
}
const sunbreak = insightForSource("dawnseeker", { kind: "habit", habit: 3 });
if (!/Command gains increase the Tactical Damage Rate/i.test(sunbreak?.body ?? "")) {
  fail("keep Hub Sunbreak Command gains");
}
if (/Radiant Wings gains/i.test(sunbreak?.body ?? "")) {
  fail("do not rewrite Hub Sunbreak Command gains to Radiant Wings gains");
}
if (!/increase the Recovery to \+60%/i.test(sunbreak?.body ?? "")) {
  fail("keep Hub Sunbreak the Recovery to +60%");
}
if (/increase the Recovery Rate to/i.test(sunbreak?.body ?? "")) {
  fail("do not rewrite Hub Sunbreak the Recovery to screenshot Recovery Rate");
}
if (
  sunbreak?.scale.find((row) => row.label === "Recovery Rate")?.values.join(",") !==
  "60%,66%,72%,81%,90%"
) {
  fail("Sunbreak Recovery Rate mismatch");
}
const windsFavor = insightForSource("dawnseeker", { kind: "habit", habit: 4 });
if (!/Increase Initiative by \+8% \(enhanced by Initiative\)/i.test(windsFavor?.body ?? "")) {
  fail("keep Hub Dawnseeker Wind's Favor +8%");
}
const firstLight = insightForSource("dawnseeker", { kind: "habit", habit: 5 });
if (!/Increase Intelligence and Instinct \(enhanced by Initiative\) by \+5%/i.test(firstLight?.body ?? "")) {
  fail("keep Hub First Light +5%");
}
if (/for 3 round\(s\)/i.test(firstLight?.body ?? "")) {
  fail("do not rewrite Hub First Light 3 rounds to screenshot round(s)");
}
if (/20% chance to grant First-Strike/i.test(firstLight?.body ?? "") === false) {
  fail("keep Hub First Light 20% First-Strike chance");
}
if (/causes the target to act/i.test(firstLight?.body ?? "") || /causes the target to attack/i.test(firstLight?.body ?? "")) {
  fail("do not copy First-Strike glossary into Hub First Light text");
}
if (
  firstLight?.scale.find((row) => row.label === "First-Strike Chance")?.values.join(
    ",",
  ) !== "20%,26%,32%,40%,50%"
) {
  fail("First Light First-Strike Chance mismatch");
}
if (glossNames(firstLight).includes("First-Strike") === false) {
  fail("First Light should gloss First-Strike");
}
if (
  findAbilityInsight("Tactical Inferno", { dragonId: "dawnseeker" })?.habit !== 1
) {
  fail("hovering Tactical Inferno on Dawnseeker should open habit 1");
}
if (
  findAbilityInsight("Tactical Inferno", { dragonId: "syrax" })?.habit !== 4
) {
  fail("hovering Tactical Inferno on Syrax should still open habit 4");
}
if (
  findAbilityInsight("Unbroken Devotion", { dragonId: "dawnseeker" })?.habit !== 2
) {
  fail("hovering Unbroken Devotion on Dawnseeker should open habit 2");
}
if (
  findAbilityInsight("Unbroken Devotion", { dragonId: "rhysarion" })?.habit !== 4
) {
  fail("hovering Unbroken Devotion on Rhysarion should still open habit 4");
}
if (
  findAbilityInsight("Wind's Favor", { dragonId: "dawnseeker" })?.habit !== 4
) {
  fail("hovering Wind's Favor on Dawnseeker should open habit 4");
}
if (
  findAbilityInsight("Wind's Favor", { dragonId: "seasmoke" })?.habit !== 2
) {
  fail("hovering Wind's Favor on Seasmoke should still open habit 2");
}
if (
  findAbilityInsight("Sunbreak", { dragonId: "dawnseeker" })?.habit !== 3
) {
  fail("hovering Sunbreak should open Dawnseeker habit 3");
}
if (findAbilityInsight("First Light", { dragonId: "dawnseeker" })?.title !== "First Light") {
  fail("hovering First Light should open Dawnseeker habit 5");
}
if (
  findAbilityInsight("Tactical Inferno", { dragonId: "dawnseeker" })?.scale.find(
    (row) => row.label === "Damage Dealt",
  )?.values.join(",") !== "9%,10.8%,12.6%,15.3%,18%"
) {
  fail("Dawnseeker Tactical Inferno should keep +9% scale, not Syrax +18%");
}
if (
  findAbilityInsight("Unbroken Devotion", { dragonId: "dawnseeker" })?.scale.find(
    (row) => row.label === "Recovery Received",
  )?.values.join(",") !== "15%,18%,21%,25.5%,30%"
) {
  fail("Dawnseeker Unbroken Devotion should keep +15% scale, not Rhysarion +20%");
}
if (
  findAbilityInsight("Wind's Favor", { dragonId: "dawnseeker" })?.scale.find(
    (row) => row.label === "Initiative",
  )?.values.join(",") !== "8%,9.6%,11.2%,13.6%,16%"
) {
  fail("Dawnseeker Wind's Favor should keep +8% scale, not Seasmoke +12.5%");
}
const dawnCommand = insightForSource("dawnseeker", { kind: "command" });
if (!dawnCommand) fail("Dawnseeker command missing");
if (dawnCommand.title !== "Radiant Wings") {
  fail(`Dawnseeker command title is ${dawnCommand.title}, expected Radiant Wings`);
}
if (commandHeading("dawnseeker") !== "Command · Radiant Wings") {
  fail("Dawnseeker command heading should be Command · Radiant Wings");
}
if (/Radiant Wings gains/i.test(dawnCommand.body)) {
  fail("do not rewrite Hub Dawnseeker command to Radiant Wings gains");
}
if (
  findAbilityInsight("Radiant Wings", { dragonId: "dawnseeker" })?.kind !== "command"
) {
  fail("hovering Radiant Wings should open Dawnseeker's Command");
}
if (!namedChips(dawnCommand).includes("Radiant Wings")) {
  fail("Dawnseeker command chips should include Radiant Wings");
}
const wingsTone = tokenizeAbilityText("Radiant Wings").find(
  (part) => part.value === "Radiant Wings",
)?.tone;
if (wingsTone !== "command") {
  fail(`Radiant Wings text tone is ${wingsTone}, expected command`);
}
if (statusMarkPolarity("Radiant Wings") != null) {
  fail("Radiant Wings is the Command name, not a buff/debuff mark");
}
const dawnCatalog = catalogFor(dawnseeker);
if (dawnCatalog.namedCount !== 5 || dawnCatalog.needsScreenshot) {
  fail("Dawnseeker habit names from Star Progression should be complete");
}
if (dawnCatalog.command.names.includes("Radiant Wings") === false) {
  fail("Dev catalog should list Radiant Wings on Dawnseeker's Command");
}
const dawnFirstStrike = findAbilityInsight("First-Strike", { dragonId: "dawnseeker" });
if (
  dawnFirstStrike?.dragonName !== "Dawnseeker" ||
  dawnFirstStrike.unlockStars !== 10
) {
  fail(
    `First-Strike on Dawnseeker should be 10★ First Light, got ${dawnFirstStrike?.dragonName} ${dawnFirstStrike?.unlockStars}`,
  );
}
if (!/act before all other combatants/i.test(dawnFirstStrike?.body ?? "")) {
  fail(`First-Strike glossary missing Star Progression line: ${dawnFirstStrike?.body}`);
}
if (/attack before all other combatants/i.test(dawnFirstStrike?.body ?? "")) {
  fail("do not rewrite First-Strike glossary act to First Light screenshot attack");
}

const jagadrix = getCatalogDragon("jagadrix");
if (!jagadrix) fail("missing Jagadrix");
const jagadrixNames: [number, string, string[], string][] = [
  [1, "Enervate", ["Damage Dealt"], "-8%,-9.6%,-11.2%,-13.6%,-16%"],
  [2, "Second Wind", ["Damage Dealt", "Recovery Rate"], "10%,12%,14%,17%,20%"],
  [3, "Whispering Sabotage", ["Weakened Chance"], "25%,30%,35%,42.5%,50%"],
  [4, "Quick-Witted", ["Intelligence/Initiative"], "12.5%,15%,17.5%,21.25%,25%"],
  [5, "Echoes of Deceit", ["Instinct/Initiative", "Damage Rate"], "-6%,-7.8%,-9.6%,-12%,-15%"],
];
for (const [habit, title, labels, firstValues] of jagadrixNames) {
  const row = insightForSource("jagadrix", { kind: "habit", habit });
  if (!row) fail(`Jagadrix habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Jagadrix habit ${habit} title is ${row.title}, expected ${title}`);
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
const jagEnervate = insightForSource("jagadrix", { kind: "habit", habit: 1 });
if (!/Reduce Tactical Damage Dealt by -8%/i.test(jagEnervate?.body ?? "")) {
  fail("keep Hub Jagadrix Enervate -8%");
}
if (/Reduce Tactical Damage Dealt by -11(?:\.2)?%/i.test(jagEnervate?.body ?? "")) {
  fail("do not rewrite Hub Jagadrix Enervate -8% to screenshot rank-3 flavor");
}
const secondWind = insightForSource("jagadrix", { kind: "habit", habit: 2 });
if (!/Increase your Damage Dealt by \+10%/i.test(secondWind?.body ?? "")) {
  fail("keep Hub Second Wind +10%");
}
if (/Increase your Damage Dealt by \+14%/i.test(secondWind?.body ?? "")) {
  fail("do not rewrite Hub Second Wind +10% to screenshot rank-3 flavor +14%");
}
if (!/Recovery Rate: \+150%/i.test(secondWind?.body ?? "")) {
  fail("keep Hub Second Wind Recovery Rate +150%");
}
if (/Recovery Rate: \+210%/i.test(secondWind?.body ?? "")) {
  fail("do not rewrite Hub Second Wind +150% to screenshot rank-3 flavor +210%");
}
if (!/Nullify Recovery prevents the target from receiving Recovery/i.test(secondWind?.body ?? "")) {
  fail("keep Hub Second Wind Nullify Recovery sentence");
}
if (
  secondWind?.scale.find((row) => row.label === "Recovery Rate")?.values.join(",") !==
  "150%,180%,210%,255%,300%"
) {
  fail("Second Wind Recovery Rate mismatch");
}
if (glossNames(secondWind).includes("Nullify Recovery")) {
  fail("Second Wind already explains Nullify Recovery; do not duplicate the glossary");
}
const whisperingSabotage = insightForSource("jagadrix", { kind: "habit", habit: 3 });
if (!/25% chance to afflict 1 Enemy with Weakened \(-10%\)/i.test(whisperingSabotage?.body ?? "")) {
  fail("keep Hub Whispering Sabotage 25%");
}
if (/35% chance to afflict 1 Enemy with Weakened/i.test(whisperingSabotage?.body ?? "")) {
  fail("do not rewrite Hub Whispering Sabotage 25% to screenshot rank-3 flavor 35%");
}
if (/2 round\(s\)/i.test(whisperingSabotage?.body ?? "")) {
  fail("do not rewrite Hub Whispering Sabotage 2 rounds to screenshot round(s)");
}
if (/reduces the target's Damage Dealt/i.test(whisperingSabotage?.body ?? "")) {
  fail("do not copy Weakened glossary into Hub Whispering Sabotage text");
}
if (whisperingSabotage?.scale.some((row) => row.values.join(",") === "-10%,-10%,-10%,-10%,-10%")) {
  fail("Whispering Sabotage should skip constant Weakened -10%");
}
if (glossNames(whisperingSabotage).includes("Weakened") === false) {
  fail("Whispering Sabotage should gloss Weakened");
}
const jagQuickWitted = insightForSource("jagadrix", { kind: "habit", habit: 4 });
if (!/Increase your Intelligence and Initiative by \+12\.5%/i.test(jagQuickWitted?.body ?? "")) {
  fail("keep Hub Quick-Witted +12.5%");
}
const echoes = insightForSource("jagadrix", { kind: "habit", habit: 5 });
if (!/Command reduce the Instinct and Initiative by -6%/i.test(echoes?.body ?? "")) {
  fail("keep Hub Echoes of Deceit Command reduce");
}
if (/Cunning Whispers gains/i.test(echoes?.body ?? "")) {
  fail("do not rewrite Hub Echoes of Deceit Command reduce to Cunning Whispers gains");
}
if (!/Command deal Fire Damage/i.test(echoes?.body ?? "")) {
  fail("keep Hub Echoes of Deceit Command deal Fire Damage");
}
if (!/This damage is doubled if the target is afflicted with Panic/i.test(echoes?.body ?? "")) {
  fail("keep Hub Echoes of Deceit doubled Panic sentence");
}
if (
  echoes?.scale.find((row) => row.label === "Damage Rate")?.values.join(",") !==
  "30%,39%,48%,60%,75%"
) {
  fail("Echoes of Deceit Damage Rate mismatch");
}
if (
  echoes?.scale.some((row) =>
    ["60%,78%,96%,120%,150%", "60%,78%,96%,120%,150%"].includes(row.values.join(",")),
  )
) {
  fail("Echoes of Deceit should skip doubled Panic Damage Rate");
}
if (echoes?.scale.length !== 2) {
  fail(
    `Echoes of Deceit should be Instinct/Initiative and Damage Rate, got ${echoes?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (glossNames(echoes).includes("Panic") === false) {
  fail("Echoes of Deceit should gloss Panic");
}
if (findAbilityInsight("Enervate", { dragonId: "jagadrix" })?.habit !== 1) {
  fail("hovering Enervate on Jagadrix should open habit 1");
}
if (findAbilityInsight("Enervate", { dragonId: "crimson" })?.habit !== 1) {
  fail("hovering Enervate on Crimson should still open habit 1");
}
if (findAbilityInsight("Enervate", { dragonId: "tashix" })?.habit !== 1) {
  fail("hovering Enervate on Tashix should still open habit 1");
}
if (
  findAbilityInsight("Enervate", { dragonId: "jagadrix" })?.scale.find(
    (row) => row.label === "Damage Dealt",
  )?.values.join(",") !== "-8%,-9.6%,-11.2%,-13.6%,-16%"
) {
  fail("Jagadrix Enervate should keep -8% scale, not Crimson or Tashix");
}
if (findAbilityInsight("Second Wind", { dragonId: "jagadrix" })?.habit !== 2) {
  fail("hovering Second Wind should open Jagadrix habit 2");
}
if (
  findAbilityInsight("Whispering Sabotage", { dragonId: "jagadrix" })?.habit !== 3
) {
  fail("hovering Whispering Sabotage should open Jagadrix habit 3");
}
if (findAbilityInsight("Quick-Witted", { dragonId: "jagadrix" })?.habit !== 4) {
  fail("hovering Quick-Witted on Jagadrix should open habit 4");
}
if (findAbilityInsight("Quick-Witted", { dragonId: "feskar" })?.habit !== 4) {
  fail("hovering Quick-Witted on Feskar should still open habit 4");
}
if (
  findAbilityInsight("Quick-Witted", { dragonId: "jagadrix" })?.scale.find(
    (row) => row.label === "Intelligence/Initiative",
  )?.values.join(",") !== "12.5%,15%,17.5%,21.25%,25%"
) {
  fail("Jagadrix Quick-Witted should keep +12.5% scale, not Feskar +16%");
}
if (
  findAbilityInsight("Echoes of Deceit", { dragonId: "jagadrix" })?.title !==
  "Echoes of Deceit"
) {
  fail("hovering Echoes of Deceit should open Jagadrix habit 5");
}
const jagCommand = insightForSource("jagadrix", { kind: "command" });
if (!jagCommand) fail("Jagadrix command missing");
if (jagCommand.title !== "Cunning Whispers") {
  fail(`Jagadrix command title is ${jagCommand.title}, expected Cunning Whispers`);
}
if (commandHeading("jagadrix") !== "Command · Cunning Whispers") {
  fail("Jagadrix command heading should be Command · Cunning Whispers");
}
if (/Cunning Whispers gains/i.test(jagCommand.body)) {
  fail("do not rewrite Hub Jagadrix command to Cunning Whispers gains");
}
if (
  findAbilityInsight("Cunning Whispers", { dragonId: "jagadrix" })?.kind !== "command"
) {
  fail("hovering Cunning Whispers should open Jagadrix's Command");
}
if (!namedChips(jagCommand).includes("Cunning Whispers")) {
  fail("Jagadrix command chips should include Cunning Whispers");
}
const whispersTone = tokenizeAbilityText("Cunning Whispers").find(
  (part) => part.value === "Cunning Whispers",
)?.tone;
if (whispersTone !== "command") {
  fail(`Cunning Whispers text tone is ${whispersTone}, expected command`);
}
if (statusMarkPolarity("Cunning Whispers") != null) {
  fail("Cunning Whispers is the Command name, not a buff/debuff mark");
}
if (statusMarkPolarity("Nullify Recovery") !== "debuff") {
  fail("Nullify Recovery in habit text should get a debuff arrow");
}
const nullifyTone = tokenizeAbilityText("afflict yourself with Nullify Recovery").find(
  (part) => part.value === "Nullify Recovery",
)?.tone;
if (nullifyTone !== "debuff") {
  fail(`Nullify Recovery text tone is ${nullifyTone}, expected debuff`);
}
const jagCatalog = catalogFor(jagadrix);
if (jagCatalog.namedCount !== 5 || jagCatalog.needsScreenshot) {
  fail("Jagadrix habit names from Star Progression should be complete");
}
if (jagCatalog.command.names.includes("Cunning Whispers") === false) {
  fail("Dev catalog should list Cunning Whispers on Jagadrix's Command");
}
const jagWeakened = findAbilityInsight("Weakened", { dragonId: "jagadrix" });
if (
  jagWeakened?.dragonName !== "Jagadrix" ||
  jagWeakened.unlockStars !== 6
) {
  fail(
    `Weakened on Jagadrix should be 6★ Whispering Sabotage, got ${jagWeakened?.dragonName} ${jagWeakened?.unlockStars}`,
  );
}
const jagPanic = findAbilityInsight("Panic", { dragonId: "jagadrix" });
if (
  jagPanic?.neededBy?.dragonName !== "Jagadrix" ||
  jagPanic.neededBy.gates.some((gate) => gate.stars === 10) === false
) {
  fail(
    `Panic on Jagadrix should need 10★ Echoes of Deceit, got ${JSON.stringify(jagPanic?.neededBy)}`,
  );
}
const nullify = findAbilityInsight("Nullify Recovery", { dragonId: "jagadrix" });
if (!nullify || nullify.title !== "Nullify Recovery" || nullify.kind !== "buff") {
  fail(`Nullify Recovery hover opened ${nullify?.kind}:${nullify?.title}`);
}
if (nullify.polarity !== "debuff") fail("Nullify Recovery is a debuff");
if (!/receiving Recovery/i.test(nullify.body)) {
  fail(`Nullify Recovery glossary missing Star Progression line: ${nullify.body}`);
}

const nyrena = getCatalogDragon("nyrena");
if (!nyrena) fail("missing Nyrena");
const nyrenaNames: [number, string, string[], string][] = [
  [1, "Battle Dread", ["Strength/Initiative"], "-4%,-4.8%,-5.6%,-6.8%,-8%"],
  [2, "Mindful Synergy", ["Intelligence/Instinct"], "4%,4.8%,5.6%,6.8%,8%"],
  [3, "Deepen the Breach", ["Damage Dealt", "Damage Dealt (2)"], "8%,9.6%,11.2%,13.6%,16%"],
  [4, "Dragon's Ire", ["Damage Dealt"], "4%,4.8%,5.6%,6.8%,8%"],
  [5, "The Long Siege", ["Damage Received"], "-5%,-6.5%,-8%,-10%,-12.5%"],
];
for (const [habit, title, labels, firstValues] of nyrenaNames) {
  const row = insightForSource("nyrena", { kind: "habit", habit });
  if (!row) fail(`Nyrena habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Nyrena habit ${habit} title is ${row.title}, expected ${title}`);
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
const nyrenaBattleDread = insightForSource("nyrena", { kind: "habit", habit: 1 });
if (
  !/Reduce the Strength and Initiative \(enhanced by Intelligence\) of 3 Enemies/i.test(
    nyrenaBattleDread?.body ?? "",
  )
) {
  fail("keep Hub Nyrena Battle Dread Strength and Initiative (enhanced by Intelligence)");
}
if (!/by -4% until the end of combat/i.test(nyrenaBattleDread?.body ?? "")) {
  fail("keep Hub Nyrena Battle Dread -4%");
}
if (/by -4\.8% until the end of combat/i.test(nyrenaBattleDread?.body ?? "")) {
  fail("do not rewrite Hub Nyrena Battle Dread -4% to screenshot rank-2 flavor -4.8%");
}
const nyrenaMindful = insightForSource("nyrena", { kind: "habit", habit: 2 });
if (
  !/Increase the Intelligence and Instinct \(enhanced by Initiative\) of 3 Allies/i.test(
    nyrenaMindful?.body ?? "",
  )
) {
  fail("keep Hub Nyrena Mindful Synergy Intelligence and Instinct (enhanced by Initiative)");
}
if (!/by \+4% until the end of combat/i.test(nyrenaMindful?.body ?? "")) {
  fail("keep Hub Nyrena Mindful Synergy +4%");
}
if (/by \+4\.8% until the end of combat/i.test(nyrenaMindful?.body ?? "")) {
  fail("do not rewrite Hub Nyrena Mindful Synergy +4% to screenshot rank-2 flavor +4.8%");
}
const deepenTheBreach = insightForSource("nyrena", { kind: "habit", habit: 3 });
if (!/Increase the Fire Damage Dealt of 1 Ally within adjacency/i.test(deepenTheBreach?.body ?? "")) {
  fail("keep Hub Deepen the Breach 1 Ally within adjacency");
}
if (/1 other Ally/i.test(deepenTheBreach?.body ?? "")) {
  fail("do not rewrite Hub Deepen the Breach 1 Ally to screenshot 1 other Ally");
}
if (!/for 5 round\(s\)/i.test(deepenTheBreach?.body ?? "")) {
  fail("keep Hub Deepen the Breach 5 round(s)");
}
if (!/Increase your Tile Damage Dealt to the tile's durability/i.test(deepenTheBreach?.body ?? "")) {
  fail("keep Hub Deepen the Breach Tile Damage sentence");
}
if (/Tile Damage Dealt by \+10%/i.test(deepenTheBreach?.body ?? "")) {
  fail("do not invent Deepen the Breach Tile Damage +10% into Hub body");
}
if (
  deepenTheBreach?.scale.find((row) => row.label === "Damage Dealt (2)")?.values.join(",") !==
  "12%,14.4%,16.8%,20.4%,24%"
) {
  fail("Deepen the Breach ally Fire Damage Dealt mismatch");
}
if (deepenTheBreach?.scale.some((row) => /tile/i.test(row.label))) {
  fail("Deepen the Breach must not invent Tile Damage; Hub has no Tile percent");
}
if (deepenTheBreach?.scale.some((row) => row.values.join(",") === "10%,12%,14%,17%,20%")) {
  fail("Deepen the Breach must not invent Tile Damage 10–20%");
}
if (deepenTheBreach?.scale.length !== 2) {
  fail(
    `Deepen the Breach should be two Damage Dealt rows, got ${deepenTheBreach?.scale.map((row) => row.label).join(", ")}`,
  );
}
const dragonsIre = insightForSource("nyrena", { kind: "habit", habit: 4 });
if (!/Increase your Tactical and Fire Damage Dealt by \+4%/i.test(dragonsIre?.body ?? "")) {
  fail("keep Hub Dragon's Ire Tactical and Fire Damage Dealt +4%");
}
if (/Increase your Tactical and Fire Damage Dealt by \+4\.8%/i.test(dragonsIre?.body ?? "")) {
  fail("do not rewrite Hub Dragon's Ire +4% to screenshot rank-2 flavor +4.8%");
}
const theLongSiege = insightForSource("nyrena", { kind: "habit", habit: 5 });
if (!/Start of Round 6-10: Reduce the Physical Damage Received/i.test(theLongSiege?.body ?? "")) {
  fail("keep Hub The Long Siege Start of Round 6-10 Physical Damage Received");
}
if (/Start of Rounds 6-10/i.test(theLongSiege?.body ?? "")) {
  fail("do not rewrite Hub The Long Siege Round to screenshot Rounds");
}
if (!/When Defending, double this effect \(-10%\)/i.test(theLongSiege?.body ?? "")) {
  fail("keep Hub The Long Siege defending double this effect");
}
if (theLongSiege?.scale.some((row) => row.values.join(",") === "-10%,-13%,-16%,-20%,-25%")) {
  fail("The Long Siege should skip defending double this effect");
}
if (theLongSiege?.scale.length !== 1) {
  fail(
    `The Long Siege should be one Damage Received row, got ${theLongSiege?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (findAbilityInsight("Battle Dread", { dragonId: "nyrena" })?.habit !== 1) {
  fail("hovering Battle Dread on Nyrena should open habit 1");
}
if (findAbilityInsight("Battle Dread", { dragonId: "caraxes" })?.habit !== 1) {
  fail("hovering Battle Dread on Caraxes should still open habit 1");
}
if (
  findAbilityInsight("Battle Dread", { dragonId: "nyrena" })?.scale.find(
    (row) => row.label === "Strength/Initiative",
  )?.values.join(",") !== "-4%,-4.8%,-5.6%,-6.8%,-8%"
) {
  fail("Nyrena Battle Dread should keep -4% scale, not Caraxes -6.5%");
}
if (findAbilityInsight("Mindful Synergy", { dragonId: "nyrena" })?.habit !== 2) {
  fail("hovering Mindful Synergy on Nyrena should open habit 2");
}
if (findAbilityInsight("Mindful Synergy", { dragonId: "syrax" })?.habit !== 1) {
  fail("hovering Mindful Synergy on Syrax should still open habit 1");
}
if (
  findAbilityInsight("Mindful Synergy", { dragonId: "nyrena" })?.scale.find(
    (row) => row.label === "Intelligence/Instinct",
  )?.values.join(",") !== "4%,4.8%,5.6%,6.8%,8%"
) {
  fail("Nyrena Mindful Synergy should keep +4% scale, not Syrax +6.5%");
}
if (
  findAbilityInsight("Deepen the Breach", { dragonId: "nyrena" })?.habit !== 3
) {
  fail("hovering Deepen the Breach should open Nyrena habit 3");
}
if (findAbilityInsight("Dragon's Ire", { dragonId: "nyrena" })?.habit !== 4) {
  fail("hovering Dragon's Ire should open Nyrena habit 4");
}
if (
  findAbilityInsight("The Long Siege", { dragonId: "nyrena" })?.title !==
  "The Long Siege"
) {
  fail("hovering The Long Siege should open Nyrena habit 5");
}
const nyrenaCommand = insightForSource("nyrena", { kind: "command" });
if (!nyrenaCommand) fail("Nyrena command missing");
if (nyrenaCommand.title !== "Command") {
  fail(`Nyrena command title is ${nyrenaCommand.title}, expected Command`);
}
if (commandHeading("nyrena") !== "Command") {
  fail("Nyrena command heading should stay Command");
}
if (namedChips(nyrenaCommand).length !== 0) {
  fail("Nyrena command chips should stay empty; Star Progression had no command name");
}
if (glossNames(nyrenaCommand).includes("Burn") === false) {
  fail("Nyrena command should gloss Burn");
}
const nyrenaCatalog = catalogFor(nyrena);
if (nyrenaCatalog.namedCount !== 5 || nyrenaCatalog.needsScreenshot) {
  fail("Nyrena habit names from Star Progression should be complete");
}

const bevlorin = getCatalogDragon("bevlorin");
if (!bevlorin) fail("missing Bevlorin");
const bevlorinNames: [number, string, string[], string][] = [
  [1, "Fire Ward", ["Damage Received (per Stack)"], "-5%,-6%,-7%,-8.5%,-10%"],
  [2, "Dragon's Fury", ["Damage Dealt"], "4%,4.8%,5.6%,6.8%,8%"],
  [3, "Renewal", ["Recovery Rate"], "17.5%,21%,24.5%,29.75%,35%"],
  [4, "Vital Essence", ["Strength", "Recovery Dealt"], "10%,12%,14%,17%,20%"],
  [5, "Bountiful Gifts", ["Strength/Intelligence/Instinct/Initiative"], "16%,20.8%,25.6%,32%,40%"],
];
for (const [habit, title, labels, firstValues] of bevlorinNames) {
  const row = insightForSource("bevlorin", { kind: "habit", habit });
  if (!row) fail(`Bevlorin habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Bevlorin habit ${habit} title is ${row.title}, expected ${title}`);
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
const bevlorinFireWard = insightForSource("bevlorin", { kind: "habit", habit: 1 });
if (!/Each Round: If the target Ally retreated/i.test(bevlorinFireWard?.body ?? "")) {
  fail("keep Hub Bevlorin Fire Ward Each Round");
}
if (/At the start of each round, if the target Ally retreated/i.test(bevlorinFireWard?.body ?? "")) {
  fail("do not rewrite Hub Bevlorin Fire Ward Each Round to Arrax At the start of each round");
}
if (!/Fire Damage \(Command & Habits\) Received/i.test(bevlorinFireWard?.body ?? "")) {
  fail("keep Hub Bevlorin Fire Ward Fire Damage (Command & Habits) Received");
}
if (/reduces the target's Fire Damage Received/i.test(bevlorinFireWard?.body ?? "")) {
  fail("do not rewrite Hub Bevlorin Fire Ward Command & Habits to Arrax target's Fire Damage Received");
}
if (!/Received by -5% until the end of combat/i.test(bevlorinFireWard?.body ?? "")) {
  fail("keep Hub Bevlorin Fire Ward -5%");
}
if (/Received by -6% until the end of combat/i.test(bevlorinFireWard?.body ?? "")) {
  fail("do not rewrite Hub Bevlorin Fire Ward -5% to screenshot rank-2 flavor -6%");
}
if (glossNames(bevlorinFireWard).includes("Fire Ward")) {
  fail("Bevlorin Fire Ward Hub already defines the stack; do not duplicate the glossary");
}
if (bevlorinFireWard?.scale.length !== 1) {
  fail(
    `Bevlorin Fire Ward should be one Damage Received (per Stack) row, got ${bevlorinFireWard?.scale.map((row) => row.label).join(", ")}`,
  );
}
const dragonsFury = insightForSource("bevlorin", { kind: "habit", habit: 2 });
if (!/Physical Damage \(Command & Habits\) and Fire Damage Dealt by \+4%/i.test(dragonsFury?.body ?? "")) {
  fail("keep Hub Dragon's Fury Physical Damage (Command & Habits) and Fire Damage Dealt +4%");
}
if (/Physical Damage \(Command & Habits\) and Fire Damage Dealt by \+4\.8%/i.test(dragonsFury?.body ?? "")) {
  fail("do not rewrite Hub Dragon's Fury +4% to screenshot rank-2 flavor +4.8%");
}
if (/At the start of combat/i.test(dragonsFury?.body ?? "")) {
  fail("do not rewrite Hub Dragon's Fury Start of Combat to screenshot At the start of combat");
}
const bevlorinRenewal = insightForSource("bevlorin", { kind: "habit", habit: 3 });
if (!/Odd-numbered rounds: Command apply Recovery/i.test(bevlorinRenewal?.body ?? "")) {
  fail("keep Hub Renewal Command apply Recovery");
}
if (/Nature's Reckoning gains/i.test(bevlorinRenewal?.body ?? "")) {
  fail("do not rewrite Hub Renewal Command apply to Nature's Reckoning gains");
}
if (!/Recovery Rate: \+17\.5%/i.test(bevlorinRenewal?.body ?? "")) {
  fail("keep Hub Renewal Recovery Rate +17.5%");
}
if (/Recovery Rate: \+21%/i.test(bevlorinRenewal?.body ?? "")) {
  fail("do not rewrite Hub Renewal +17.5% to screenshot rank-2 flavor +21%");
}
const vitalEssence = insightForSource("bevlorin", { kind: "habit", habit: 4 });
if (!/Increase your Strength by \+10% and your Recovery Dealt by \+15%/i.test(vitalEssence?.body ?? "")) {
  fail("keep Hub Vital Essence Strength +10% and Recovery Dealt +15%");
}
if (/Increase your Strength by \+12%/i.test(vitalEssence?.body ?? "")) {
  fail("do not rewrite Hub Vital Essence +10% to screenshot rank-2 flavor +12%");
}
if (/At the start of combat/i.test(vitalEssence?.body ?? "")) {
  fail("do not rewrite Hub Vital Essence Start of Combat to screenshot At the start of combat");
}
if (
  vitalEssence?.scale.find((row) => row.label === "Recovery Dealt")?.values.join(",") !==
  "15%,18%,21%,25.5%,30%"
) {
  fail("Vital Essence Recovery Dealt mismatch");
}
const bountifulGifts = insightForSource("bevlorin", { kind: "habit", habit: 5 });
if (!/for 2 rounds/i.test(bountifulGifts?.body ?? "")) {
  fail("keep Hub Bountiful Gifts 2 rounds");
}
if (/2 round\(s\)/i.test(bountifulGifts?.body ?? "")) {
  fail("do not rewrite Hub Bountiful Gifts 2 rounds to screenshot round(s)");
}
if (/enhanced by Intelligence/i.test(bountifulGifts?.body ?? "")) {
  fail("do not copy screenshot enhanced by Intelligence into Hub Bountiful Gifts");
}
if (/the Ally with the highest/i.test(bountifulGifts?.body ?? "")) {
  fail("do not rewrite Hub Bountiful Gifts Ally with highest to screenshot the Ally with the highest");
}
if (bountifulGifts?.scale.some((row) => row.values.join(",") === "20%,20%,20%,20%,20%")) {
  fail("Bountiful Gifts should skip constant 20% chance");
}
if (bountifulGifts?.scale.some((row) => row.label === "Initiative")) {
  fail("Bountiful Gifts should not collapse the four-stat buff to Initiative");
}
if (bountifulGifts?.scale.length !== 1) {
  fail(
    `Bountiful Gifts should be one four-stat row, got ${bountifulGifts?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (findAbilityInsight("Fire Ward", { dragonId: "bevlorin" })?.habit !== 1) {
  fail("hovering Fire Ward on Bevlorin should open habit 1");
}
if (findAbilityInsight("Fire Ward", { dragonId: "arrax" })?.habit !== 4) {
  fail("hovering Fire Ward on Arrax should still open habit 4");
}
if (!/Each Round: If the target Ally retreated/i.test(findAbilityInsight("Fire Ward", { dragonId: "bevlorin" })?.body ?? "")) {
  fail("Bevlorin Fire Ward hover should keep Hub Each Round, not Arrax wording");
}
if (findAbilityInsight("Dragon's Fury", { dragonId: "bevlorin" })?.habit !== 2) {
  fail("hovering Dragon's Fury should open Bevlorin habit 2");
}
if (findAbilityInsight("Renewal", { dragonId: "bevlorin" })?.habit !== 3) {
  fail("hovering Renewal should open Bevlorin habit 3");
}
if (findAbilityInsight("Vital Essence", { dragonId: "bevlorin" })?.habit !== 4) {
  fail("hovering Vital Essence should open Bevlorin habit 4");
}
if (
  findAbilityInsight("Bountiful Gifts", { dragonId: "bevlorin" })?.title !==
  "Bountiful Gifts"
) {
  fail("hovering Bountiful Gifts should open Bevlorin habit 5");
}
const bevlorinCommand = insightForSource("bevlorin", { kind: "command" });
if (!bevlorinCommand) fail("Bevlorin command missing");
if (bevlorinCommand.title !== "Nature's Reckoning") {
  fail(`Bevlorin command title is ${bevlorinCommand.title}, expected Nature's Reckoning`);
}
if (commandHeading("bevlorin") !== "Command · Nature's Reckoning") {
  fail("Bevlorin command heading should be Command · Nature's Reckoning");
}
if (/Nature's Reckoning gains/i.test(bevlorinCommand.body)) {
  fail("do not rewrite Hub Bevlorin command to Nature's Reckoning gains");
}
if (
  findAbilityInsight("Nature's Reckoning", { dragonId: "bevlorin" })?.kind !== "command"
) {
  fail("hovering Nature's Reckoning should open Bevlorin's Command");
}
if (!namedChips(bevlorinCommand).includes("Nature's Reckoning")) {
  fail("Bevlorin command chips should include Nature's Reckoning");
}
const reckoningTone = tokenizeAbilityText("Nature's Reckoning").find(
  (part) => part.value === "Nature's Reckoning",
)?.tone;
if (reckoningTone !== "command") {
  fail(`Nature's Reckoning text tone is ${reckoningTone}, expected command`);
}
if (statusMarkPolarity("Nature's Reckoning") != null) {
  fail("Nature's Reckoning is the Command name, not a buff/debuff mark");
}
const bevlorinCatalog = catalogFor(bevlorin);
if (bevlorinCatalog.namedCount !== 5 || bevlorinCatalog.needsScreenshot) {
  fail("Bevlorin habit names from Star Progression should be complete");
}
if (bevlorinCatalog.command.names.includes("Nature's Reckoning") === false) {
  fail("Dev catalog should list Nature's Reckoning on Bevlorin's Command");
}

const shimmer = getCatalogDragon("shimmer");
if (!shimmer) fail("missing Shimmer");
const shimmerNames: [number, string, string[], string][] = [
  [1, "Crushing Force", ["Damage Dealt"], "9%,10.8%,12.6%,15.3%,18%"],
  [2, "Dragon's Insight", ["Damage Received", "Instinct"], "-4%,-4.8%,-5.6%,-6.8%,-8%"],
  [3, "Loyal Shield", ["Recovery Rate"], "30%,36%,42%,51%,60%"],
  [4, "Unbroken Devotion", ["Recovery Received"], "15%,18%,21%,25.5%,30%"],
  [5, "Sneak Attack", ["Sneak Attack Chance"], "14%,18.2%,22.4%,28%,35%"],
];
for (const [habit, title, labels, firstValues] of shimmerNames) {
  const row = insightForSource("shimmer", { kind: "habit", habit });
  if (!row) fail(`Shimmer habit ${habit} missing`);
  if (row.title !== title) {
    fail(`Shimmer habit ${habit} title is ${row.title}, expected ${title}`);
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
const crushingForce = insightForSource("shimmer", { kind: "habit", habit: 1 });
if (!/Physical Damage Dealt \(Command & Habits\)/i.test(crushingForce?.body ?? "")) {
  fail("keep Hub Crushing Force Physical Damage Dealt (Command & Habits)");
}
if (!/by \+9% for 3 rounds/i.test(crushingForce?.body ?? "")) {
  fail("keep Hub Crushing Force +9% for 3 rounds");
}
if (/by \+10\.8% for 3 rounds/i.test(crushingForce?.body ?? "")) {
  fail("do not rewrite Hub Crushing Force +9% to screenshot rank-2 flavor +10.8%");
}
if (/3 round\(s\)/i.test(crushingForce?.body ?? "")) {
  fail("do not rewrite Hub Crushing Force 3 rounds to screenshot round(s)");
}
if (crushingForce?.scale.length !== 1) {
  fail(
    `Crushing Force should be one Damage Dealt row, got ${crushingForce?.scale.map((row) => row.label).join(", ")}`,
  );
}
const shimmerInsight = insightForSource("shimmer", { kind: "habit", habit: 2 });
if (!/Reduce your Damage Received by -4% and increase your Instinct by \+5%/i.test(shimmerInsight?.body ?? "")) {
  fail("keep Hub Shimmer Dragon's Insight -4% and +5%");
}
if (/Damage Received by -4\.8%/i.test(shimmerInsight?.body ?? "")) {
  fail("do not rewrite Hub Shimmer Dragon's Insight -4% to screenshot rank-2 -4.8%");
}
if (/Instinct by \+6%/i.test(shimmerInsight?.body ?? "")) {
  fail("do not rewrite Hub Shimmer Dragon's Insight +5% to screenshot rank-2 +6%");
}
if (
  shimmerInsight?.scale.find((row) => row.label === "Instinct")?.values.join(",") !==
  "5%,6%,7%,8.5%,10%"
) {
  fail("Shimmer Dragon's Insight Instinct mismatch");
}
const loyalShield = insightForSource("shimmer", { kind: "habit", habit: 3 });
if (!/Rounds 2,4,7,9: Command apply Recovery/i.test(loyalShield?.body ?? "")) {
  fail("keep Hub Loyal Shield Command apply Recovery");
}
if (/Unbreakable Loyalty gains/i.test(loyalShield?.body ?? "")) {
  fail("do not rewrite Hub Loyal Shield Command apply to Unbreakable Loyalty gains");
}
if (!/Recovery Rate: \+30%, enhanced by Instinct/i.test(loyalShield?.body ?? "")) {
  fail("keep Hub Loyal Shield Recovery Rate +30%");
}
if (/Recovery Rate: \+42%/i.test(loyalShield?.body ?? "")) {
  fail("do not rewrite Hub Loyal Shield +30% to screenshot rank-3 flavor +42%");
}
if (loyalShield?.scale.some((row) => row.values.join(",") === "60%,72%,84%,102%,120%")) {
  fail("Loyal Shield should skip doubled Resistance Recovery Rate");
}
if (loyalShield?.scale.length !== 1) {
  fail(
    `Loyal Shield should be one Recovery Rate row, got ${loyalShield?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (glossNames(loyalShield).includes("Resistance") === false) {
  fail("Loyal Shield should gloss Resistance");
}
const shimmerUnbroken = insightForSource("shimmer", { kind: "habit", habit: 4 });
if (!/Increase Recovery Received by \+15% of 2 other Allies/i.test(shimmerUnbroken?.body ?? "")) {
  fail("keep Hub Shimmer Unbroken Devotion +15%");
}
if (/Increase Recovery Received by \+18%/i.test(shimmerUnbroken?.body ?? "")) {
  fail("do not rewrite Hub Shimmer Unbroken Devotion +15% to screenshot rank-2 flavor +18%");
}
const sneakAttack = insightForSource("shimmer", { kind: "habit", habit: 5 });
if (!/14% chance to increase Physical Damage Dealt by \+10%/i.test(sneakAttack?.body ?? "")) {
  fail("keep Hub Sneak Attack 14% chance and +10%");
}
if (/18\.2% chance/i.test(sneakAttack?.body ?? "")) {
  fail("do not rewrite Hub Sneak Attack 14% to screenshot rank-2 flavor 18.2%");
}
if (!/for 2 rounds/i.test(sneakAttack?.body ?? "")) {
  fail("keep Hub Sneak Attack 2 rounds");
}
if (/2 round\(s\)/i.test(sneakAttack?.body ?? "")) {
  fail("do not rewrite Hub Sneak Attack 2 rounds to screenshot round(s)");
}
if (!/the other Ally with the highest Strength/i.test(sneakAttack?.body ?? "")) {
  fail("keep Hub Sneak Attack the other Ally");
}
if (!/First-Strike causes the target to attack before all other combatants each round/i.test(sneakAttack?.body ?? "")) {
  fail("keep Hub Sneak Attack First-Strike attack sentence");
}
if (sneakAttack?.scale.some((row) => row.values.join(",") === "10%,10%,10%,10%,10%")) {
  fail("Sneak Attack should skip constant Physical Damage Dealt +10%");
}
if (sneakAttack?.scale.some((row) => row.label === "First-Strike Chance")) {
  fail("Sneak Attack chance row should be Sneak Attack Chance, not First-Strike Chance");
}
if (sneakAttack?.scale.length !== 1) {
  fail(
    `Sneak Attack should be one chance row, got ${sneakAttack?.scale.map((row) => row.label).join(", ")}`,
  );
}
if (glossNames(sneakAttack).includes("First-Strike")) {
  fail("Sneak Attack already explains First-Strike; do not duplicate the glossary");
}
if (findAbilityInsight("Crushing Force", { dragonId: "shimmer" })?.habit !== 1) {
  fail("hovering Crushing Force should open Shimmer habit 1");
}
if (findAbilityInsight("Dragon's Insight", { dragonId: "shimmer" })?.habit !== 2) {
  fail("hovering Dragon's Insight on Shimmer should open habit 2");
}
if (findAbilityInsight("Dragon's Insight", { dragonId: "kalspire" })?.habit !== 4) {
  fail("hovering Dragon's Insight on Kalspire should still open habit 4");
}
if (
  findAbilityInsight("Dragon's Insight", { dragonId: "shimmer" })?.scale.find(
    (row) => row.label === "Damage Received",
  )?.values.join(",") !== "-4%,-4.8%,-5.6%,-6.8%,-8%"
) {
  fail("Shimmer Dragon's Insight should keep -4% scale, not Kalspire -6%");
}
if (findAbilityInsight("Loyal Shield", { dragonId: "shimmer" })?.habit !== 3) {
  fail("hovering Loyal Shield should open Shimmer habit 3");
}
if (findAbilityInsight("Unbroken Devotion", { dragonId: "shimmer" })?.habit !== 4) {
  fail("hovering Unbroken Devotion on Shimmer should open habit 4");
}
if (findAbilityInsight("Unbroken Devotion", { dragonId: "dawnseeker" })?.habit !== 2) {
  fail("hovering Unbroken Devotion on Dawnseeker should still open habit 2");
}
if (findAbilityInsight("Unbroken Devotion", { dragonId: "rhysarion" })?.habit !== 4) {
  fail("hovering Unbroken Devotion on Rhysarion should still open habit 4");
}
if (
  findAbilityInsight("Unbroken Devotion", { dragonId: "rhysarion" })?.scale.find(
    (row) => row.label === "Recovery Received",
  )?.values.join(",") !== "20%,24%,28%,34%,40%"
) {
  fail("Rhysarion Unbroken Devotion should keep +20% scale, not Shimmer +15%");
}
if (findAbilityInsight("Sneak Attack", { dragonId: "shimmer" })?.title !== "Sneak Attack") {
  fail("hovering Sneak Attack should open Shimmer habit 5");
}
const shimmerCommand = insightForSource("shimmer", { kind: "command" });
if (!shimmerCommand) fail("Shimmer command missing");
if (shimmerCommand.title !== "Unbreakable Loyalty") {
  fail(`Shimmer command title is ${shimmerCommand.title}, expected Unbreakable Loyalty`);
}
if (commandHeading("shimmer") !== "Command · Unbreakable Loyalty") {
  fail("Shimmer command heading should be Command · Unbreakable Loyalty");
}
if (/Unbreakable Loyalty gains/i.test(shimmerCommand.body)) {
  fail("do not rewrite Hub Shimmer command to Unbreakable Loyalty gains");
}
if (
  findAbilityInsight("Unbreakable Loyalty", { dragonId: "shimmer" })?.kind !== "command"
) {
  fail("hovering Unbreakable Loyalty should open Shimmer's Command");
}
if (!namedChips(shimmerCommand).includes("Unbreakable Loyalty")) {
  fail("Shimmer command chips should include Unbreakable Loyalty");
}
const loyaltyTone = tokenizeAbilityText("Unbreakable Loyalty").find(
  (part) => part.value === "Unbreakable Loyalty",
)?.tone;
if (loyaltyTone !== "command") {
  fail(`Unbreakable Loyalty text tone is ${loyaltyTone}, expected command`);
}
if (statusMarkPolarity("Unbreakable Loyalty") != null) {
  fail("Unbreakable Loyalty is the Command name, not a buff/debuff mark");
}
const shimmerCatalog = catalogFor(shimmer);
if (shimmerCatalog.namedCount !== 5 || shimmerCatalog.needsScreenshot) {
  fail("Shimmer habit names from Star Progression should be complete");
}
if (shimmerCatalog.command.names.includes("Unbreakable Loyalty") === false) {
  fail("Dev catalog should list Unbreakable Loyalty on Shimmer's Command");
}
const shimmerFirstStrike = findAbilityInsight("First-Strike", { dragonId: "shimmer" });
if (
  shimmerFirstStrike?.dragonName !== "Shimmer" ||
  shimmerFirstStrike.unlockStars !== 10
) {
  fail(
    `First-Strike on Shimmer should be 10★ Sneak Attack, got ${shimmerFirstStrike?.dragonName} ${shimmerFirstStrike?.unlockStars}`,
  );
}
if (!/act before all other combatants/i.test(shimmerFirstStrike?.body ?? "")) {
  fail(`First-Strike glossary missing Star Progression line: ${shimmerFirstStrike?.body}`);
}
if (/attack before all other combatants/i.test(shimmerFirstStrike?.body ?? "")) {
  fail("do not rewrite First-Strike glossary act to Sneak Attack Hub attack");
}
const shimmerResistance = findAbilityInsight("Resistance", { dragonId: "shimmer" });
if (
  shimmerResistance?.neededBy?.dragonName !== "Shimmer" ||
  shimmerResistance.neededBy.gates.some((gate) => gate.stars === 6) === false
) {
  fail(
    `Resistance on Shimmer should need 6★ Loyal Shield, got ${JSON.stringify(shimmerResistance?.neededBy)}`,
  );
}

const weakened = findAbilityInsight("Weakened", { dragonId: "vhagar" });
if (!weakened || weakened.title !== "Weakened" || weakened.kind !== "buff") {
  fail(`Weakened hover opened ${weakened?.kind}:${weakened?.title}`);
}
if (weakened.polarity !== "debuff") fail("Weakened is a debuff");
if (!/Damage Dealt/i.test(weakened.body) || !/reduces/i.test(weakened.body)) {
  fail(`Weakened glossary missing Star Progression line: ${weakened.body}`);
}
if (weakened.dragonName !== "Vhagar" || weakened.unlockStars !== 6) {
  fail(
    `Weakened on Vhagar should be 6★ Eclipse Cover, got ${weakened.dragonName} ${weakened.unlockStars}`,
  );
}

const burn = findAbilityInsight("Burn", { dragonId: "caraxes" });
if (!burn || burn.title !== "Burn" || burn.kind !== "buff") {
  fail(`Burn hover opened ${burn?.kind}:${burn?.title}`);
}
if (burn.polarity !== "debuff") fail("Burn is a debuff");
if (!/Fire Damage/i.test(burn.body) || !/each round/i.test(burn.body)) {
  fail(`Burn glossary missing Star Progression line: ${burn.body}`);
}
const slow = findAbilityInsight("Slow", { dragonId: "caraxes" });
if (!slow || slow.title !== "Slow" || slow.kind !== "buff") {
  fail(`Slow hover opened ${slow?.kind}:${slow?.title}`);
}
if (slow.polarity !== "debuff") fail("Slow is a debuff");
if (!/attack after all other combatants/i.test(slow.body)) {
  fail(`Slow glossary missing Star Progression line: ${slow.body}`);
}
if (
  glossNames(insightForSource("caraxes", { kind: "habit", habit: 3 })).includes(
    "Burn",
  ) === false ||
  glossNames(insightForSource("caraxes", { kind: "habit", habit: 3 })).includes(
    "Slow",
  ) === false
) {
  fail("Crippling Inferno should gloss Slow and Burn");
}

const stun = findAbilityInsight("Stun", { dragonId: "kalspire" });
if (!stun || stun.title !== "Stun" || stun.kind !== "buff") {
  fail(`Stun hover opened ${stun?.kind}:${stun?.title}`);
}
if (stun.polarity !== "debuff") fail("Stun is a debuff");
if (!/Basic Attacks/i.test(stun.body) || !/Commands and Habits/i.test(stun.body)) {
  fail(`Stun glossary missing Star Progression line: ${stun.body}`);
}
if (glossNames(insightForSource("kalspire", { kind: "habit", habit: 5 })).includes("Stun") === false) {
  fail("Radiant Conqueror should gloss Stun");
}

const panic = findAbilityInsight("Panic", { dragonId: "kalspire" });
if (!panic || panic.title !== "Panic" || panic.kind !== "buff") {
  fail(`Panic hover opened ${panic?.kind}:${panic?.title}`);
}
if (panic.polarity !== "debuff") fail("Panic is a debuff");
if (!/Tactical Damage/i.test(panic.body) || !/each round/i.test(panic.body)) {
  fail(`Panic glossary missing Star Progression line: ${panic.body}`);
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
if (firstStrike.dragonName !== "Malachite" || firstStrike.unlockStars !== 10) {
  fail(
    `First-Strike on Malachite should be 10★ Lightning Strike, got ${firstStrike.dragonName} ${firstStrike.unlockStars}`,
  );
}
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
if (advantage.dragonName !== "Malachite") {
  fail(`Advantage on Malachite should be Malachite’s grant, got ${advantage.dragonName}`);
}
if (advantage.unlockStars !== 6) {
  fail(`Malachite Advantage unlocks at 6★, got ${advantage.unlockStars}`);
}

const moonAdvantage = findAbilityInsight("Advantage", { dragonId: "moondancer" });
if (!moonAdvantage) fail("Advantage hover from Moondancer missing");
if (moonAdvantage.dragonName === "Moondancer") {
  fail("Moondancer does not grant Advantage");
}
if (
  !moonAdvantage.grantedBy?.some(
    (grant) => grant.dragonId === "malachite" && grant.unlockStars === 6,
  )
) {
  fail(
    `Advantage from Moondancer should name Malachite 6★, got ${JSON.stringify(moonAdvantage.grantedBy)}`,
  );
}
if (
  !moonAdvantage.neededBy ||
  moonAdvantage.neededBy.dragonName !== "Moondancer" ||
  !moonAdvantage.neededBy.gates.some((gate) => gate.stars === 2 && gate.habitName === "New Moon")
) {
  fail(
    `Moondancer should need Advantage from New Moon 2★, got ${JSON.stringify(moonAdvantage.neededBy)}`,
  );
}
if (!moonAdvantage.neededBy.gates.some((gate) => gate.stars === 6 && gate.habitName === "Full Moon")) {
  fail("Full Moon 6★ also wants Advantage on an ally");
}

const moonCatalog = catalogFor(moondancer);
if (moonCatalog.buffs.some((row) => /advantage/i.test(row.name))) {
  fail("Moondancer buffs must not list Advantage");
}
if (moonCatalog.dragon.tags.includes("Advantage")) {
  fail("Moondancer tags must not treat Advantage as a grant");
}
const moonTide = moonCatalog.buffs.find((row) => row.name === "Rising Tide");
if (!moonTide || moonTide.unlockStars !== null) {
  fail(`Rising Tide is a Command buff, got ${moonTide?.unlockStars}`);
}
const moonBlade = moonCatalog.buffs.find((row) => row.name === "Crescent Blade");
if (!moonBlade || moonBlade.unlockStars !== null) {
  fail(`Crescent Blade is a Command spreading buff, got ${moonBlade?.unlockStars}`);
}

const malachiteDragon = getCatalogDragon("malachite");
if (!malachiteDragon) fail("missing Malachite");
const malCatalog = catalogFor(malachiteDragon);
const malAdv = malCatalog.buffs.find((row) => row.name === "Advantage");
if (!malAdv) fail("Malachite buffs should list Advantage");
if (malAdv.unlockStars !== 6) {
  fail(`Malachite Advantage should be 6★, got ${malAdv.unlockStars}`);
}
if (!malCatalog.dragon.tags.includes("Advantage")) {
  fail("Malachite should keep the Advantage tag");
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
if (crescent.polarity !== "spread") {
  fail(`Crescent Blade is a spreading buff, got ${crescent.polarity}`);
}
if (crescent.spreadTo !== "1 Ally Sentinel") {
  fail(`Crescent Blade should name the ally it spreads to, got ${crescent.spreadTo}`);
}
if (/^Grant Crescent Blade/i.test(crescent.body)) {
  fail(`Crescent Blade card should not be the Command grant line: ${crescent.body}`);
}
if (!/^When this target deals Tactical Damage/i.test(crescent.body)) {
  fail(`Crescent Blade body should be the ally ability: ${crescent.body}`);
}
if (!/Rising Tide/i.test(crescent.body) || !/Max 8 stacks/i.test(crescent.body)) {
  fail(`Crescent Blade should feed Rising Tide: ${crescent.body}`);
}
if (!/Physical Damage/i.test(crescent.body) || !/Even-numbered Rounds/i.test(crescent.body)) {
  fail(`Crescent Blade should include Physical Damage: ${crescent.body}`);
}
if (!/Crescent Blade gains:/i.test(crescent.body) || !/\+85%/.test(crescent.body)) {
  fail(`Crescent Blade should include the gains line: ${crescent.body}`);
}
if (/Each stack of Rising Tide/i.test(crescent.body)) {
  fail(`Rising Tide's self-stack line belongs on Rising Tide, not Crescent Blade: ${crescent.body}`);
}
if (crescent.scale.find((row) => row.values[0] === "85%") == null) {
  fail(`Crescent Blade should scale Physical Damage from habit ranks: ${JSON.stringify(crescent.scale)}`);
}

const wrath = findAbilityInsight("Infectious Wrath", { dragonId: "seasmoke" });
if (wrath?.kind !== "habit" || wrath.title !== "Infectious Wrath") {
  fail(`Infectious Wrath must stay the habit card: ${wrath?.kind}:${wrath?.title}`);
}
if (!/Each stack of Infectious Wrath/i.test(wrath.body)) {
  fail("Infectious Wrath habit should keep the Hub stack definition");
}

const erosion = findAbilityInsight("Steady Erosion", { dragonId: "solstryker" });
if (erosion?.kind !== "buff") {
  fail(`Steady Erosion should extract as a stack: ${erosion?.kind}:${erosion?.title}`);
}
if (erosion.polarity !== "debuff") {
  fail(`Steady Erosion should be a debuff: ${erosion.body}`);
}

const moonCommand = insightForSource("moondancer", { kind: "command" });
if (!moonCommand) fail("Moondancer command missing");
if (moonCommand.title !== "Command") {
  fail(`Moondancer command card title should be Command, got ${moonCommand.title}`);
}
if (!/^Round 1: Grant Crescent Blade/i.test(moonCommand.body)) {
  fail(`Moondancer command should keep the Hub grant line: ${moonCommand.body}`);
}
const moonCommandChips = namedChips(moonCommand);
if (!moonCommandChips.includes("Crescent Blade")) {
  fail(`Command chips missing Crescent Blade: ${moonCommandChips.join(", ")}`);
}
if (!moonCommandChips.includes("Rising Tide")) {
  fail(`Command chips missing Rising Tide: ${moonCommandChips.join(", ")}`);
}
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

const crescentTone = tokenizeAbilityText("Grant Crescent Blade").find(
  (part) => part.value === "Crescent Blade",
)?.tone;
if (crescentTone !== "spread") {
  fail(`Crescent Blade text tone is ${crescentTone}, expected spread`);
}
const overwhelmTone = tokenizeAbilityText("afflict Overwhelm").find(
  (part) => part.value === "Overwhelm",
)?.tone;
if (overwhelmTone !== "debuff") {
  fail(`Overwhelm text tone is ${overwhelmTone}, expected debuff`);
}

if (namedStatusPolarity("Advantage") !== "buff") fail("Advantage mark is a buff");
if (namedStatusPolarity("Overwhelm") !== "debuff") fail("Overwhelm mark is a debuff");
if (namedStatusPolarity("Stun") !== "debuff") fail("Stun mark is a debuff");
if (namedStatusPolarity("Panic") !== "debuff") fail("Panic mark is a debuff");
if (namedStatusPolarity("Bleed") !== "debuff") fail("Bleed mark is a debuff");
if (namedStatusPolarity("Crescent Blade") !== "spread") {
  fail("Crescent Blade mark is a spreading buff");
}
if (namedStatusPolarity("Physical Damage") != null) {
  fail("Physical Damage is not a buff/debuff mark");
}
if (namedStatusPolarity("+8%") != null) fail("percents are not named statuses");
if (statusMarkPolarity("Rising Tide") !== "buff") {
  fail("Rising Tide in habit text should get a buff arrow");
}
if (statusMarkPolarity("Advantage") !== "buff") {
  fail("Advantage in habit text should get a buff arrow");
}
if (statusMarkPolarity("Physical Damage") != null) {
  fail("stat names should not get buff arrows");
}

const moon = getCatalogDragon("moondancer");
if (!moon) fail("missing Moondancer");
const newMoon1 = habitText("moondancer", 0, 1);
const newMoon5 = habitText("moondancer", 0, 5);
if (!newMoon1.includes("25% chance to gain")) {
  fail(`Moondancer New Moon rank 1 should be 25%: ${newMoon1.slice(0, 80)}`);
}
if (!newMoon5.includes("50% chance to gain")) {
  fail(`Moondancer New Moon rank 5 should be 50%: ${newMoon5.slice(0, 80)}`);
}
if (newMoon1 === newMoon5) fail("habit rank 1 and 5 text must differ");
const kitRank5 = dragonKit(moon, [5, 1, 1, 1, 1]);
const newMoonBody = kitRank5.extras[0]?.body ?? "";
if (!newMoonBody.includes("50% chance to gain")) {
  fail("dragonKit should use selected habit ranks for percents");
}
if (normalizeHabitRanks(undefined).join(",") !== "1,1,1,1,1") {
  fail("old saves without habitRanks stay on rank 1");
}
if (normalizeHabitRanks([5, 0, 9]).join(",") !== "5,1,5,1,1") {
  fail("habit ranks clamp to 1–5 and pad to five slots");
}
if (habitRankOf([3, 2, 1, 1, 1], 1) !== 3) fail("habitRankOf slot 1");
const migrated = normalizePitState({
  version: 2,
  owned: [
    {
      id: "own-test",
      dragonId: "moondancer",
      starRank: 10,
      reignLevel: 1,
      notes: "",
      habits: [1, 2, 3, 4, 5],
    },
  ],
  customDragons: [],
  lineups: [],
  teams: [],
});
if (!migrated || migrated.owned[0]?.habitRanks.join(",") !== "1,1,1,1,1") {
  fail("migrating a v2 pit without habitRanks should default to rank 1");
}

const oddShort =
  "Gain 1 stack of Rising Tide (50% or 100% chance w/ Ally has Advantage) (rounds 1,3,5) | Instinct (+18% or 27% w/ 4+ stacks of Rising Tide) & Tactical Dmg (+12% or 18% w/ 4+ stacks of Rising Tide) to 1 Ally Sentinel for 2 rounds (Odd Rounds)";
const oddFormatted = formatRoundTimingSentences(oddShort);
if (/\(Odd Rounds\)/i.test(oddFormatted)) {
  fail(`Odd Rounds should not stay a trailing aside: ${oddFormatted}`);
}
if (!/\. Odd-numbered Rounds: Instinct /i.test(oddFormatted)) {
  fail(`Odd-numbered Rounds should start a sentence: ${oddFormatted}`);
}
if (formatRoundTimingSentences(oddFormatted) !== oddFormatted) {
  fail("round-timing formatter should be stable");
}
const evenPipe = formatRoundTimingSentences(
  "Each Round: Taunt 3 Enemies (25% chance) (2 rounds) | Even Rounds: Physical Dmg +120% to 1 Enemy adjacency",
);
if (!evenPipe.includes(". Even-numbered Rounds: Physical Dmg")) {
  fail(`Even-numbered Rounds should start a sentence after a pipe: ${evenPipe}`);
}
const startOf = "Start of Odd-numbered Rounds: 25% chance to increase your Fire Damage Dealt.";
if (formatRoundTimingSentences(startOf) !== startOf) {
  fail(`do not split Start of Odd-numbered Rounds: ${formatRoundTimingSentences(startOf)}`);
}
const moonShort = habitText("moondancer", 0, 5, true);
if (!/\. Odd-numbered Rounds:/i.test(moonShort) || /\(Odd Rounds\)/i.test(moonShort)) {
  fail(`Moondancer New Moon short should open Odd-numbered as a sentence: ${moonShort}`);
}
const moonCommandText = commandLine(moon);
if (!/\. Even-numbered Rounds: Deal Physical Damage/i.test(moonCommandText)) {
  fail(`Moondancer Command should keep Even-numbered as its own sentence: ${moonCommandText}`);
}
if (/\.\s*Even-numbered Rounds/.test(moonCommandText) === false) {
  fail("Moondancer Command Even-numbered clause must follow a period");
}

console.log("ability insight checks passed");
