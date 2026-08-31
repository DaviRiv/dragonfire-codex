import { EPITHETS } from "@/data/epithets";
import { HUB_DRAGONS, type HubDragon } from "@/data/hub-source";
import type {
  Breed,
  Dragon,
  MarchSpeed,
  Rarity,
  TroopType,
} from "@/lib/types";

const TAG_NEEDLES: { tag: string; needles: string[] }[] = [
  { tag: "Physical Damage", needles: ["physical damage"] },
  { tag: "Tactical Damage", needles: ["tactical damage"] },
  { tag: "Fire Damage", needles: ["fire damage"] },
  { tag: "Burn", needles: ["burn", "burning"] },
  { tag: "Bleed", needles: ["bleed"] },
  { tag: "Panic", needles: ["panic"] },
  { tag: "First-Strike", needles: ["first-strike"] },
  { tag: "Double-Strike", needles: ["double-strike"] },
  { tag: "Advantage", needles: ["advantage"] },
  { tag: "Recovery", needles: ["recovery"] },
  { tag: "Cleanse", needles: ["cleanse"] },
  { tag: "Resistance", needles: ["resistance"] },
  { tag: "Taunt", needles: ["taunt"] },
  { tag: "Stun", needles: ["stun"] },
  { tag: "Slow", needles: ["slow"] },
  { tag: "Weakened", needles: ["weakened"] },
  { tag: "Confusion", needles: ["confusion"] },
  { tag: "Stagger", needles: ["stagger"] },
  { tag: "Vulnerable", needles: ["vulnerable"] },
  { tag: "Overwhelm", needles: ["overwhelm"] },
  { tag: "Protect", needles: ["protect"] },
  { tag: "Prey", needles: ["prey"] },
  { tag: "Evade", needles: ["evade"] },
];

const TROOP_MAP: Record<string, TroopType> = {
  cavalry: "cavalry",
  shieldbearers: "shieldbearers",
  archers: "archers",
  spearmen: "spearmen",
  siege: "siege",
};

const MARCH_MAP: Record<string, MarchSpeed> = {
  "very slow": "very-slow",
  slow: "slow",
  average: "average",
  fast: "fast",
  "very fast": "very-fast",
};

function tagsFor(raw: HubDragon): string[] {
  const hay = [
    raw.commandSkill,
    raw.vanguardSkill,
    ...raw.habitsData.map((habit) => habit.level1),
    ...raw.provides.ability.map((item) => item.ability),
  ]
    .join(" ")
    .toLowerCase();
  return TAG_NEEDLES.filter(({ needles }) =>
    needles.some((needle) => hay.includes(needle)),
  ).map(({ tag }) => tag);
}

function mapAffinities(values: string[]): TroopType[] {
  const next: TroopType[] = [];
  for (const value of values) {
    const mapped = TROOP_MAP[value.toLowerCase()];
    if (mapped && !next.includes(mapped)) next.push(mapped);
  }
  return next;
}

function mapDragon(raw: HubDragon): Dragon {
  const rarity = raw.rarity.toLowerCase() as Rarity;
  const breed = raw.type.toLowerCase() as Breed;
  const flank =
    raw.buffFlankPosition.toLowerCase() === "right" ? "right" : "left";
  const march =
    MARCH_MAP[raw.stats.marchSpeed.toLowerCase()] ?? "average";
  return {
    id: raw.id,
    name: raw.name,
    epithet: EPITHETS[raw.id] ?? (raw.buffVanguard || "Unlisted"),
    rarity,
    breed,
    affinities: mapAffinities(raw.troopAffinity),
    stats: {
      strength: raw.stats.strength,
      instinct: raw.stats.instinct,
      intelligence: raw.stats.intelligence,
      initiative: raw.stats.initiative,
    },
    marchSpeed: march,
    habit: raw.vanguardSkill,
    habitShort: raw.vanguardSkillShort,
    command: raw.commandSkill,
    commandShort: raw.commandSkillShort,
    tags: tagsFor(raw),
    flankBonus: flank,
    released: raw.released,
  };
}

export const DRAGONS: Dragon[] = HUB_DRAGONS.filter(
  (dragon) => dragon.released && dragon.commandSkill.trim(),
).map(mapDragon);

export const UNRELEASED_DRAGONS = HUB_DRAGONS.filter(
  (dragon) => !dragon.released,
).map((dragon) => ({
  id: dragon.id,
  name: dragon.name,
  rarity: (dragon.rarity.toLowerCase() || "epic") as Rarity,
  breed: (dragon.type.toLowerCase() || "champion") as Breed,
  affinities: mapAffinities(dragon.troopAffinity),
}));

export const CATALOG_IDS = new Set(DRAGONS.map((dragon) => dragon.id));

export const dragonById = new Map(DRAGONS.map((dragon) => [dragon.id, dragon]));

export function getCatalogDragon(id: string): Dragon | undefined {
  return dragonById.get(id);
}
