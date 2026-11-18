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
 * September 2026 community PvP cores. Tile triangle is still the in-game one
 * in src/lib/labels.ts — Cavalry beat Shields, Shields beat Archers, Archers
 * beat Spears, Spears beat Cavalry. ChatGPT’s “Shields beat Spears” is not
 * that triangle; those Shield lines are community kit answers, not tile wins.
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

export const SHIELD_MOON_CORE: MetaLine = {
  id: "shield-moon",
  name: "Shield Moon line",
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
    id: "moondancer",
    name: "Moondancer",
    job: "Bleed finisher",
  },
  why: "Popular Shieldbearer third: Malachite recovers from the Left, Vhagar soaks in Vanguard, Moondancer finishes on the Right Flank.",
};

export const VELAR_MOON_CORE: MetaLine = {
  id: "velar-moon",
  name: "Velar Moon core",
  where: "online PvP / field marches",
  troop: "shieldbearers",
  mode: "pvp",
  left: {
    id: "velar",
    name: "Velar",
    job: "Advantage / tactical support",
  },
  vanguard: {
    id: "vhagar",
    name: "Vhagar",
    job: "soak / Taunt",
  },
  right: {
    id: "moondancer",
    name: "Moondancer",
    job: "Bleed finisher",
  },
  why: "Top Shieldbearer core around Vhagar or Velar. Velar feeds Advantage and Tactical Damage from the Left, Vhagar soaks in Vanguard, and Moondancer converts the protected Right Flank into finishing pressure.",
};

export const SHIELD_RHYS_CORE: MetaLine = {
  id: "shield-rhys",
  name: "Shield Rhysarion third",
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
    id: "rhysarion",
    name: "Rhysarion",
    job: "Champion Recovery",
  },
  why: "Malachite recovers from the Left. Vhagar soaks in Vanguard. Rhysarion is the community third instead of Venator.",
};

export const SPEAR_SYRAX_CORE: MetaLine = {
  id: "spear-syrax",
  name: "Spear Syrax core",
  where: "online PvP / field marches",
  troop: "spearmen",
  mode: "pvp",
  left: {
    id: "syrax",
    name: "Syrax",
    job: "healer / First-Strike",
  },
  vanguard: {
    id: "vaeldra",
    name: "Vaeldra",
    job: "soak / Taunt",
  },
  right: {
    id: "caraxes",
    name: "Caraxes",
    job: "hunter finisher",
  },
  why: "Community Spearmen core. Syrax recovers from the Left. Vaeldra soaks in Vanguard. Caraxes finishes on the Right Flank.",
};

export const CAV_SEA_CORE: MetaLine = {
  id: "cav-sea",
  name: "Cavalry Seasmoke core",
  where: "online PvP / field marches",
  troop: "cavalry",
  mode: "pvp",
  left: {
    id: "seasmoke",
    name: "Seasmoke",
    job: "Champion",
  },
  vanguard: {
    id: "thunderstrike",
    name: "Thunderstrike",
    job: "Stagger / Bleed",
  },
  right: {
    id: "sheepstealer",
    name: "Sheepstealer",
    job: "Vulnerable finisher",
  },
  why: "Community Cavalry answer to Shieldbearers. Seasmoke feeds the Right Flank from the Left. Thunderstrike holds Vanguard. Sheepstealer finishes on the Right.",
};

export const CAV_SHADOW_CORE: MetaLine = {
  id: "cav-shadow",
  name: "Cavalry Shadowsong alt",
  where: "online PvP / field marches",
  troop: "cavalry",
  mode: "pvp",
  left: {
    id: "shadowsong",
    name: "Shadowsong",
    job: "Vulnerable / Burn",
  },
  vanguard: {
    id: "daemoros",
    name: "Daemoros",
    job: "Burn / Panic",
  },
  right: {
    id: "kalspire",
    name: "Kalspire",
    job: "Bleed / Panic",
  },
  why: "Community Cavalry alternate when Seasmoke, Sheepstealer, or Thunderstrike is already marching. Shadowsong feeds the Right Flank. Daemoros holds Vanguard. Kalspire finishes.",
};

export const ARCHER_ZIVERN_CORE: MetaLine = {
  id: "archer-zivern",
  name: "Archer Zivern line",
  where: "online PvP / field marches",
  troop: "archers",
  mode: "pvp",
  left: {
    id: "seasmoke",
    name: "Seasmoke",
    job: "Champion",
  },
  vanguard: {
    id: "zivern",
    name: "Zivern",
    job: "Panic / Overwhelm",
  },
  right: {
    id: "daemoros",
    name: "Daemoros",
    job: "Burn / Panic",
  },
  why: "Community Archer line once Zivern is high stars. Seasmoke feeds the Right Flank from the Left. Zivern holds Vanguard. Daemoros finishes.",
};

