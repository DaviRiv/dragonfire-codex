export type Breed = "champion" | "hunter" | "sentinel" | "warrior";
export type Rarity = "rare" | "epic" | "legendary";
export type TroopType =
  | "cavalry"
  | "shieldbearers"
  | "archers"
  | "spearmen"
  | "siege";
export type MarchSpeed =
  | "very-slow"
  | "slow"
  | "average"
  | "fast"
  | "very-fast";
export type LineupMode = "pvp" | "pve" | "rally" | "defense" | "gathering";
export type SlotId = "left" | "vanguard" | "right";
export type LineupKind = "pit" | "theory";

export interface DragonStats {
  strength: number;
  instinct: number;
  intelligence: number;
  initiative: number;
}

/** Hub ability plus the star gate that unlocks it. `null` = Command / always on. */
export type GatedAbility = {
  ability: string;
  unlockStars: number | null;
};

export interface Dragon {
  id: string;
  name: string;
  epithet: string;
  rarity: Rarity;
  breed: Breed;
  affinities: TroopType[];
  stats: DragonStats;
  marchSpeed: MarchSpeed;
  /** Full vanguard skill from Dragonfire-Hub. */
  habit: string;
  /** Card-sized vanguard line. */
  habitShort?: string;
  /** Full command skill from Dragonfire-Hub. */
  command: string;
  /** Card-sized command line. */
  commandShort?: string;
  tags: string[];
  /** Named effects this kit is stronger with on a teammate (Hub `needs`). */
  needs?: GatedAbility[];
  /** Named effects this dragon can apply (Hub `provides.ability`). */
  provides?: GatedAbility[];
  flankBonus: "left" | "right";
  released?: boolean;
  custom?: boolean;
}

export interface OwnedDragon {
  id: string;
  dragonId: string;
  starRank: number;
  reignLevel: number;
  notes: string;
  /**
   * Habits 1–5 this dragon actually has. Stars only unlock the slot
   * (2 / 4 / 6 / 8 / 10); you still buy each habit. Missing on old saves
   * is filled from star rank when the pit is loaded.
   */
  habits: number[];
}

export interface LineupPick {
  dragonId: string;
  starRank: number;
  reignLevel: number;
}

export interface LineupSlots {
  left: LineupPick | null;
  vanguard: LineupPick | null;
  right: LineupPick | null;
}

export interface Lineup {
  id: string;
  name: string;
  kind: LineupKind;
  mode: LineupMode;
  troop: TroopType;
  notes: string;
  slots: LineupSlots;
  ignoreLevel: boolean;
  craftStars: number;
  /**
   * When true, Suggest / Next army skip dragons already seated on another
   * saved pit formation. In-game you can reuse a dragon; turn this off to
   * match that. Default true so 3rd/4th teams get leftovers.
   */
  excludeUsed?: boolean;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  lineupIds: string[];
  updatedAt: string;
}

export interface PitState {
  version: 2;
  owned: OwnedDragon[];
  customDragons: Dragon[];
  lineups: Lineup[];
  teams: Team[];
}
