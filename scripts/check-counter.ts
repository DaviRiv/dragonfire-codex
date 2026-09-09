/**
 * Counter tab: troop triangle + Recovery answers.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-counter.ts
 */
import { choicesAgainstEnemy, defaultTroopsForEnemy } from "@/lib/counter-choices";
import {
  dragonPickScore,
  filterDragonPicks,
  starsForCounterPick,
} from "@/lib/counter-pick";
import { analyzeEnemy } from "@/lib/counter";
import { emptyPit } from "@/lib/dragons";
import { DRAGONS } from "@/data/dragons";
import {
  defaultCounterTroop,
  troopMatchup,
  troopsThatBeat,
} from "@/lib/labels";
import {
  assertLineBook,
  communityCounterTroop,
  communityEnemyTroop,
} from "@/lib/line-book";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

function seatsOf(line: {
  left: string;
  vanguard: string;
  right: string;
}): string[] {
  return [line.left, line.vanguard, line.right];
}

function hasIds(
  line: { left: string; vanguard: string; right: string },
  ids: string[],
): boolean {
  const seats = seatsOf(line);
  return ids.every((id) => seats.includes(id));
}

assert(
  troopsThatBeat("shieldbearers").includes("cavalry"),
  "Cavalry beat Shields",
);
assert(
  defaultCounterTroop("shieldbearers") === "cavalry",
  "default counter to Shields is Cavalry",
);
assert(
  defaultCounterTroop("cavalry") === "spearmen",
  "default counter to Cavalry is Spears",
);
assert(
  defaultCounterTroop("archers") === "shieldbearers",
  "default counter to Archers is Shields",
);
assert(
  defaultCounterTroop("spearmen") === "archers",
  "default counter to Spears is Archers",
);
assert(
  troopsThatBeat("siege").every((troop) => troop !== "siege"),
  "Siege loses to every other troop",
);
assert(troopMatchup("cavalry", "shieldbearers") === "beats", "cav vs shields");
assert(troopMatchup("shieldbearers", "cavalry") === "loses", "shields vs cav");
assert(troopMatchup("cavalry", "cavalry") === "even", "even cav");
assert(troopMatchup("cavalry", "siege") === "beats", "any troop beats siege");
assert(troopMatchup("siege", "cavalry") === "siege", "siege is always down");

const bookErrors = assertLineBook();
assert(bookErrors.length === 0, bookErrors.join("; "));

assert(
  communityEnemyTroop(["malachite", "venator", "vhagar"]) === "shieldbearers",
  "online DPS core is Shieldbearers regardless of seat order",
);
assert(
  communityCounterTroop(["malachite", "vhagar", "venator"], "shieldbearers") ===
    "cavalry",
  "community answer to the DPS core is Cavalry",
);
assert(
  communityCounterTroop(["malachite", "vhagar", "moondancer"], "shieldbearers") ===
    "cavalry",
  "community answer to the Moon line is Cavalry",
);
assert(
  communityCounterTroop(["syrax", "vaeldra", "caraxes"], "spearmen") ===
    "shieldbearers",
  "community answer to the Spear core is Shields, not the tile Archers",
);
assert(
  communityCounterTroop(["seasmoke", "thunderstrike", "sheepstealer"], "cavalry") ===
    "spearmen",
  "community answer to Seasmoke Cavalry is Spears",
);
assert(
  defaultTroopsForEnemy(["syrax", "vaeldra", "caraxes"]).ours === "shieldbearers",
  "seating the Spear core opens You on Shields",
);
assert(
  defaultTroopsForEnemy(["malachite", "vhagar", "venator"]).ours === "cavalry",
  "seating the DPS core opens You on Cavalry",
);

const shieldsCore = {
  left: "malachite",
  vanguard: "vhagar",
  right: "venator",
  leftStars: 6,
  vanguardStars: 6,
  rightStars: 6,
  troop: "shieldbearers" as const,
};

const profile = analyzeEnemy(shieldsCore);
assert(
  profile.healers.some((row) => row.dragon.id === "malachite"),
  "★6 Malachite Command Recovery is live",
);
assert(
  profile.tanks.some((row) => row.dragon.id === "vhagar"),
  "★6 Vhagar Taunt is live",
);

const cav = choicesAgainstEnemy({
  enemy: shieldsCore,
  troop: "cavalry",
  state: emptyPit(),
  limit: 12,
});
assert(cav.length >= 6, `expected 6+ cavalry counters, got ${cav.length}`);
assert(
  cav.every((choice) => choice.line.troop === "cavalry"),
  "lockTroop must keep every counter on Cavalry",
);
assert(
  cav.every((choice) => {
    const ids = seatsOf(choice.line);
    return !ids.some((id) => ["malachite", "vhagar", "venator"].includes(id));
  }),
  "do not seat their dragons on the counter march",
);
assert(
  cav[0].line.left === "seasmoke" &&
    cav[0].line.vanguard === "thunderstrike" &&
    cav[0].line.right === "sheepstealer",
  "Seasmoke / Thunderstrike / Sheepstealer must be first vs the online DPS core",
);
assert(
  cav.some((choice) => {
    const ids = seatsOf(choice.line);
    return ids.includes("shimmer") && ids.includes("arulix");
  }),
  "saved Cavalry Overwhelm (Shimmer / Arulix) must be listed vs the online DPS core",
);
assert(
  cav.some((choice) =>
    choice.pros.some((note) =>
      note.title.includes("Cavalry beat Shieldbearers"),
    ),
  ),
  "list the tile triangle as a pro",
);
assert(
  new Set(cav.map((choice) => choice.id)).size === cav.length,
  "counter lines must be unique",
);
for (const choice of cav) {
  const ids = seatsOf(choice.line);
  assert(new Set(ids).size === 3, `${choice.line.name} must be three names`);
}

