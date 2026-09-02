import { DRAGONS } from "@/data/dragons";
import {
  dragonNeedGates,
  dragonProvides,
  joinNames,
  kitText,
  provideUnlockStars,
} from "@/lib/abilities";
import { breedLabels, slotLabels, troopLabels } from "@/lib/labels";
import { placedInLineup, type ResolvedSlot } from "@/lib/lineup";
import { qualifiesForStars } from "@/lib/stars";
import type { Breed, Dragon, Lineup, PitState } from "@/lib/types";

export { dragonNeeds, dragonProvides } from "@/lib/abilities";

export type WarnCause =
  | "stars"
  | "teammate"
  | "other-line"
  | "flank"
  | "troop";

export type PairingNote = {
  id: string;
  tone: "pro" | "con";
  title: string;
  detail: string;
  cause?: WarnCause;
  stars?: number;
  ownedStars?: number | null;
};

export type PairingReport = {
  pros: PairingNote[];
  cons: PairingNote[];
  placedCount: number;
};

type PartnerRule = {
  breed: Breed;
  gift?: string;
};

const BREED_FROM_LABEL: Record<string, Breed> = {
  sentinel: "sentinel",
  hunter: "hunter",
  warrior: "warrior",
  champion: "champion",
};

function tryHint(ability: string, excludeId: string): string {
  const names = DRAGONS.filter(
    (dragon) => dragon.id !== excludeId && dragonProvides(dragon, ability),
  )
    .map((dragon) => dragon.name)
    .slice(0, 3);
  if (names.length === 0) return "";
  return ` Try ${joinNames(names)}.`;
}

