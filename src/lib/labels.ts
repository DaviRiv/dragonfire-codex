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

export const statLabels = {
  strength: "Strength",
  instinct: "Instinct",
  intelligence: "Intelligence",
  initiative: "Initiative",
} as const;
