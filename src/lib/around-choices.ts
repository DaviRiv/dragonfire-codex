import { HABIT_NAMES } from "@/data/habit-names";
import { STATUS_GLOSSARY } from "@/data/status-glossary";
import { getCatalogDragon } from "@/data/dragons";
import {
  canonAbility,
  dragonProvides,
  provideUnlockStars,
} from "@/lib/abilities";
import { kitTeamsAround, suggestTeamsAround } from "@/lib/ai/around";
import { boardFingerprint, lineupFromBoard, type BoardLine } from "@/lib/boards";
import { emptyPit, newOwnedDragon } from "@/lib/dragons";
import { defaultHabits, dragonKit } from "@/lib/habits";
import { TROOP_TYPES, breedLabels } from "@/lib/labels";
import { isTank } from "@/lib/roles";
import { partnerRules, pairingReport, type PairingNote } from "@/lib/pairing";
import { analyzeLineup, type SynergyNote, type SynergyReport } from "@/lib/synergy";
import type { Dragon, Lineup, LineupMode, PitState, TroopType } from "@/lib/types";

export type ChoiceNote = {
  title: string;
  detail?: string;
  ability?: string;
  dragonId?: string;
};

export type AroundChoice = {
  id: string;
  line: BoardLine;
  lineup: Lineup;
  score: number;
  label: string;
  pairing: ReturnType<typeof pairingReport>;
  synergy: SynergyReport;
  pros: ChoiceNote[];
  cons: ChoiceNote[];
};

function uniqueTroops(dragonId: string, preferred: TroopType): TroopType[] {
  const dragon = getCatalogDragon(dragonId);
  const next: TroopType[] = [];
  for (const troop of [preferred, ...(dragon?.affinities ?? []), ...TROOP_TYPES]) {
    if (!next.includes(troop)) next.push(troop);
  }
  return next.slice(0, 4);
}

function trioKey(line: BoardLine): string {
  return [line.left, line.vanguard, line.right].slice().sort().join("|");
}

function seatsOf(line: BoardLine): string[] {
  return [line.left, line.vanguard, line.right];
}

function pitRank(state: PitState, dragonId: string): number | null {
  return state.owned.find((row) => row.dragonId === dragonId)?.starRank ?? null;
}

/** Hypothetical partners sit at Command until the pit names a rank. */
function partnerRank(state: PitState, dragonId: string): number {
  return pitRank(state, dragonId) ?? 1;
}

function kitNotesFor(dragonId: string, stars: number): ChoiceNote[] {
  const dragon = getCatalogDragon(dragonId);
  if (!dragon) return [];
  const habits = defaultHabits(stars);
  const notes: ChoiceNote[] = [];
  for (const gate of dragon.provides ?? []) {
    const ability = canonAbility(gate.ability);
    if (!dragonProvides(dragon, ability, stars, habits)) continue;
    const glossary = STATUS_GLOSSARY[ability];
    if (!glossary) continue;
    notes.push({
      title: `${dragon.name} applies ${ability}`,
      detail: glossary,
      ability,
      dragonId,
    });
  }
  return notes;
}

function commandPlusClause(
  dragon: Dragon,
): { stars: number; clause: string } | null {
  const match = dragon.command.match(/At (\d+)\+\s*Stars:\s*([^.]+)\./i);
  if (!match) return null;
  return {
    stars: Number(match[1]),
    clause: `At ${match[1]}+ Stars: ${match[2].trim()}.`,
  };
}

function kitTouchesPinned(
  body: string,
  pinned: Dragon,
  pinnedStars: number,
  gifts: string[],
): boolean {
  const hay = body.toLowerCase();
  const breed = breedLabels[pinned.breed].toLowerCase();
  if (hay.includes(breed)) return true;
  for (const gift of gifts) {
    if (gift && hay.includes(gift.toLowerCase())) return true;
  }
  const habits = defaultHabits(pinnedStars);
  for (const gate of pinned.provides ?? []) {
    const ability = canonAbility(gate.ability);
    if (!dragonProvides(pinned, ability, pinnedStars, habits)) continue;
    if (hay.includes(ability.toLowerCase())) return true;
  }
  return false;
}

