/**
 * Counter tab: troop triangle + Recovery answers.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-counter.ts
 */
import { choicesAgainstEnemy } from "@/lib/counter-choices";
import { analyzeEnemy } from "@/lib/counter";
import { emptyPit } from "@/lib/dragons";
import {
  defaultCounterTroop,
  troopMatchup,
  troopsThatBeat,
} from "@/lib/labels";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
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
  const ids = [choice.line.left, choice.line.vanguard, choice.line.right];
  assert(new Set(ids).size === 3, `${choice.line.name} must be three names`);
}

const spears = choicesAgainstEnemy({
  enemy: {
    left: "syrax",
    vanguard: "caraxes",
    right: "vaeldra",
    leftStars: 5,
    vanguardStars: 4,
    rightStars: 4,
    troop: "cavalry",
  },
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
  spears.some((choice) =>
    choice.pros.some((note) => note.title.includes("Spearmen beat Cavalry")),
  ),
  "Spears beat Cavalry on tiles",
);

console.log("check-counter ok");
