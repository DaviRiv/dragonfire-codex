import { dragonNeedGates, dragonProvides, joinNames } from "@/lib/abilities";
import {
  isFinisher,
  isHealer,
  isMitigation,
  isTank,
} from "@/lib/roles";
import type { Dragon, SlotId } from "@/lib/types";

export type LineNeed = "healing" | "mitigation" | "damage";

export type CompNote = {
  text: string;
  weight: number;
  points: number;
};

type Mate = {
  dragon: Dragon;
  atStars?: number | null;
  habits?: number[] | null;
};

export type LineProfile = {
  dragons: Dragon[];
  healers: Dragon[];
  tanks: Dragon[];
  mitigation: Dragon[];
  damage: Dragon[];
  tauntFeed: {
    tank: Dragon;
    feeder: Dragon;
    ability: string;
    live: boolean;
  } | null;
};

export function lineProfile(mates: Mate[]): LineProfile {
  const dragons = mates.map((mate) => mate.dragon);
  const healers = dragons.filter((dragon) => isHealer(dragon));
  const tanks = dragons.filter((dragon) => isTank(dragon));
  const mitigation = dragons.filter((dragon) => isMitigation(dragon));
  const damage = dragons.filter((dragon) => isFinisher(dragon));
  return {
    dragons,
    healers,
    tanks,
    mitigation,
    damage,
    tauntFeed: tauntFeed(mates),
  };
}

function findTankFeed(
  mates: Mate[],
  liveOnly: boolean,
): LineProfile["tauntFeed"] {
  for (const tank of mates.filter((mate) => isTank(mate.dragon))) {
    for (const need of dragonNeedGates(tank.dragon)) {
      const tankStars = liveOnly ? tank.atStars : 10;
      if (
        dragonProvides(tank.dragon, need.ability, tankStars, tank.habits)
      ) {
        continue;
      }
      const feeder = mates.find((mate) => {
        if (mate.dragon.id === tank.dragon.id) return false;
        const atStars = liveOnly ? mate.atStars : 10;
        return dragonProvides(mate.dragon, need.ability, atStars, mate.habits);
      });
      if (!feeder) continue;
      return {
        tank: tank.dragon,
        feeder: feeder.dragon,
        ability: need.ability,
        live: liveOnly,
      };
    }
  }
  return null;
}

function tauntFeed(mates: Mate[]): LineProfile["tauntFeed"] {
  return findTankFeed(mates, true) ?? findTankFeed(mates, false);
}

function fillsNeed(dragon: Dragon, need: LineNeed): boolean {
  if (need === "healing") return isHealer(dragon);
  if (need === "mitigation") return isMitigation(dragon);
  return isFinisher(dragon);
}

export function lineGaps(profile: LineProfile): {
  need: LineNeed;
  gap: string;
  weight: number;
  points: number;
}[] {
  if (profile.dragons.length === 0) return [];
  const gaps: {
    need: LineNeed;
    gap: string;
    weight: number;
    points: number;
  }[] = [];

  if (profile.healers.length === 0) {
    const soak = profile.tanks[0] ?? profile.mitigation[0];
    const feed = profile.tauntFeed;
    let gap = "No healer — this line will not last";
    if (soak && feed) {
      const feedClause = feed.live
        ? `${feed.feeder.name} feeds ${feed.ability}`
        : `${feed.feeder.name} is here for ${feed.ability}`;
      gap = `${soak.name} soaks and ${feedClause}, nobody Recovers`;
    } else if (soak) {
      gap = `${soak.name} soaks, nobody Recovers`;
    }
    gaps.push({ need: "healing", gap, weight: 124, points: 38 });
  }

  if (profile.mitigation.length === 0) {
    const heal = profile.healers[0];
    gaps.push({
      need: "mitigation",
      gap: heal
        ? `${heal.name} heals, nobody Taunts or cuts Damage Received`
        : "No damage mitigation — nobody Taunts or cuts Damage Received",
      weight: 118,
      points: 34,
    });
  }

  if (profile.damage.length === 0) {
    const support = [...profile.healers, ...profile.tanks].slice(0, 2);
    gaps.push({
      need: "damage",
      gap: support.length
        ? `${joinNames(support.map((dragon) => dragon.name))} can hold; nobody finishes`
        : "No damage dealer — this line will not finish fights",
      weight: 116,
      points: 32,
    });
  }

  return gaps;
}

export function lineGapHeadline(mates: Mate[]): string | null {
  const profile = lineProfile(mates);
  const gaps = lineGaps(profile);
  if (gaps.length === 0) return null;
  const order = gaps.map((gap) => {
    if (gap.need === "healing") return "a healer";
    if (gap.need === "mitigation") return "damage mitigation";
    return "a damage dealer";
  });
  const lead = gaps[0].gap;
  if (order.length === 1) return `${lead}. Pick ${order[0]}.`;
  if (order.length === 2) {
    return `${lead}. Pick ${order[0]}, then ${order[1]}.`;
  }
  return `${lead}. Pick ${order[0]}, then ${order.slice(1, -1).join(", ")}, then ${order[order.length - 1]}.`;
}

/** 0 fills the first gap (healer, then mitigation, then damage). 99 fills none. */
export function compPriority(dragon: Dragon, mates: Mate[]): number {
  const gaps = lineGaps(lineProfile(mates));
  for (let i = 0; i < gaps.length; i++) {
    if (fillsNeed(dragon, gaps[i].need)) return i;
  }
  return 99;
}

export function suggestCompNotes(
  dragon: Dragon,
  mates: Mate[],
  slot: SlotId,
): CompNote[] {
  const profile = lineProfile(mates);
  const notes: CompNote[] = [];

  for (const gap of lineGaps(profile)) {
    if (!fillsNeed(dragon, gap.need)) continue;
    const fill =
      gap.need === "healing"
        ? "Healer for this line"
        : gap.need === "mitigation"
          ? slot === "vanguard" && isTank(dragon)
            ? "Tank soak / mitigation in Vanguard"
            : "Damage mitigation"
          : "Damage to balance heal and soak";
    notes.push({
      text: `${fill} — ${gap.gap}`,
      weight: gap.weight,
      points: gap.points,
    });
  }

  return notes;
}
