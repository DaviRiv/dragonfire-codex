import { DRAGONS } from "@/data/dragons";
import { newId, nowIso } from "@/lib/dragons";
import { makePick } from "@/lib/lineup";
import type { Lineup, OwnedDragon, PitState, Team } from "@/lib/types";

function own(
  dragonId: string,
  starRank: number,
  reignLevel: number,
): OwnedDragon {
  return {
    id: newId("own"),
    dragonId,
    starRank,
    reignLevel,
    notes: "",
  };
}

export function samplePit(): PitState {
  const venator = own("venator", 6, 32);
  const vhagar = own("vhagar", 4, 30);
  const malachite = own("malachite", 5, 28);
  const syrax = own("syrax", 5, 30);
  const caraxes = own("caraxes", 4, 26);
  const vaeldra = own("vaeldra", 4, 24);
  const seasmoke = own("seasmoke", 3, 22);
  const daemoros = own("daemoros", 5, 25);
  const crimson = own("crimson", 3, 20);
  const velar = own("velar", 4, 21);

  const owned = [
    venator,
    vhagar,
    malachite,
    syrax,
    caraxes,
    vaeldra,
    seasmoke,
    daemoros,
    crimson,
    velar,
  ];

  const pvp: Lineup = {
    id: newId("lineup"),
    name: "Shield wall",
    kind: "pit",
    mode: "pvp",
    troop: "shieldbearers",
    notes: "Vhagar soaks, Malachite recovers, Venator finishes.",
    slots: {
      left: makePick("malachite", 5, 28),
      vanguard: makePick("vhagar", 4, 30),
      right: makePick("venator", 6, 32),
    },
    ignoreLevel: false,
    craftStars: 10,
    excludeUsed: true,
    updatedAt: nowIso(),
  };

  const spears: Lineup = {
    id: newId("lineup"),
    name: "Blood wyrm spears",
    kind: "pit",
    mode: "rally",
    troop: "spearmen",
    notes: "Caraxes in vanguard for the fire nuke; Syrax feeds First-Strike.",
    slots: {
      left: makePick("syrax", 5, 30),
      vanguard: makePick("caraxes", 4, 26),
      right: makePick("vaeldra", 4, 24),
    },
    ignoreLevel: false,
    craftStars: 10,
    excludeUsed: true,
    updatedAt: nowIso(),
  };

  const archers: Lineup = {
    id: newId("lineup"),
    name: "Bow march",
    kind: "pit",
    mode: "pve",
    troop: "archers",
    notes: "Daemoros carries. Seasmoke cleanses; Crimson stuns on odd rounds.",
    slots: {
      left: makePick("seasmoke", 3, 22),
      vanguard: makePick("daemoros", 5, 25),
      right: makePick("crimson", 3, 20),
    },
    ignoreLevel: false,
    craftStars: 10,
    excludeUsed: true,
    updatedAt: nowIso(),
  };

  const defense: Lineup = {
    id: newId("lineup"),
    name: "Keep watch",
    kind: "pit",
    mode: "defense",
    troop: "shieldbearers",
    notes: "Velar Advantage plus the shield wall core.",
    slots: {
      left: makePick("velar", 4, 21),
      vanguard: makePick("vhagar", 4, 30),
      right: makePick("malachite", 5, 28),
    },
    ignoreLevel: false,
    craftStars: 10,
    excludeUsed: true,
    updatedAt: nowIso(),
  };

  const dream: Lineup = {
    id: newId("lineup"),
    name: "Sun court",
    kind: "theory",
    mode: "pvp",
    troop: "spearmen",
    notes: "Aspirational 10-star core you do not own yet.",
    slots: {
      left: makePick("syrax", 10, 30),
      vanguard: makePick("sunfyre", 10, 1),
      right: makePick("caraxes", 10, 26),
    },
    ignoreLevel: true,
    craftStars: 10,
    excludeUsed: true,
    updatedAt: nowIso(),
  };

  const teams: Team[] = [
    {
      id: newId("team"),
      name: "Alliance war kit",
      description: "Main PvP march, spear rally, and keep defense.",
      lineupIds: [pvp.id, spears.id, defense.id],
      updatedAt: nowIso(),
    },
    {
      id: newId("team"),
      name: "Campaign push",
      description: "Bow march for tiles plus spears when you need a counter.",
      lineupIds: [archers.id, spears.id],
      updatedAt: nowIso(),
    },
  ];

  return {
    version: 2,
    owned,
    customDragons: [],
    lineups: [pvp, spears, archers, defense, dream],
    teams,
  };
}

export function catalogCount(): number {
  return DRAGONS.length;
}
