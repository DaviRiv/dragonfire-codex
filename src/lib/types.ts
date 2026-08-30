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
  habit: string;
  command: string;
  tags: string[];
  flankBonus: "left" | "right";
  custom?: boolean;
}

export interface OwnedDragon {
  id: string;
  dragonId: string;
  starRank: number;
  reignLevel: number;
  notes: string;
}

export interface LineupSlots {
  left: string | null;
  vanguard: string | null;
  right: string | null;
}

export interface Lineup {
  id: string;
  name: string;
  mode: LineupMode;
  troop: TroopType;
  notes: string;
  slots: LineupSlots;
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
  version: 1;
  owned: OwnedDragon[];
  customDragons: Dragon[];
  lineups: Lineup[];
  teams: Team[];
}
