import type {
  Breed,
  LineupMode,
  MarchSpeed,
  Rarity,
  SlotId,
  TroopType,
} from "@/lib/types";

export const TROOP_TYPES: TroopType[] = [
  "cavalry",
  "shieldbearers",
  "archers",
  "spearmen",
  "siege",
];

export const BREEDS: Breed[] = ["champion", "hunter", "sentinel", "warrior"];
export const RARITIES: Rarity[] = ["legendary", "epic", "rare"];
export const SLOTS: SlotId[] = ["left", "vanguard", "right"];
export const MODES: LineupMode[] = [
  "pvp",
  "pve",
  "rally",
  "defense",
  "gathering",
];

export const troopLabels: Record<TroopType, string> = {
  cavalry: "Cavalry",
  shieldbearers: "Shieldbearers",
  archers: "Archers",
  spearmen: "Spearmen",
  siege: "Siege",
};

export const troopShort: Record<TroopType, string> = {
  cavalry: "Cav",
  shieldbearers: "Shields",
  archers: "Archers",
  spearmen: "Spears",
  siege: "Siege",
};

export const breedLabels: Record<Breed, string> = {
  champion: "Champion",
  hunter: "Hunter",
  sentinel: "Sentinel",
  warrior: "Warrior",
};

export const breedChipClass: Record<Breed, string> = {
  champion: "bg-amber-500/15 text-amber-200 ring-amber-400/35",
  hunter: "bg-orange-500/15 text-orange-200 ring-orange-400/35",
  sentinel: "bg-cyan-500/15 text-cyan-200 ring-cyan-400/35",
  warrior: "bg-rose-500/15 text-rose-200 ring-rose-400/35",
};

export const breedRoles: Record<Breed, string> = {
  champion: "Suppressor — mixed damage, flexible core",
  hunter: "Debuffer — fire pressure and disruption",
  sentinel: "Buffer — tactical support and recovery",
  warrior: "Enhancer — physical damage and frontline",
};

export const rarityLabels: Record<Rarity, string> = {
  legendary: "Legendary",
  epic: "Epic",
  rare: "Rare",
};

export const marchLabels: Record<MarchSpeed, string> = {
  "very-slow": "Very Slow",
  slow: "Slow",
  average: "Average",
  fast: "Fast",
  "very-fast": "Very Fast",
};

export const slotLabels: Record<SlotId, string> = {
  left: "Left Flank",
  vanguard: "Vanguard",
  right: "Right Flank",
};

export const slotShort: Record<SlotId, string> = {
  left: "Left",
  vanguard: "Vanguard",
  right: "Right",
};

export const slotHints: Record<SlotId, string> = {
  left: "Often receives Instinct / Initiative and tactical buffs.",
  vanguard: "Front line. Taunt, damage reduction, and your main carry.",
  right: "Often receives Strength, fire, and physical damage buffs.",
};

export const modeLabels: Record<LineupMode, string> = {
  pvp: "PvP",
  pve: "PvE",
  rally: "Rally",
  defense: "Castle Defense",
  gathering: "Gathering",
};

export const modeShort: Record<LineupMode, string> = {
  pvp: "PvP",
  pve: "PvE",
  rally: "Rally",
  defense: "Defense",
  gathering: "Gather",
};

export const modeCopy: Record<LineupMode, string> = {
  pvp: "Player fights and alliance wars. Prioritize taunt, control, and a shared affinity.",
  pve: "Campaign tiles, events, and monster hunts. Recovery and consistent damage.",
  rally: "Alliance rally damage. Slot your highest stars and a matching troop type.",
  defense: "Hold the keep. Damage reduction, taunt, and Protect habits.",
  gathering: "Fast marches for resources. Speed and cavalry affinities matter most.",
};

export const troopCounters: Record<
  TroopType,
  { beats: TroopType | null; losesTo: TroopType | null; note: string }
> = {
  cavalry: {
    beats: "shieldbearers",
    losesTo: "spearmen",
    note: "Fast attacks and map response.",
  },
  shieldbearers: {
    beats: "archers",
    losesTo: "cavalry",
    note: "Frontline pressure and survivability.",
  },
  archers: {
    beats: "spearmen",
    losesTo: "shieldbearers",
    note: "Ranged burst before melee closes.",
  },
  spearmen: {
    beats: "cavalry",
    losesTo: "archers",
    note: "Balanced and reliable across modes.",
  },
  siege: {
    beats: null,
    losesTo: null,
    note: "Weak vs every troop type, but shreds Point of Interest durability.",
  },
};

/** Troops that win the tile triangle against this army. Siege loses to every other type. */
export function troopsThatBeat(enemy: TroopType): TroopType[] {
  if (enemy === "siege") {
    return TROOP_TYPES.filter((item) => item !== "siege");
  }
  return TROOP_TYPES.filter((item) => troopCounters[item].beats === enemy);
}

export function defaultCounterTroop(enemy: TroopType): TroopType {
  return troopsThatBeat(enemy)[0] ?? "cavalry";
}

export type TroopMatchup = "beats" | "even" | "loses" | "siege";

export function troopMatchup(ours: TroopType, theirs: TroopType): TroopMatchup {
  if (ours === "siege") return "siege";
  if (theirs === "siege") return "beats";
  if (troopCounters[ours].beats === theirs) return "beats";
  if (troopCounters[ours].losesTo === theirs) return "loses";
  return "even";
}

export function troopMatchupCopy(ours: TroopType, theirs: TroopType): string {
  const match = troopMatchup(ours, theirs);
  if (match === "siege") {
    return "Siege loses to every troop on tiles.";
  }
  if (match === "beats") {
    if (theirs === "siege") {
      return `${troopLabels[ours]} beat Siege on tiles.`;
    }
    return `${troopLabels[ours]} beat ${troopLabels[theirs]} on tiles.`;
  }
  if (match === "loses") {
    return `${troopLabels[ours]} lose to ${troopLabels[theirs]} on tiles.`;
  }
  return `Even ${troopLabels[ours]} march — no troop advantage.`;
}

export const statLabels = {
  strength: "Strength",
  instinct: "Instinct",
  intelligence: "Intelligence",
  initiative: "Initiative",
} as const;

export const statShort = {
  strength: "STR",
  instinct: "INS",
  intelligence: "INT",
  initiative: "INIT",
} as const;

export const STAT_KEYS = [
  "strength",
  "instinct",
  "intelligence",
  "initiative",
] as const;
