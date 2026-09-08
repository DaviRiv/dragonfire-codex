import { STATUS_GLOSSARY } from "@/data/status-glossary";
import { canonAbility, dragonProvides } from "@/lib/abilities";
import { suggestTeamsAround } from "@/lib/ai/around";
import { boardFingerprint, lineupFromBoard, type BoardLine } from "@/lib/boards";
import { emptyPit, newOwnedDragon } from "@/lib/dragons";
import { defaultHabits } from "@/lib/habits";
import { pairingReport, type PairingNote } from "@/lib/pairing";
import { analyzeLineup, type SynergyNote, type SynergyReport } from "@/lib/synergy";
import { getCatalogDragon } from "@/data/dragons";
import type { Lineup, LineupMode, PitState, TroopType } from "@/lib/types";

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

/** Glossary statuses that raise Damage Dealt or Damage Received on a target. */
const DAMAGE_PAYOFFS = new Set([
  "First-Strike",
  "Double-Strike",
  "Advantage",
  "Vulnerable",
]);

function uniqueTroops(dragonId: string, preferred: TroopType): TroopType[] {
  const dragon = getCatalogDragon(dragonId);
  const next: TroopType[] = [];
  for (const troop of [preferred, ...(dragon?.affinities ?? [])]) {
    if (!next.includes(troop)) next.push(troop);
  }
  return next.slice(0, 3);
}

function seatsOf(line: BoardLine): string[] {
  return [line.left, line.vanguard, line.right];
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

function stateAtStars(
  line: BoardLine,
  stars: number,
  state: PitState,
): PitState {
  const seats = seatsOf(line);
  const owned = state.owned.filter((row) => !seats.includes(row.dragonId));
  for (const id of seats) {
    const prev = state.owned.find((row) => row.dragonId === id);
    owned.push(
      newOwnedDragon(
        id,
        stars,
        prev?.reignLevel ?? 1,
        defaultHabits(stars),
        prev?.habitRanks,
      ),
    );
  }
  return { ...state, owned };
}

function evaluateLine(
  line: BoardLine,
  pinnedId: string,
  stars: number,
  state: PitState,
): AroundChoice {
  const lineup = {
    ...lineupFromBoard({ ...line, id: `around-${boardFingerprint(line)}` }),
    craftStars: stars,
  };
  const ranked = stateAtStars(line, stars, state);
  const pairing = pairingReport(lineup, ranked);
  const synergy = analyzeLineup(lineup, ranked);
  const pinnedKit = kitNotesFor(pinnedId, stars);
  const partnerKit = seatsOf(line)
    .filter((id) => id !== pinnedId)
    .flatMap((id) => kitNotesFor(id, stars));
  const partnerDamage = partnerKit.filter(
    (note) => note.ability && DAMAGE_PAYOFFS.has(note.ability),
  );
  const partnerOther = partnerKit.filter(
    (note) => !note.ability || !DAMAGE_PAYOFFS.has(note.ability),
  );
  const pros = dedupeNotes([
    ...pinnedKit,
    ...partnerDamage,
    ...fromPairing(pairing.pros),
    ...partnerOther,
    ...fromSynergy(synergy.notes.filter((note) => note.tone === "good")),
  ]).slice(0, 6);
  const cons = dedupeNotes([
    ...fromPairing(pairing.cons),
    ...fromSynergy(synergy.notes.filter((note) => note.tone === "warn")),
  ]).slice(0, 5);
  const score =
    synergy.score +
    pairing.pros.length * 10 -
    pairing.cons.length * 7 +
    pinnedKit.length * 6 +
    partnerDamage.length * 8;
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
  mode: LineupMode;
  limit?: number;
  state?: PitState;
}): AroundChoice[] {
  const dragon = getCatalogDragon(opts.dragonId);
  if (!dragon) return [];
  const stars = Math.min(10, Math.max(1, Math.round(opts.stars) || 1));
  const limit = opts.limit ?? 6;
  const state = opts.state ?? emptyPit();
  const found: AroundChoice[] = [];
  const seen = new Set<string>();

  for (const troop of uniqueTroops(opts.dragonId, opts.troop)) {
    const lines = suggestTeamsAround({
      dragonId: opts.dragonId,
      stars,
      troop,
      mode: opts.mode,
      limit: troop === opts.troop ? 5 : 3,
    });
    for (const line of lines) {
      const key = boardFingerprint(line);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(evaluateLine(line, opts.dragonId, stars, state));
    }
  }

  found.sort((a, b) => b.score - a.score);
  return found.slice(0, limit);
}
