import { DRAGONS } from "@/data/dragons";
import {
  dragonNeedGates,
  dragonProvides,
  joinNames,
  kitText,
  provideUnlockStars,
} from "@/lib/abilities";
import { findDragon } from "@/lib/dragons";
import {
  habitNumberForUnlockStars,
  liveOwnedHabitRanks,
  liveOwnedHabits,
} from "@/lib/habits";
import { breedLabels, slotLabels, troopLabels } from "@/lib/labels";
import {
  placedInLineup,
  slottedDragonIds,
  type ResolvedSlot,
} from "@/lib/lineup";
import { qualifiesForStars } from "@/lib/stars";
import {
  grantDetail,
  kitStars,
  needDetail,
  needWhy,
  needWhyShort,
  withNeedWhy,
  type SynergyBuff,
  type SynergyStatLine,
} from "@/lib/synergy-buffs";
import type { Breed, Dragon, Lineup, LineupKind, PitState } from "@/lib/types";

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
  ability?: string;
  stats?: SynergyStatLine[];
};

export type PairingReport = {
  pros: PairingNote[];
  cons: PairingNote[];
  placedCount: number;
  buffs: SynergyBuff[];
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

export function partnerRules(
  dragon: Dragon,
  atStars?: number | null,
  habits?: number[] | null,
  habitRanks?: number[] | null,
): PartnerRule[] {
  const text = kitText(dragon, atStars, habits, habitRanks);
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
  teammates: {
    dragon: Dragon;
    atStars?: number | null;
    habits?: number[] | null;
    habitRanks?: number[] | null;
  }[],
  atStars?: number | null,
  habits?: number[] | null,
  habitRanks?: number[] | null,
): { text: string; points: number }[] {
  const fits: { text: string; points: number }[] = [];
  for (const mate of teammates) {
    for (const rule of partnerRules(
      mate.dragon,
      mate.atStars,
      mate.habits,
      mate.habitRanks,
    )) {
      if (dragon.breed !== rule.breed) continue;
      const gift = rule.gift ? `${rule.gift} ` : "";
      fits.push({
        text: `Fills ${mate.dragon.name}’s ${gift}${breedLabels[rule.breed]} pairing`,
        points: 34,
      });
    }
    for (const need of dragonNeedGates(
      mate.dragon,
      mate.atStars,
      mate.habits,
      mate.habitRanks,
    )) {
      if (!qualifiesForStars(need.unlockStars, mate.atStars)) continue;
      if (
        dragonProvides(mate.dragon, need.ability, mate.atStars, mate.habits)
      ) {
        continue;
      }
      if (!dragonProvides(dragon, need.ability, atStars, habits)) continue;
      const payoff = needWhyShort(
        mate.dragon,
        need.ability,
        mate.atStars ?? null,
        mate.habits,
        mate.habitRanks,
      );
      fits.push({
        text: payoff
          ? `Gives ${mate.dragon.name} ${need.ability} — ${payoff}`
          : `Gives ${mate.dragon.name} ${need.ability}`,
        points: 32,
      });
    }
  }
  for (const rule of partnerRules(dragon, atStars, habits, habitRanks)) {
    const partner = teammates.find((mate) => mate.dragon.breed === rule.breed);
    if (!partner) continue;
    fits.push({
      text: `Gets a ${breedLabels[rule.breed]} in ${partner.dragon.name}`,
      points: 30,
    });
  }
  for (const need of dragonNeedGates(dragon, atStars, habits, habitRanks)) {
    if (!qualifiesForStars(need.unlockStars, atStars)) continue;
    if (dragonProvides(dragon, need.ability, atStars, habits)) continue;
    const partner = teammates.find((mate) =>
      dragonProvides(mate.dragon, need.ability, mate.atStars, mate.habits),
    );
    if (!partner) continue;
    const payoff = needWhyShort(
      dragon,
      need.ability,
      atStars ?? null,
      habits,
      habitRanks,
    );
    fits.push({
      text: payoff
        ? `Gets ${need.ability} from ${partner.dragon.name} — ${payoff}`
        : `Gets ${need.ability} from ${partner.dragon.name}`,
      points: 30,
    });
  }
  return fits;
}

type PartnerHit = {
  dragonName: string;
  lineupName?: string;
  live: boolean;
  needStars: number | null | undefined;
  ownedStars: number | null;
};

function onOtherPitTeam(
  state: PitState,
  currentId: string,
  dragonId: string,
): boolean {
  return state.lineups.some(
    (lineup) =>
      lineup.id !== currentId &&
      lineup.kind === "pit" &&
      placedInLineup(lineup, state).some((row) => row.dragon.id === dragonId),
  );
}

function partnerOnOtherTeam(
  state: PitState,
  currentId: string,
  ability: string,
  excludeDragonId: string,
): PartnerHit | null {
  const hits: PartnerHit[] = [];
  for (const lineup of state.lineups) {
    if (lineup.id === currentId || lineup.kind !== "pit") continue;
    for (const row of placedInLineup(lineup, state)) {
      if (row.dragon.id === excludeDragonId) continue;
      const needStars = provideUnlockStars(row.dragon, ability);
      if (needStars === undefined) continue;
      const ownedStars = pitStars(row);
        const habits = liveOwnedHabits(row.owned, "pit");
        hits.push({
          dragonName: row.dragon.name,
          lineupName: lineup.name,
          live: dragonProvides(row.dragon, ability, ownedStars, habits),
          needStars,
          ownedStars,
        });
    }
  }
  return hits.find((hit) => hit.live) ?? hits[0] ?? null;
}

function partnerIdleInPit(
  state: PitState,
  current: Lineup,
  ability: string,
  excludeDragonId: string,
): PartnerHit | null {
  const seated = slottedDragonIds(current, state);
  const hits: PartnerHit[] = [];
  for (const owned of state.owned) {
    if (owned.dragonId === excludeDragonId) continue;
    if (seated.has(owned.dragonId)) continue;
    if (onOtherPitTeam(state, current.id, owned.dragonId)) continue;
    const dragon = findDragon(owned.dragonId, state.customDragons);
    if (!dragon) continue;
    const needStars = provideUnlockStars(dragon, ability);
    if (needStars === undefined) continue;
    hits.push({
      dragonName: dragon.name,
      live: dragonProvides(dragon, ability, owned.starRank, owned.habits),
      needStars,
      ownedStars: owned.starRank,
    });
  }
  return hits.find((hit) => hit.live) ?? hits[0] ?? null;
}

/** Live kit first. Then an idle pit dragon (you can still seat them). Then parked. */
function pickPitPartner(
  other: PartnerHit | null,
  idle: PartnerHit | null,
): PartnerHit | null {
  if (other?.live) return other;
  if (idle?.live) return idle;
  return idle ?? other;
}

function elsewhereDetail(ability: string, hit: PartnerHit): string {
  if (hit.lineupName) {
    if (hit.live) {
      return `${hit.dragonName} supplies ${ability} on ${hit.lineupName}, so it never fires here.`;
    }
    if (hit.needStars != null) {
      return `${hit.dragonName} is on ${hit.lineupName} and brings ${ability} at ${hit.needStars}★. You have ${hit.ownedStars ?? 0}★.`;
    }
    return `${hit.dragonName} is on ${hit.lineupName} — not this three.`;
  }
  if (hit.live) {
    return `${hit.dragonName} is in your pit with ${ability} — slot them on this three.`;
  }
  if (hit.needStars != null) {
    return `${hit.dragonName} is in your pit; ${ability} unlocks at ${hit.needStars}★ (you have ${hit.ownedStars ?? 0}★).`;
  }
  return `${hit.dragonName} is in your pit, not on this three.`;
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
  kind: LineupKind,
): {
  dragon: Dragon;
  ownedStars: number | null;
  needStars: number;
  cause: "stars" | "habit";
}[] {
  const locked: {
    dragon: Dragon;
    ownedStars: number | null;
    needStars: number;
    cause: "stars" | "habit";
  }[] = [];
  for (const mate of mates) {
    const needStars = provideUnlockStars(mate.dragon, ability);
    if (needStars === undefined) continue;
    const ownedStars = pitStars(mate);
    const habits = liveOwnedHabits(mate.owned, kind);
    if (dragonProvides(mate.dragon, ability, ownedStars, habits)) continue;
    if (needStars == null) continue;
    if (!qualifiesForStars(needStars, ownedStars)) {
      locked.push({
        dragon: mate.dragon,
        ownedStars,
        needStars,
        cause: "stars",
      });
      continue;
    }
    const habitNum = habitNumberForUnlockStars(needStars);
    if (habitNum != null && habits != null && !habits.includes(habitNum)) {
      locked.push({
        dragon: mate.dragon,
        ownedStars,
        needStars,
        cause: "habit",
      });
    }
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
  const buffs: SynergyBuff[] = [];

  for (const row of placed) {
    const mates = placed.filter((other) => other.dragon.id !== row.dragon.id);
    const ownedStars = pitStars(row);
    const habits = liveOwnedHabits(row.owned, lineup.kind);
    const habitRanks = liveOwnedHabitRanks(row.owned);

    for (const rule of partnerRules(row.dragon, ownedStars, habits, habitRanks)) {
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
        const first = partners[0];
        const live =
          rule.gift && first
            ? grantDetail(
                row.dragon,
                rule.gift,
                names,
                first.dragon,
                kitStars(row, lineup.kind),
                breed,
                habits,
                habitRanks,
              )
            : null;
        if (live) buffs.push(...live.buffs);
        pros.push({
          id: `pro:${row.dragon.id}:breed:${rule.breed}`,
          tone: "pro",
          title: rule.gift
            ? `${row.dragon.name}’s ${rule.gift} is feeding ${names}`
            : `${row.dragon.name}’s ${breed} pairing is feeding ${names}`,
          detail: live?.detail ?? hitBreedDetail(row.dragon, rule, names),
          ability: rule.gift,
          stats: live?.stats,
        });
      }
    }

    for (const need of dragonNeedGates(row.dragon, ownedStars, habits, habitRanks)) {
      if (dragonProvides(row.dragon, need.ability, ownedStars, habits)) continue;
      if (!qualifiesForStars(need.unlockStars, ownedStars)) {
        const { why, stats } = needWhy(
          row.dragon,
          need.ability,
          need.unlockStars ?? ownedStars,
          habits,
          habitRanks,
        );
        cons.push({
          id: `con:${row.dragon.id}:need:${need.ability.toLowerCase()}:stars`,
          tone: "con",
          cause: "stars",
          stars: need.unlockStars ?? undefined,
          ownedStars,
          ability: need.ability,
          stats,
          title: `${row.dragon.name}’s ${need.ability} pairing unlocks at ${need.unlockStars}★`,
          detail: withNeedWhy(
            why,
            ownedStars == null
              ? `Not in your pit — treat the ${need.ability} payoff as a goal until they hatch.`
              : `You have ${ownedStars}★. Star them to ${need.unlockStars}★ before a ${need.ability} teammate does anything for this habit.`,
          ),
        });
        continue;
      }

      const live = mates.filter((mate) =>
        dragonProvides(
          mate.dragon,
          need.ability,
          pitStars(mate),
          liveOwnedHabits(mate.owned, lineup.kind),
        ),
      );
      if (live.length > 0) {
        const names = joinNames(live.map((mate) => mate.dragon.name));
        const verb = live.length === 1 ? "is feeding" : "are feeding";
        const payoff = needDetail(
          row.dragon,
          need.ability,
          names,
          live[0].dragon,
          kitStars(row, lineup.kind),
          habits,
          habitRanks,
        );
        buffs.push(...payoff.buffs);
        pros.push({
          id: `pro:${row.dragon.id}:need:${need.ability.toLowerCase()}`,
          tone: "pro",
          title: `${names}’s ${need.ability} ${verb} ${row.dragon.name}`,
          detail: payoff.detail,
          ability: need.ability,
          stats: payoff.stats,
        });
        continue;
      }

      const locked = lockedProviders(mates, need.ability, lineup.kind);
      if (locked.length > 0) {
        const first = locked[0];
        const { why, stats } = needWhy(
          row.dragon,
          need.ability,
          kitStars(row, lineup.kind),
          habits,
          habitRanks,
        );
        cons.push({
          id: `con:${row.dragon.id}:need:${need.ability.toLowerCase()}:locked`,
          tone: "con",
          cause: first.cause === "habit" ? "teammate" : "stars",
          stars: first.needStars,
          ownedStars: first.ownedStars,
          ability: need.ability,
          stats,
          title:
            first.cause === "habit"
              ? `${first.dragon.name}’s ${need.ability} habit isn’t marked bought`
              : `${first.dragon.name} has ${need.ability} at ${first.needStars}★`,
          detail: withNeedWhy(
            why,
            first.cause === "habit"
              ? `${row.dragon.name} wants ${need.ability} on this line. Open ${first.dragon.name} in Hatchery and check that habit.`
              : first.ownedStars == null
                ? `${row.dragon.name} wants ${need.ability}, but ${first.dragon.name} is not in your pit yet.`
                : `${row.dragon.name} wants ${need.ability} on this line. ${first.dragon.name} brings it at ${first.needStars}★ — you have ${first.ownedStars}★.`,
          ),
        });
        continue;
      }

      const parked = pickPitPartner(
        partnerOnOtherTeam(state, lineup.id, need.ability, row.dragon.id),
        partnerIdleInPit(state, lineup, need.ability, row.dragon.id),
      );
      const { why, stats } = needWhy(
        row.dragon,
        need.ability,
        kitStars(row, lineup.kind),
        habits,
        habitRanks,
      );
      cons.push({
        id: `con:${row.dragon.id}:need:${need.ability.toLowerCase()}`,
        tone: "con",
        cause: parked?.lineupName
          ? "other-line"
          : parked && !parked.live
            ? "stars"
            : "teammate",
        stars:
          parked && !parked.live && parked.needStars != null
            ? parked.needStars
            : undefined,
        ownedStars: parked && !parked.live ? parked.ownedStars : undefined,
        ability: need.ability,
        stats,
        title: `${row.dragon.name} wants ${need.ability} on a teammate`,
        detail: withNeedWhy(
          why,
          parked
            ? elsewhereDetail(need.ability, parked)
            : `Nobody on this line provides ${need.ability}, so that payoff never fires.${tryHint(need.ability, row.dragon.id)}`,
        ),
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

  const uniqueBuffs: SynergyBuff[] = [];
  const seen = new Set<string>();
  for (const buff of buffs) {
    if (seen.has(buff.id)) continue;
    seen.add(buff.id);
    uniqueBuffs.push(buff);
  }
  return { pros, cons, placedCount: placed.length, buffs: uniqueBuffs };
}
