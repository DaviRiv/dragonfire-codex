import { CURRENT_META_LINES } from "@/data/meta";
import type { LineupMode, TroopType } from "@/lib/types";

/**
 * Saved three-dragon lines the site lists.
 * Cores come from src/data/meta.ts (September 2026 community snapshot).
 * Whys use Hub jobs and the in-game tile triangle — not ChatGPT’s
 * “Shields beat Spears” or invented anti-heal on Sheepstealer.
 */
export type BookEntry = {
  id: string;
  name: string;
  troop: TroopType;
  mode: LineupMode;
  left: string;
  vanguard: string;
  right: string;
  why: string;
  kind: "core" | "alternate" | "counter";
  answers?: string[];
  beats?: TroopType[];
};

const SHIELD_CORES = ["online-dps", "shield-moon", "shield-rhys"] as const;
const CAV_CORES = ["cav-sea", "cav-shadow"] as const;
const ARCHER_CORES = ["archer-zivern", "archer-syrax"] as const;

export const NAMED_CORES: Record<string, readonly [string, string, string]> =
  Object.fromEntries(
    CURRENT_META_LINES.map((line) => [
      line.id,
      [line.left.id, line.vanguard.id, line.right.id] as [
        string,
        string,
        string,
      ],
    ]),
  );

const CORE_ENTRIES: BookEntry[] = CURRENT_META_LINES.map((line) => ({
  id: `core-${line.id}`,
  name: line.name,
  troop: line.troop,
  mode: line.mode,
  left: line.left.id,
  vanguard: line.vanguard.id,
  right: line.right.id,
  why: line.why,
  kind: "core",
}));

