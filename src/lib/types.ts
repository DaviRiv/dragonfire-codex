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