const moonEnemy = {
  left: "malachite",
  vanguard: "vhagar",
  right: "moondancer",
  leftStars: 6,
  vanguardStars: 6,
  rightStars: 6,
  troop: "shieldbearers" as const,
};
const vsMoon = choicesAgainstEnemy({
  enemy: moonEnemy,
  troop: "cavalry",
  state: emptyPit(),
  limit: 8,
});
assert(
  vsMoon[0].line.left === "seasmoke" &&
    vsMoon[0].line.vanguard === "thunderstrike" &&
    vsMoon[0].line.right === "sheepstealer",
  "Seasmoke core also leads vs Malachite / Vhagar / Moondancer",
);

const spearCore = {
  left: "syrax",
  vanguard: "vaeldra",
  right: "caraxes",
  leftStars: 6,
  vanguardStars: 6,
  rightStars: 6,
  troop: "spearmen" as const,
};
const shields = choicesAgainstEnemy({
  enemy: spearCore,
  troop: "shieldbearers",
  state: emptyPit(),
  limit: 12,
});
assert(shields.length >= 3, `expected shield counters, got ${shields.length}`);
assert(
  shields.every((choice) => choice.line.troop === "shieldbearers"),
  "community Shields vs Spears stays on Shields",
);
assert(
  shields.every((choice) => !hasIds(choice.line, ["syrax", "vaeldra", "caraxes"])),
  "do not reseat the Spear core on the counter march",
);
assert(
  shields.some(
    (choice) =>
      choice.line.left === "malachite" &&
      choice.line.vanguard === "vhagar" &&
      choice.line.right === "venator",
  ),
  "Malachite / Vhagar / Venator must be listed vs the Spear core",
);
assert(
  shields.some(
    (choice) =>
      choice.line.left === "malachite" &&
      choice.line.vanguard === "vhagar" &&
      choice.line.right === "moondancer",
  ),
  "Malachite / Vhagar / Moondancer must be listed vs the Spear core",
);
assert(
  shields.some((choice) => choice.label === "Community answer"),
  "Shields into Spears is a community kit answer, not a tile win",
);

const cavCore = {
  left: "seasmoke",
  vanguard: "thunderstrike",
  right: "sheepstealer",
  leftStars: 6,
  vanguardStars: 6,
  rightStars: 6,
  troop: "cavalry" as const,
};
const spears = choicesAgainstEnemy({
  enemy: cavCore,
  troop: "spearmen",
  state: emptyPit(),
  limit: 8,
});
assert(spears.length >= 4, `expected spear counters, got ${spears.length}`);
assert(
  spears.every((choice) => choice.line.troop === "spearmen"),
  "counter to Cavalry stays on Spears",
);
assert(
  spears.every((choice) => {
    const ids = seatsOf(choice.line);
    return !ids.some((id) =>
      ["seasmoke", "thunderstrike", "sheepstealer"].includes(id),
    );
  }),
  "do not reseat the Cavalry core on the counter march",
);
assert(
  spears.some(
    (choice) =>
      choice.line.left === "syrax" &&
      choice.line.vanguard === "vaeldra" &&
      choice.line.right === "caraxes",
  ),
  "Syrax / Vaeldra / Caraxes must be listed vs Seasmoke Cavalry",
);
assert(
  spears.some((choice) =>
    choice.pros.some((note) => note.title.includes("Spearmen beat Cavalry")),
  ),
  "Spears beat Cavalry on tiles",
);

const malHits = filterDragonPicks(DRAGONS, { query: "mal" });
assert(malHits[0]?.id === "malachite", `mal should rank Malachite first, got ${malHits[0]?.id}`);

const jadeHits = filterDragonPicks(DRAGONS, { query: "jade" });
assert(jadeHits[0]?.id === "malachite", "epithet Jade Ward ranks Malachite");

const moonHits = filterDragonPicks(DRAGONS, { query: "moon" });
assert(moonHits[0]?.id === "moondancer", "moon ranks Moondancer first");

const cavHits = filterDragonPicks(DRAGONS, { query: "cav" });
assert(cavHits.length > 0, "cav query returns cavalry dragons");
assert(
  cavHits.every((row) => row.affinities.includes("cavalry")),
  "cav query is only cavalry affinities",
);
assert(dragonPickScore(cavHits[0], "cav") === 5, "troop query scores below name hits");

const ownedHits = filterDragonPicks(DRAGONS, {
  query: "",
  ownedIds: ["syrax", "malachite"],
});
assert(
  ownedHits[0]?.id === "malachite" && ownedHits[1]?.id === "syrax",
  "empty query lists owned names first, alphabetically",
);

const ownedOnlyHits = filterDragonPicks(DRAGONS, {
  query: "v",
  ownedOnly: true,
  ownedIds: ["vhagar", "syrax"],
});
assert(
  ownedOnlyHits.length === 1 && ownedOnlyHits[0]?.id === "vhagar",
  "Owned chip keeps the query inside the pit",
);

const shieldHits = filterDragonPicks(DRAGONS, {
  query: "",
  troop: "shieldbearers",
});
assert(
  shieldHits.length > 0 &&
    shieldHits.every((row) => row.affinities.includes("shieldbearers")),
  "Shields chip is only Shieldbearer dragons",
);

assert(
  starsForCounterPick("malachite", new Map([["malachite", 5]]), 6) === 5,
  "picking an owned dragon copies pit stars",
);
assert(
  starsForCounterPick("caraxes", new Map([["malachite", 5]]), 6) === 6,
  "unowned picks keep the seat fallback stars",
);

console.log("check-counter ok");