const EXTRA: BookEntry[] = [
  {
    id: "alt-shields-rhys-mal-venator",
    name: "Shield dual Recovery",
    troop: "shieldbearers",
    mode: "pvp",
    left: "malachite",
    vanguard: "rhysarion",
    right: "venator",
    why: "Malachite recovers from the Left. Rhysarion recovers from Vanguard so the Right Flank habit feeds Venator. No Taunt soak.",
    kind: "alternate",
  },

  {
    id: "counter-cav-sea-vs-shields",
    name: "Cavalry Seasmoke core",
    troop: "cavalry",
    mode: "pvp",
    left: "seasmoke",
    vanguard: "thunderstrike",
    right: "sheepstealer",
    why: "Cavalry beat Shieldbearers on tiles. Community Cavalry answer: Seasmoke Left, Thunderstrike Vanguard, Sheepstealer Right.",
    kind: "counter",
    answers: [...SHIELD_CORES],
    beats: ["shieldbearers"],
  },
  {
    id: "counter-cav-shadow-vs-shields",
    name: "Cavalry Shadowsong alt",
    troop: "cavalry",
    mode: "pvp",
    left: "shadowsong",
    vanguard: "daemoros",
    right: "kalspire",
    why: "Cavalry beat Shieldbearers on tiles. Community alternate when the Seasmoke line is already marching.",
    kind: "counter",
    answers: [...SHIELD_CORES],
    beats: ["shieldbearers"],
  },
  {
    id: "counter-cav-shimmer-vaeldra-arulix",
    name: "Cavalry Overwhelm",
    troop: "cavalry",
    mode: "pvp",
    left: "shimmer",
    vanguard: "vaeldra",
    right: "arulix",
    why: "Cavalry beat Shieldbearers on tiles. Shimmer recovers from the Left. Vaeldra soaks in Vanguard. Arulix finishes with Overwhelm.",
    kind: "counter",
    beats: ["shieldbearers"],
  },
  {
    id: "counter-cav-shimmer-kalspire-arulix",
    name: "Cavalry heal and Overwhelm",
    troop: "cavalry",
    mode: "pvp",
    left: "shimmer",
    vanguard: "kalspire",
    right: "arulix",
    why: "Cavalry beat Shieldbearers on tiles. Shimmer recovers from the Left. Kalspire holds Vanguard. Arulix finishes with Overwhelm.",
    kind: "counter",
    beats: ["shieldbearers"],
  },

  {
    id: "counter-shields-dps-vs-spears",
    name: "Online DPS core",
    troop: "shieldbearers",
    mode: "pvp",
    left: "malachite",
    vanguard: "vhagar",
    right: "venator",
    why: "Community kit answer to Syrax / Vaeldra / Caraxes. Not a tile win — Archers beat Spearmen on tiles. Malachite recovers, Vhagar soaks, Venator finishes.",
    kind: "counter",
    answers: ["spear-syrax"],
  },
  {
    id: "counter-shields-moon-vs-spears",
    name: "Shield Moon line",
    troop: "shieldbearers",
    mode: "pvp",
    left: "malachite",
    vanguard: "vhagar",
    right: "moondancer",
    why: "Community kit answer to the Spearmen core, with Moondancer as the popular third. Archers still hold the tile triangle vs Spears.",
    kind: "counter",
    answers: ["spear-syrax"],
  },
  {
    id: "counter-shields-rhys-vs-spears",
    name: "Shield Rhysarion third",
    troop: "shieldbearers",
    mode: "pvp",
    left: "malachite",
    vanguard: "vhagar",
    right: "rhysarion",
    why: "Community kit answer to the Spearmen core with Rhysarion as the third. Archers still hold the tile triangle vs Spears.",
    kind: "counter",
    answers: ["spear-syrax"],
  },
  {
    id: "counter-archers-zivern-vs-spears",
    name: "Archer Zivern line",
    troop: "archers",
    mode: "pvp",
    left: "seasmoke",
    vanguard: "zivern",
    right: "daemoros",
    why: "Archers beat Spearmen on tiles. Seasmoke feeds the Right Flank. Zivern holds Vanguard. Daemoros finishes.",
    kind: "counter",
    answers: ["spear-syrax"],
    beats: ["spearmen"],
  },

  {
    id: "counter-spears-syrax-vs-cav",
    name: "Spear Syrax core",
    troop: "spearmen",
    mode: "pvp",
    left: "syrax",
    vanguard: "vaeldra",
    right: "caraxes",
    why: "Spearmen beat Cavalry on tiles. Community answer to Seasmoke / Thunderstrike / Sheepstealer.",
    kind: "counter",
    answers: [...CAV_CORES],
    beats: ["cavalry"],
  },

  {
    id: "counter-shields-dps-vs-archers",
    name: "Online DPS core",
    troop: "shieldbearers",
    mode: "pvp",
    left: "malachite",
    vanguard: "vhagar",
    right: "venator",
    why: "Shieldbearers beat Archers on tiles. Malachite recovers from the Left. Vhagar soaks in Vanguard. Venator finishes.",
    kind: "counter",
    answers: [...ARCHER_CORES],
    beats: ["archers"],
  },
  {
    id: "counter-shields-moon-vs-archers",
    name: "Shield Moon line",
    troop: "shieldbearers",
    mode: "pvp",
    left: "malachite",
    vanguard: "vhagar",
    right: "moondancer",
    why: "Shieldbearers beat Archers on tiles. Malachite recovers from the Left. Vhagar soaks in Vanguard. Moondancer finishes.",
    kind: "counter",
    answers: [...ARCHER_CORES],
    beats: ["archers"],
  },
];

export const LINE_BOOK: BookEntry[] = [...CORE_ENTRIES, ...EXTRA];

/** Troop the Counter tab should open on for a named core. Tile chips stay honest. */
export const CORE_COUNTER_TROOP: Record<string, TroopType> = {
  "online-dps": "cavalry",
  "shield-moon": "cavalry",
  "shield-rhys": "cavalry",
  "spear-syrax": "shieldbearers",
  "cav-sea": "spearmen",
  "cav-shadow": "spearmen",
  "archer-zivern": "shieldbearers",
  "archer-syrax": "shieldbearers",
};