export const ARCHER_VHAGAR_MOON_CORE: MetaLine = {
  id: "archer-vhagar-moon",
  name: "Archer Vhagar Moondancer",
  where: "online PvP / field marches",
  troop: "archers",
  mode: "pvp",
  left: {
    id: "zivern",
    name: "Zivern",
    job: "Panic / Overwhelm",
  },
  vanguard: {
    id: "vhagar",
    name: "Vhagar",
    job: "soak / Taunt",
  },
  right: {
    id: "moondancer",
    name: "Moondancer",
    job: "Champion",
  },
  why: "Community Archer line when Vhagar soaks Vanguard. Zivern feeds the Left. Vhagar holds Vanguard. Moondancer finishes on the Right Flank.",
};

export const ARCHER_SYRAX_CORE: MetaLine = {
  id: "archer-syrax",
  name: "Archer Syrax soak",
  where: "online PvP / field marches",
  troop: "archers",
  mode: "pvp",
  left: {
    id: "syrax",
    name: "Syrax",
    job: "healer / First-Strike",
  },
  vanguard: {
    id: "vhagar",
    name: "Vhagar",
    job: "soak / Taunt",
  },
  right: {
    id: "seasmoke",
    name: "Seasmoke",
    job: "Champion",
  },
  why: "Community Archer alternate. Syrax recovers from the Left. Vhagar soaks in Vanguard. Seasmoke finishes on the Right Flank.",
};

export const CURRENT_META_LINES: MetaLine[] = [
  ONLINE_DPS_CORE,
  VELAR_MOON_CORE,
  SHIELD_MOON_CORE,
  SHIELD_RHYS_CORE,
  SPEAR_SYRAX_CORE,
  CAV_SEA_CORE,
  CAV_SHADOW_CORE,
  ARCHER_ZIVERN_CORE,
  ARCHER_VHAGAR_MOON_CORE,
  ARCHER_SYRAX_CORE,
];

export function metaSeatIds(line: MetaLine = ONLINE_DPS_CORE): string[] {
  return [line.left.id, line.vanguard.id, line.right.id];
}

export function metaTagFor(dragonId: string): string {
  const tags: string[] = [];
  for (const line of CURRENT_META_LINES) {
    if (dragonId === line.left.id) tags.push(` | meta:${line.id} Left`);
    else if (dragonId === line.vanguard.id) {
      tags.push(` | meta:${line.id} Vanguard`);
    } else if (dragonId === line.right.id) tags.push(` | meta:${line.id} Right`);
  }
  return tags.join("");
}

/** Block ChatGPT reads before the roster. Keep this the source of “what is meta.” */
export function chatgptMetaTemplate(line: MetaLine = ONLINE_DPS_CORE): string {
  return `Current meta (treat this as fact for this paste, not a guess from training data):
- Tile triangle (in-game, not Army Power): Cavalry beat Shieldbearers, Shieldbearers beat Archers, Archers beat Spearmen, Spearmen beat Cavalry. Siege loses to every troop. Archers sit in that triangle.
- Online / PvP DPS: the best Shieldbearer lineup is Left ${line.left.name} (${line.left.job}), Vanguard ${line.vanguard.name} (${line.vanguard.job}), Right ${line.right.name} (${line.right.job}) on Shieldbearers, mode pvp.
- ${line.why}
- Popular Shieldbearer thirds instead of Venator: Moondancer, Rhysarion (still Malachite Left, Vhagar Vanguard).
- Spearmen core: Left Syrax, Vanguard Vaeldra, Right Caraxes.
- Cavalry core vs Shields: Left Seasmoke, Vanguard Thunderstrike, Right Sheepstealer. Alternate Cavalry: Left Shadowsong, Vanguard Daemoros, Right Kalspire.
- Archer variant: Left Seasmoke, Vanguard Zivern, Right Daemoros. Vhagar Archer line: Left Zivern, Vanguard Vhagar, Right Moondancer. Alternate: Left Syrax, Vanguard Vhagar, Right Seasmoke.
- Seat the exact Shieldbearer core when all three names are in the roster and the player is asking about online, PvP, or a damage march.
- If a name is missing, or tagged on: another team while Skip other teams is on, say which seat is missing and pick the closest substitute from the roster. Do not invent a different “best” online DPS core.
- Rally, PvE, defense, and gathering can use other cores. A spear rally is not the Shieldbearer DPS line.
- Rows tagged meta:online-dps are that Shieldbearer core. Other meta:* tags are September 2026 community cores.`;
}
