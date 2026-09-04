import type { LineupMode, TroopType } from "@/lib/types";

export type MetaSeat = {
  id: string;
  name: string;
  job: string;
};

export type MetaLine = {
  id: string;
  name: string;
  where: string;
  troop: TroopType;
  mode: LineupMode;
  left: MetaSeat;
  vanguard: MetaSeat;
  right: MetaSeat;
  why: string;
};

/**
 * Current online meta Copilot pastes into ChatGPT.
 * Online here means PvP / field marches, not campaign tiles.
 */
export const ONLINE_DPS_CORE: MetaLine = {
  id: "online-dps",
  name: "Online DPS core",
  where: "online PvP / field marches",
  troop: "shieldbearers",
  mode: "pvp",
  left: {
    id: "malachite",
    name: "Malachite",
    job: "healer / Recovery",
  },
  vanguard: {
    id: "vhagar",
    name: "Vhagar",
    job: "soak / Taunt",
  },
  right: {
    id: "venator",
    name: "Venator",
    job: "physical DPS finisher",
  },
  why: "Best online DPS lineup. Malachite recovers and buffs from the Left Flank. Vhagar soaks in Vanguard (Taunt; Burn doubles that chance to 50%). Venator finishes physical damage on the Right Flank, where Vhagar’s Physical Damage habit prefers to land.",
};

export const CURRENT_META_LINES: MetaLine[] = [ONLINE_DPS_CORE];

export function metaSeatIds(line: MetaLine = ONLINE_DPS_CORE): string[] {
  return [line.left.id, line.vanguard.id, line.right.id];
}

export function metaTagFor(dragonId: string): string {
  const line = ONLINE_DPS_CORE;
  if (dragonId === line.left.id) return " | meta:online-dps Left";
  if (dragonId === line.vanguard.id) return " | meta:online-dps Vanguard";
  if (dragonId === line.right.id) return " | meta:online-dps Right";
  return "";
}

/** Block ChatGPT reads before the roster. Keep this the source of “what is meta.” */
export function chatgptMetaTemplate(line: MetaLine = ONLINE_DPS_CORE): string {
  return `Current meta (treat this as fact for this paste, not a guess from training data):
- Online / PvP DPS: the best lineup is Left ${line.left.name} (${line.left.job}), Vanguard ${line.vanguard.name} (${line.vanguard.job}), Right ${line.right.name} (${line.right.job}) on Shieldbearers, mode pvp.
- ${line.why}
- Seat that exact core when all three names are in the roster and the player is asking about online, PvP, or a damage march.
- If a name is missing, or tagged on: another team while Skip other teams is on, say which seat is missing and pick the closest substitute from the roster. Do not invent a different “best” online DPS core.
- Rally, PvE, defense, and gathering can use other cores. A spear rally is not this line.
- Rows tagged meta:online-dps are this core.`;
}