export function partnerRules(dragon: Dragon): PartnerRule[] {
  const text = kitText(dragon);
  const byBreed = new Map<Breed, PartnerRule>();
  const grantRe =
    /Grant ([A-Za-z][A-Za-z' -]{0,40}?) to (?:1 |an |the )?(?:Ally )?(Sentinel|Hunter|Warrior|Champion)s?/gi;
  let match: RegExpExecArray | null;
  while ((match = grantRe.exec(text))) {
    const breed = BREED_FROM_LABEL[match[2].toLowerCase()];
    if (!breed) continue;
    byBreed.set(breed, { breed, gift: match[1].trim() });
  }
  const allyRe =
    /\b(?:1 |an |any |all |the )?Ally (Sentinel|Hunter|Warrior|Champion)s?\b/gi;
  while ((match = allyRe.exec(text))) {
    const breed = BREED_FROM_LABEL[match[1].toLowerCase()];
    if (!breed || byBreed.has(breed)) continue;
    byBreed.set(breed, { breed });
  }
  return [...byBreed.values()];
}

function missedBreedDetail(dragon: Dragon, rule: PartnerRule): string {
  const breed = breedLabels[rule.breed];
  if (rule.gift && /crescent blade/i.test(rule.gift)) {
    return `Without a ${breed}, Crescent Blade never lands, so Rising Tide never stacks off their hits.`;
  }
  if (rule.gift) {
    return `${rule.gift} never goes out. That part of ${dragon.name}’s kit sits idle.`;
  }
  return `${dragon.name}’s kit buffs a ${breed} teammate — none slotted, so those bonuses never fire.`;
}

function hitBreedDetail(
  dragon: Dragon,
  rule: PartnerRule,
  partners: string,
): string {
  const breed = breedLabels[rule.breed];
  if (rule.gift && /crescent blade/i.test(rule.gift)) {
    return `${partners} can stack Rising Tide when they deal Tactical Damage or apply Recovery.`;
  }
  if (rule.gift) {
    return `${rule.gift} is on ${partners}.`;
  }
  return `${partners} ${partners.includes(" and ") ? "are" : "is"} the ${breed} ${dragon.name} is built around.`;
}

/** Pit rank used for “is this kit live?”, never Theory aim stars. */
export function pitStars(row: {
  owned: { starRank: number } | null;
}): number | null {
  return row.owned?.starRank ?? null;
}

export function pairingFit(
  dragon: Dragon,
  teammates: { dragon: Dragon; atStars?: number | null }[],
  atStars?: number | null,
): { text: string; points: number }[] {
  const fits: { text: string; points: number }[] = [];
  for (const mate of teammates) {
    for (const rule of partnerRules(mate.dragon)) {
      if (dragon.breed !== rule.breed) continue;
      const gift = rule.gift ? `${rule.gift} ` : "";
      fits.push({
        text: `Fills ${mate.dragon.name}’s ${gift}${breedLabels[rule.breed]} pairing`,
        points: 34,
      });
    }
    for (const need of dragonNeedGates(mate.dragon)) {
      if (!qualifiesForStars(need.unlockStars, mate.atStars)) continue;
      if (dragonProvides(mate.dragon, need.ability, mate.atStars)) continue;
      if (!dragonProvides(dragon, need.ability, atStars)) continue;
      fits.push({
        text: `Gives ${mate.dragon.name} ${need.ability}`,
        points: 32,
      });
    }
  }
  for (const rule of partnerRules(dragon)) {
    const partner = teammates.find((mate) => mate.dragon.breed === rule.breed);
    if (!partner) continue;
    fits.push({
      text: `Gets a ${breedLabels[rule.breed]} in ${partner.dragon.name}`,
      points: 30,
    });
  }
  for (const need of dragonNeedGates(dragon)) {
    if (!qualifiesForStars(need.unlockStars, atStars)) continue;
    if (dragonProvides(dragon, need.ability, atStars)) continue;
    const partner = teammates.find((mate) =>
      dragonProvides(mate.dragon, need.ability, mate.atStars),
    );
    if (!partner) continue;
    fits.push({
      text: `Gets ${need.ability} from ${partner.dragon.name}`,
      points: 30,
    });
  }
  return fits;
}

function otherLineProvider(
  state: PitState,
  currentId: string,
  ability: string,
  excludeDragonId: string,
): { lineupName: string; dragonName: string; stars: number } | null {
  for (const lineup of state.lineups) {
    if (lineup.id === currentId) continue;
    if (lineup.kind !== "pit") continue;
    for (const row of placedInLineup(lineup, state)) {
      if (row.dragon.id === excludeDragonId) continue;
      const stars = pitStars(row);
      if (!dragonProvides(row.dragon, ability, stars)) continue;
      return {
        lineupName: lineup.name,
        dragonName: row.dragon.name,
        stars: stars ?? 0,
      };
    }
  }
  return null;
}

function otherLineBreed(
  state: PitState,
  currentId: string,
  breed: Breed,
  excludeDragonId: string,
): { lineupName: string; dragonName: string } | null {
  for (const lineup of state.lineups) {
    if (lineup.id === currentId) continue;
    if (lineup.kind !== "pit") continue;
    for (const row of placedInLineup(lineup, state)) {
      if (row.dragon.id === excludeDragonId) continue;
      if (row.dragon.breed !== breed) continue;
      return { lineupName: lineup.name, dragonName: row.dragon.name };
    }
  }
  return null;
}

function lockedProviders(
  mates: ResolvedSlot[],
  ability: string,
): { dragon: Dragon; ownedStars: number | null; needStars: number }[] {
  const locked: {
    dragon: Dragon;
    ownedStars: number | null;
    needStars: number;
  }[] = [];
  for (const mate of mates) {
    const needStars = provideUnlockStars(mate.dragon, ability);
    if (needStars === undefined) continue;
    const ownedStars = pitStars(mate);
    if (dragonProvides(mate.dragon, ability, ownedStars)) continue;
    if (needStars == null) continue;
    locked.push({ dragon: mate.dragon, ownedStars, needStars });
  }
  return locked;
}

export function pairingReport(
  lineup: Lineup,
  state: PitState,
): PairingReport {
  const placed = placedInLineup(lineup, state);
  const pros: PairingNote[] = [];
  const cons: PairingNote[] = [];

  for (const row of placed) {
    const mates = placed.filter((other) => other.dragon.id !== row.dragon.id);
    const ownedStars = pitStars(row);

    for (const rule of partnerRules(row.dragon)) {
      const partners = mates.filter(
        (mate) => mate.dragon.breed === rule.breed,
      );
      const breed = breedLabels[rule.breed];
      if (partners.length === 0) {
        const elsewhere = otherLineBreed(
          state,
          lineup.id,
          rule.breed,
          row.dragon.id,
        );
        cons.push({
          id: `con:${row.dragon.id}:breed:${rule.breed}`,
          tone: "con",
          cause: elsewhere ? "other-line" : "teammate",
          title: rule.gift
            ? `${row.dragon.name}’s ${rule.gift} needs an ally ${breed}`
            : `${row.dragon.name} needs an ally ${breed}`,
          detail: elsewhere
            ? `${missedBreedDetail(row.dragon, rule)} ${elsewhere.dragonName} is a ${breed} on ${elsewhere.lineupName} — not this three.`
            : missedBreedDetail(row.dragon, rule),
        });
      } else {
        const names = joinNames(partners.map((mate) => mate.dragon.name));
        pros.push({
          id: `pro:${row.dragon.id}:breed:${rule.breed}`,
          tone: "pro",
          title: rule.gift
            ? `${row.dragon.name}’s ${rule.gift} is feeding ${names}`
            : `${row.dragon.name}’s ${breed} pairing is feeding ${names}`,
          detail: hitBreedDetail(row.dragon, rule, names),
        });
      }
    }

    for (const need of dragonNeedGates(row.dragon)) {
      if (dragonProvides(row.dragon, need.ability, ownedStars)) continue;
      if (!qualifiesForStars(need.unlockStars, ownedStars)) {
        cons.push({
          id: `con:${row.dragon.id}:need:${need.ability.toLowerCase()}:stars`,
          tone: "con",
          cause: "stars",
          stars: need.unlockStars ?? undefined,
          ownedStars,
          title: `${row.dragon.name}’s ${need.ability} pairing unlocks at ${need.unlockStars}★`,
          detail:
            ownedStars == null
              ? `Not in your pit — treat the ${need.ability} payoff as a goal until they hatch.`
              : `You have ${ownedStars}★. Star them to ${need.unlockStars}★ before a ${need.ability} teammate does anything for this habit.`,
        });
        continue;
      }

      const live = mates.filter((mate) =>
        dragonProvides(mate.dragon, need.ability, pitStars(mate)),
      );
      if (live.length > 0) {
        const names = joinNames(live.map((mate) => mate.dragon.name));
        const verb = live.length === 1 ? "is feeding" : "are feeding";
        pros.push({
          id: `pro:${row.dragon.id}:need:${need.ability.toLowerCase()}`,
          tone: "pro",
          title: `${names}’s ${need.ability} ${verb} ${row.dragon.name}`,
          detail: `${row.dragon.name}’s kit is written to scale when a teammate brings ${need.ability}.`,
        });
        continue;
      }

      const locked = lockedProviders(mates, need.ability);
      if (locked.length > 0) {
        const first = locked[0];
        cons.push({
          id: `con:${row.dragon.id}:need:${need.ability.toLowerCase()}:locked`,
          tone: "con",
          cause: "stars",
          stars: first.needStars,
          ownedStars: first.ownedStars,
          title: `${first.dragon.name} has ${need.ability} at ${first.needStars}★`,
          detail:
            first.ownedStars == null
              ? `${row.dragon.name} wants ${need.ability}, but ${first.dragon.name} is not in your pit yet.`
              : `${row.dragon.name} wants ${need.ability} on this line. ${first.dragon.name} brings it at ${first.needStars}★ — you have ${first.ownedStars}★.`,
        });
        continue;
      }

      const elsewhere = otherLineProvider(
        state,
        lineup.id,
        need.ability,
        row.dragon.id,
      );
      cons.push({
        id: `con:${row.dragon.id}:need:${need.ability.toLowerCase()}`,
        tone: "con",
        cause: elsewhere ? "other-line" : "teammate",
        title: `${row.dragon.name} wants ${need.ability} on a teammate`,
        detail: elsewhere
          ? `${elsewhere.dragonName} supplies ${need.ability} on ${elsewhere.lineupName}, so it never fires here.${tryHint(need.ability, row.dragon.id)}`
          : `Nobody on this line provides ${need.ability}, so the habits that scale with it stay weak.${tryHint(need.ability, row.dragon.id)}`,
      });
    }

    if (row.slot === "vanguard") {
      const targetSlot = row.dragon.flankBonus;
      const target = placed.find((mate) => mate.slot === targetSlot);
      if (!target) {
        cons.push({
          id: `con:${row.dragon.id}:flank:empty`,
          tone: "con",
          cause: "flank",
          title: `${row.dragon.name} buffs ${slotLabels[targetSlot]}, which is empty`,
          detail: `The Vanguard skill’s flank half never lands until someone stands ${targetSlot}.`,
        });
      }
    }

    if (!row.dragon.affinities.includes(lineup.troop)) {
      cons.push({
        id: `con:${row.dragon.id}:troop`,
        tone: "con",
        cause: "troop",
        title: `${row.dragon.name} has no ${troopLabels[lineup.troop]} affinity`,
        detail: `This march’s troop does not boost ${row.dragon.name}. Pair troops to a positive affinity, or expect a weaker stat line.`,
      });
    }
  }

  return { pros, cons, placedCount: placed.length };
}
