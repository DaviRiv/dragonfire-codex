import { DRAGONS } from "@/data/dragons";
import { dragonKit } from "@/lib/habits";
import { breedLabels } from "@/lib/labels";
import { placedInLineup } from "@/lib/lineup";
import type { Breed, Dragon, Lineup, PitState } from "@/lib/types";

export type PairingNote = {
  id: string;
  tone: "pro" | "con";
  title: string;
  detail: string;
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

const CONTROL_EFFECTS = [
  "Stun",
  "Panic",
  "Slow",
  "Confusion",
  "Stagger",
  "Weakened",
  "Taunt",
] as const;

const STATUS_CANON: Record<string, string> = {
  "first-strike": "First-Strike",
  "double-strike": "Double-Strike",
  advantage: "Advantage",
  taunt: "Taunt",
  burn: "Burn",
  bleed: "Bleed",
  panic: "Panic",
  stun: "Stun",
  slow: "Slow",
  weakened: "Weakened",
  confusion: "Confusion",
  stagger: "Stagger",
  vulnerable: "Vulnerable",
  overwhelm: "Overwhelm",
  protect: "Protect",
  prey: "Prey",
  evade: "Evade",
  recovery: "Recovery",
  cleanse: "Cleanse",
  resistance: "Resistance",
  "control effect": "Control Effect",
};

const BREED_FROM_LABEL: Record<string, Breed> = {
  sentinel: "sentinel",
  hunter: "hunter",
  warrior: "warrior",
  champion: "champion",
};

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const name = value.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(name);
  }
  return next;
}

function canonAbility(value: string): string {
  const trimmed = value.trim();
  return STATUS_CANON[trimmed.toLowerCase()] ?? trimmed;
}

function kitText(dragon: Dragon): string {
  const kit = dragonKit(dragon);
  return [kit.command, ...kit.extras.map((line) => line.body)].join(" ");
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function dragonProvides(dragon: Dragon, ability: string): boolean {
  const want = canonAbility(ability).toLowerCase();
  if (!want) return false;
  if ((dragon.provides ?? []).some((item) => item.toLowerCase() === want)) {
    return true;
  }
  if (dragon.tags.some((tag) => tag.toLowerCase() === want)) return true;
  if (want === "control effect") {
    return CONTROL_EFFECTS.some((effect) => dragonProvides(dragon, effect));
  }
  return false;
}

function extraNeedsFromKit(text: string): string[] {
  const found: string[] = [];
  const re = /if any ally has ([A-Za-z][A-Za-z-]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const key = match[1].toLowerCase();
    if (STATUS_CANON[key]) found.push(STATUS_CANON[key]);
  }
  return found;
}

export function dragonNeeds(dragon: Dragon): string[] {
  return uniqueNames([
    ...(dragon.needs ?? []),
    ...extraNeedsFromKit(kitText(dragon)),
  ]).map(canonAbility);
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

function knownProviders(ability: string, excludeId: string): string[] {
  return DRAGONS.filter(
    (dragon) => dragon.id !== excludeId && dragonProvides(dragon, ability),
  )
    .map((dragon) => dragon.name)
    .slice(0, 3);
}

function tryHint(ability: string, excludeId: string): string {
  const names = knownProviders(ability, excludeId);
  if (names.length === 0) return "";
  return ` Try ${joinNames(names)}.`;
}

function missedBreedDetail(
  dragon: Dragon,
  rule: PartnerRule,
): string {
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

export function pairingFit(
  dragon: Dragon,
  teammates: { dragon: Dragon }[],
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
    for (const need of dragonNeeds(mate.dragon)) {
      if (dragonProvides(mate.dragon, need)) continue;
      if (!dragonProvides(dragon, need)) continue;
      fits.push({
        text: `Gives ${mate.dragon.name} ${need}`,
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
  for (const need of dragonNeeds(dragon)) {
    if (dragonProvides(dragon, need)) continue;
    const partner = teammates.find((mate) =>
      dragonProvides(mate.dragon, need),
    );
    if (!partner) continue;
    fits.push({
      text: `Gets ${need} from ${partner.dragon.name}`,
      points: 30,
    });
  }
  return fits;
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

    for (const rule of partnerRules(row.dragon)) {
      const partners = mates.filter(
        (mate) => mate.dragon.breed === rule.breed,
      );
      const breed = breedLabels[rule.breed];
      if (partners.length === 0) {
        cons.push({
          id: `con:${row.dragon.id}:breed:${rule.breed}`,
          tone: "con",
          title: rule.gift
            ? `${row.dragon.name}’s ${rule.gift} needs an ally ${breed}`
            : `${row.dragon.name} needs an ally ${breed}`,
          detail: missedBreedDetail(row.dragon, rule),
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

    for (const need of dragonNeeds(row.dragon)) {
      if (dragonProvides(row.dragon, need)) continue;
      const providers = mates.filter((mate) =>
        dragonProvides(mate.dragon, need),
      );
      if (providers.length === 0) {
        cons.push({
          id: `con:${row.dragon.id}:need:${need.toLowerCase()}`,
          tone: "con",
          title: `${row.dragon.name} wants ${need} on a teammate`,
          detail: `Nobody on this line provides ${need}, so the habits that scale with it stay weak.${tryHint(need, row.dragon.id)}`,
        });
      } else {
        const names = joinNames(providers.map((mate) => mate.dragon.name));
        const verb = providers.length === 1 ? "is feeding" : "are feeding";
        pros.push({
          id: `pro:${row.dragon.id}:need:${need.toLowerCase()}`,
          tone: "pro",
          title: `${names}’s ${need} ${verb} ${row.dragon.name}`,
          detail: `${row.dragon.name}’s kit is written to scale when a teammate brings ${need}.`,
        });
      }
    }
  }

  return { pros, cons, placedCount: placed.length };
}
