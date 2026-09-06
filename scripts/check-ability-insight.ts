/**
 * Ability insight extraction. Run: npx tsx --tsconfig tsconfig.json scripts/check-ability-insight.ts
 */
import { getCatalogDragon } from "@/data/dragons";
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
