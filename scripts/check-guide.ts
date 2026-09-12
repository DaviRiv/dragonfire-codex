import { HUB_SCALING } from "@/data/hub-source";
import {
  GUIDE_SECTIONS,
  HABIT_GATES,
  HABIT_RANKS,
  HABIT_SLOTS,
  LEVEL_CAP,
  MAX_STARS,
  RARITY_SCALING,
  TROOPS_MAX,
  TROOPS_PER_LEVEL,
  kitLine,
  levelThatCapsTroops,
  starStatBonusPct,
  workedExample,
} from "@/lib/guide";
import type { KitSlot } from "@/lib/guide";
import { STATUS_GLOSSARY } from "@/data/status-glossary";
import { dragonPower, troopCount } from "@/lib/scale-stats";

/**
 * The guide quotes real numbers. This asserts the helpers it reads them
 * through still agree with the raw Hub tables, so a catalog resync cannot
 * leave the prose stating something the data no longer says.
 */

let failed = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) return;
  failed++;
  console.error(`FAIL ${label}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
}

check(
  "troops per level matches table",
  TROOPS_PER_LEVEL === HUB_SCALING.troops.basePerLevel,
  TROOPS_PER_LEVEL,
);
check("troop cap matches table", TROOPS_MAX === HUB_SCALING.troops.maxTroops, TROOPS_MAX);
check("level cap matches table", LEVEL_CAP === HUB_SCALING.troops.maxLevel, LEVEL_CAP);

// Star bonuses must rise with rarity, or the guide's advice to chase stars on
// your best dragon first is wrong.
const legend = starStatBonusPct("legendary", MAX_STARS);
const epic = starStatBonusPct("epic", MAX_STARS);
const rare = starStatBonusPct("rare", MAX_STARS);
check("legendary star bonus beats epic", legend > epic, { legend, epic });
check("epic star bonus beats rare", epic > rare, { epic, rare });

for (const row of RARITY_SCALING) {
  check(
    `${row.rarity} star bonus is positive`,
    row.maxStatBonusPct > 0,
    row.maxStatBonusPct,
  );
  check(
    `${row.rarity} power grows with stars`,
    row.powerAtMaxStar > row.powerAtOneStar,
    row,
  );
  check(
    `${row.rarity} star bonus is monotonic`,
    Array.from({ length: MAX_STARS }, (_, i) =>
      starStatBonusPct(row.rarity, i + 1),
    ).every((v, i, all) => i === 0 || v >= all[i - 1]),
  );
}

// The guide sets the two star tables side by side and says they differ. If a
// resync made them equal, that whole panel would be pointless noise.
for (const row of RARITY_SCALING) {
  check(
    `${row.rarity} troop bonus differs from its stat bonus`,
    row.maxTroopBonusPct !== row.maxStatBonusPct,
    row,
  );
  check(
    `${row.rarity} troop bonus is smaller than its stat bonus`,
    row.maxTroopBonusPct < row.maxStatBonusPct,
    row,
  );
}

// The guide claims high stars reach the troop cap before the level cap.
const capAtMax = levelThatCapsTroops("legendary", MAX_STARS);
const capAtOne = levelThatCapsTroops("legendary", 1);
check("max stars caps troops early", capAtMax !== null && capAtMax < LEVEL_CAP, capAtMax);
check("one star needs the level cap", capAtOne === LEVEL_CAP, capAtOne);
check(
  "troops never exceed the cap",
  troopCount("legendary", MAX_STARS, LEVEL_CAP) === TROOPS_MAX,
  troopCount("legendary", MAX_STARS, LEVEL_CAP),
);

// The worked example is the guide's one concrete "before and after".
const example = workedExample("vhagar");
check("worked example resolves", example !== null);
if (example) {
  check("example grows every stat", example.stats.every((s) => s.grown > s.base), example.stats);
  check("example reaches the troop cap", example.troopsAfter === TROOPS_MAX, example.troopsAfter);
  check("example stat multiple is meaningful", example.statMultiple >= 2, example.statMultiple);
}

// The guide now says habit power exists in the catalog but is left out of the
// power this site shows. Both halves have to stay true: the table has to be
// there, and dragonPower has to keep ignoring it.
const habitPower = HUB_SCALING.power?.habits;
check("catalog publishes habit power", Boolean(habitPower), Object.keys(habitPower ?? {}));
if (habitPower) {
  const slots = Object.values(habitPower).flatMap((byRarity) =>
    Object.values(byRarity as Record<string, number[]>),
  );
  check("habit power tables are populated", slots.length > 0 && slots.every((row) => Array.isArray(row) && row.some((v) => v > 0)), slots.length);
}
check(
  "Hub power ignores habit ranks",
  dragonPower("legendary", MAX_STARS, LEVEL_CAP) ===
    HUB_SCALING.power.stars.legend[String(MAX_STARS)] +
      HUB_SCALING.power.levels.legend[String(LEVEL_CAP)],
  dragonPower("legendary", MAX_STARS, LEVEL_CAP),
);

check("habit slots match unlock gates", HABIT_SLOTS === HABIT_GATES.length, HABIT_SLOTS);
check("habit gates are within star range", HABIT_GATES.every((s) => s >= 1 && s <= MAX_STARS), HABIT_GATES);
check("habit ranks are positive", HABIT_RANKS > 0, HABIT_RANKS);

// Section ids drive in-page anchors, so duplicates would break navigation.
const ids = GUIDE_SECTIONS.map((s) => s.id);
check("section ids are unique", new Set(ids).size === ids.length, ids);
const keywords = Object.keys(STATUS_GLOSSARY);
check("glossary has entries", keywords.length > 0, keywords.length);

// The guide explains mitigation through these keyword lines, so it breaks if
// the glossary stops naming them or changes what they say.
check("Resistance reduces damage received", /reduces .*damage received/i.test(STATUS_GLOSSARY.Resistance ?? ""), STATUS_GLOSSARY.Resistance);
check("Vulnerable increases damage received", /increases .*damage received/i.test(STATUS_GLOSSARY.Vulnerable ?? ""), STATUS_GLOSSARY.Vulnerable);
check("Taunt redirects basic attacks", /basic attacks/i.test(STATUS_GLOSSARY.Taunt ?? ""), STATUS_GLOSSARY.Taunt);

// Every ability the guide quotes, and the phrase the surrounding prose leans
// on. A resync that moves a habit between slots would otherwise leave the page
// explaining a quote that no longer says what it claims.
const QUOTES: { slot: KitSlot; dragon: string; expect: RegExp }[] = [
  { dragon: "vhagar", slot: { kind: "vanguard" }, expect: /Left Flank/i },
  { dragon: "vhagar", slot: { kind: "command" }, expect: /Taunt/i },
  {
    dragon: "vhagar",
    slot: { kind: "habit", habit: 5, rank: 1 },
    expect: /Bulwark/i,
  },
  {
    dragon: "vhagar",
    slot: { kind: "habit", habit: 5, rank: HABIT_RANKS },
    expect: /Bulwark/i,
  },
  {
    dragon: "rhysarion",
    slot: { kind: "habit", habit: 3, rank: 1 },
    expect: /enhanced by Intelligence/i,
  },
  {
    dragon: "kalspire",
    slot: { kind: "habit", habit: 2, rank: 1 },
    expect: /enhanced by Instinct/i,
  },
];

for (const { dragon, slot, expect } of QUOTES) {
  const line = kitLine(dragon, slot);
  const label = `${dragon} ${slot.kind}${slot.kind === "habit" ? ` ${slot.habit}/${slot.rank}` : ""}`;
  check(`${label} resolves`, line !== null);
  if (line) {
    check(`${label} still says ${expect.source}`, expect.test(line.text), line.text);
  }
}

// "What to do first" tells you a tactical dealer belongs Left and a physical
// one Right because Vhagar's two abilities genuinely name opposite flanks.
// If a resync aligned them, that advice would become nonsense.
const vanguard = kitLine("vhagar", { kind: "vanguard" });
const flankHabit = kitLine("vhagar", { kind: "habit", habit: 2, rank: 1 });
check(
  "Vhagar's Vanguard skill still feeds Tactical damage Left",
  /Tactical Damage Dealt/i.test(vanguard?.text ?? "") &&
    /Left Flank/i.test(vanguard?.text ?? ""),
  vanguard?.text,
);
check(
  "Vhagar's habit 2 still prioritises Physical damage Right",
  /Physical Damage Dealt/i.test(flankHabit?.text ?? "") &&
    /Right Flank/i.test(flankHabit?.text ?? ""),
  flankHabit?.text,
);

// The rank-1 versus rank-max comparison only teaches anything if they differ.
const rank1 = kitLine("vhagar", { kind: "habit", habit: 5, rank: 1 });
const rankMax = kitLine("vhagar", { kind: "habit", habit: 5, rank: HABIT_RANKS });
check(
  "habit rank 1 and rank max differ",
  Boolean(rank1 && rankMax && rank1.text !== rankMax.text),
);

check("missing dragon yields no quote", kitLine("not-a-dragon", { kind: "command" }) === null);
check(
  "missing habit slot yields no quote",
  kitLine("vhagar", { kind: "habit", habit: 99 }) === null,
);

if (failed) {
  console.error(`\ncheck-guide: ${failed} failed`);
  process.exit(1);
}
console.log(
  `check-guide ok — ${GUIDE_SECTIONS.length} sections, ${keywords.length} keywords, ` +
    `legendary +${legend}% at ${MAX_STARS}★, troop cap ${TROOPS_MAX} at level ${capAtMax}`,
);