function partnerGoalNotes(
  partnerId: string,
  pinned: Dragon,
  pinnedStars: number,
  state: PitState,
): ChoiceNote[] {
  const partner = getCatalogDragon(partnerId);
  if (!partner) return [];
  const have = partnerRank(state, partnerId);
  const notes: ChoiceNote[] = [];
  const gifts = partnerRules(partner)
    .map((rule) => rule.gift)
    .filter((gift): gift is string => Boolean(gift));
  const plus = commandPlusClause(partner);
  const commandTouches =
    kitTouchesPinned(partner.command, pinned, pinnedStars, gifts) ||
    partnerRules(partner).some((rule) => rule.breed === pinned.breed);
  if (plus && commandTouches && have < plus.stars) {
    notes.push({
      title: `${partner.name}’s Command maxes at ${plus.stars}★`,
      detail: plus.clause,
      dragonId: partnerId,
    });
  }
  const kit = dragonKit(partner);
  for (const extra of kit.extras) {
    if (extra.unlockStars == null || extra.unlockStars <= have) continue;
    if (extra.title === "Vanguard") continue;
    if (!kitTouchesPinned(extra.body, pinned, pinnedStars, gifts)) continue;
    const habit = Number(extra.title.match(/Habit (\d+)/)?.[1] ?? 0);
    const habitName = HABIT_NAMES[partner.id]?.[habit - 1];
    const label = habitName ?? extra.title;
    const sentence = extra.body.split(/(?<=\.)\s+/)[0] ?? extra.body;
    notes.push({
      title: `${partner.name}’s ${label} unlocks at ${extra.unlockStars}★`,
      detail: sentence.trim(),
      dragonId: partnerId,
    });
  }
  for (const gate of partner.provides ?? []) {
    const ability = canonAbility(gate.ability);
    const need = provideUnlockStars(partner, ability);
    if (need == null || need <= have) continue;
    const glossary = STATUS_GLOSSARY[ability];
    if (!glossary) continue;
    notes.push({
      title: `${partner.name}’s ${ability} unlocks at ${need}★`,
      detail: glossary,
      ability,
      dragonId: partnerId,
    });
  }
  return notes;
}

function fromPairing(notes: PairingNote[]): ChoiceNote[] {
  return notes.map((note) => ({
    title: note.title,
    detail: note.detail,
    ability: note.ability,
  }));
}

function fromSynergy(notes: SynergyNote[]): ChoiceNote[] {
  return notes.map((note) => ({ title: note.text }));
}

function noteKey(title: string): string {
  return title.toLowerCase().split(".")[0]?.trim() ?? title.toLowerCase();
}

function dedupeNotes(notes: ChoiceNote[]): ChoiceNote[] {
  const seen = new Set<string>();
  const next: ChoiceNote[] = [];
  for (const note of notes) {
    const key = noteKey(note.title);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(note);
  }
  return next;
}

function overlayPinned(
  pinnedId: string,
  stars: number,
  state: PitState,
): PitState {
  const prev = state.owned.find((row) => row.dragonId === pinnedId);
  const owned = state.owned.filter((row) => row.dragonId !== pinnedId);
  owned.push(
    newOwnedDragon(
      pinnedId,
      stars,
      prev?.reignLevel ?? 1,
      defaultHabits(stars),
      prev?.habitRanks,
    ),
  );
  return { ...state, owned };
}

function evaluateLine(
  line: BoardLine,
  pinnedId: string,
  stars: number,
  state: PitState,
): AroundChoice {
  const pinned = getCatalogDragon(pinnedId);
  const lineup = lineupFromBoard({
    ...line,
    id: `around-${boardFingerprint(line)}`,
  });
  const ranked = overlayPinned(pinnedId, stars, state);
  const pairing = pairingReport(lineup, ranked);
  const synergy = analyzeLineup(lineup, ranked);
  const kit = pinned ? kitNotesFor(pinnedId, stars) : [];
  const goals = seatsOf(line)
    .filter((id) => id !== pinnedId)
    .flatMap((id) =>
      pinned ? partnerGoalNotes(id, pinned, stars, ranked) : [],
    );
  const pairingPros = fromPairing(pairing.pros);
  const pairingCons = fromPairing(pairing.cons).filter((note) => {
    if (!pinned) return true;
    if (note.title.startsWith(`${pinned.name} has `) && note.title.includes(" at ")) {
      return false;
    }
    return true;
  });
  const pros = dedupeNotes([
    ...kit,
    ...pairingPros,
    ...fromSynergy(synergy.notes.filter((note) => note.tone === "good")),
  ]).slice(0, 6);
  const cons = dedupeNotes([
    ...goals,
    ...pairingCons,
    ...fromSynergy(synergy.notes.filter((note) => note.tone === "warn")),
  ]).slice(0, 6);
  const score =
    synergy.score +
    pairing.pros.length * 10 -
    pairing.cons.length * 7 -
    goals.length * 3 +
    kit.length * 6;
  return {
    id: boardFingerprint(line),
    line,
    lineup,
    score,
    label: synergy.label,
    pairing,
    synergy,
    pros,
    cons,
  };
}

export function choicesAroundDragon(opts: {
  dragonId: string;
  stars: number;
  troop: TroopType;
  mode?: LineupMode;
  limit?: number;
  state?: PitState;
}): AroundChoice[] {
  const dragon = getCatalogDragon(opts.dragonId);
  if (!dragon) return [];
  const stars = Math.min(10, Math.max(1, Math.round(opts.stars) || 1));
  const limit = opts.limit ?? 16;
  const mode = opts.mode ?? "pvp";
  const state = opts.state ?? emptyPit();
  const found: AroundChoice[] = [];
  const seen = new Set<string>();

  for (const troop of uniqueTroops(opts.dragonId, opts.troop)) {
    const lines = [
      ...suggestTeamsAround({
        dragonId: opts.dragonId,
        stars,
        troop,
        mode,
        limit: troop === opts.troop ? 16 : 4,
      }),
      ...(troop === opts.troop
        ? kitTeamsAround({
            dragonId: opts.dragonId,
            stars,
            troop,
            mode,
          }).slice(0, 8)
        : []),
    ];
    for (const line of lines) {
      const key = boardFingerprint(line);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(evaluateLine(line, opts.dragonId, stars, state));
    }
  }

  found.sort((a, b) => b.score - a.score);
  const best = new Map<string, AroundChoice>();
  for (const choice of found) {
    const key = trioKey(choice.line);
    const prev = best.get(key);
    if (!prev || choice.score > prev.score) best.set(key, choice);
  }
  const ranked = [...best.values()].sort((a, b) => b.score - a.score);
  const kitKeep = new Set(
    kitTeamsAround({
      dragonId: opts.dragonId,
      stars,
      troop: opts.troop,
      mode,
    })
      .slice(0, 5)
      .map((line) => trioKey(line)),
  );
  const kitPinned = ranked.filter((choice) => kitKeep.has(trioKey(choice.line)));
  const rest = ranked.filter((choice) => !kitKeep.has(trioKey(choice.line)));
  const soak = rest.filter((choice) =>
    seatsOf(choice.line).some((id) => {
      const row = getCatalogDragon(id);
      return Boolean(row && isTank(row));
    }),
  );
  const flex = rest.filter((choice) => !soak.includes(choice));
  const remaining = Math.max(0, limit - kitPinned.length);
  const soakTake = Math.min(soak.length, Math.max(6, remaining - 4));
  const mixed: AroundChoice[] = [...kitPinned];
  for (const choice of [
    ...soak.slice(0, soakTake),
    ...flex.slice(0, Math.max(0, remaining - soakTake)),
    ...rest,
  ]) {
    if (mixed.some((row) => row.id === choice.id)) continue;
    mixed.push(choice);
    if (mixed.length >= limit) break;
  }
  return mixed.sort((a, b) => b.score - a.score);
}

export function seatStars(line: BoardLine, dragonId: string): number | null {
  if (line.left === dragonId) return line.leftStars;
  if (line.vanguard === dragonId) return line.vanguardStars;
  if (line.right === dragonId) return line.rightStars;
  return null;
}
