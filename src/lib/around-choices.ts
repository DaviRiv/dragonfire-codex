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
import { boardFromBook, bookAround } from "@/lib/line-book";
import { isTank } from "@/lib/roles";
import { partnerRules, pairingReport, type PairingNote } from "@/lib/pairing";
import { analyzeLineup, type SynergyNote, type SynergyReport } from "@/lib/synergy";
import type { Dragon, Lineup, LineupMode, PitState, SlotId, TroopType } from "@/lib/types";

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

function seatingKey(line: BoardLine): string {
  return `${line.left}|${line.vanguard}|${line.right}`;
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

export type SeatLock = { dragonId: string; stars: number };

function overlayPins(
  pins: { id: string; stars: number }[],
  state: PitState,
): PitState {
  let owned = state.owned;
  for (const pin of pins) {
    const prev = owned.find((row) => row.dragonId === pin.id);
    owned = owned.filter((row) => row.dragonId !== pin.id);
    owned.push(
      newOwnedDragon(
        pin.id,
        pin.stars,
        prev?.reignLevel ?? 1,
        defaultHabits(pin.stars),
        prev?.habitRanks,
      ),
    );
  }
  return { ...state, owned };
}

function evaluatePinnedLine(
  line: BoardLine,
  pins: { id: string; stars: number }[],
  state: PitState,
): AroundChoice {
  const pinIds = new Set(pins.map((pin) => pin.id));
  const lineup = lineupFromBoard({
    ...line,
    id: `around-${boardFingerprint(line)}`,
  });
  const ranked = overlayPins(pins, state);
  const pairing = pairingReport(lineup, ranked);
  const synergy = analyzeLineup(lineup, ranked);
  const kit = pins.flatMap((pin) => kitNotesFor(pin.id, pin.stars));
  const goals = seatsOf(line)
    .filter((id) => !pinIds.has(id))
    .flatMap((id) =>
      pins.flatMap((pin) => {
        const pinned = getCatalogDragon(pin.id);
        return pinned ? partnerGoalNotes(id, pinned, pin.stars, ranked) : [];
      }),
    );
  const pinNames = pins
    .map((pin) => getCatalogDragon(pin.id)?.name)
    .filter((name): name is string => Boolean(name));
  const pairingPros = fromPairing(pairing.pros);
  const pairingCons = fromPairing(pairing.cons).filter((note) => {
    return !pinNames.some(
      (name) =>
        note.title.startsWith(`${name} has `) && note.title.includes(" at "),
    );
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

function evaluateLine(
  line: BoardLine,
  pinnedId: string,
  stars: number,
  state: PitState,
): AroundChoice {
  return evaluatePinnedLine(line, [{ id: pinnedId, stars }], state);
}

function lineMatchesLocks(
  line: BoardLine,
  locks: { slot: SlotId; id: string; stars: number }[],
): boolean {
  return locks.every((lock) => line[lock.slot] === lock.id);
}

function withLockStars(
  line: BoardLine,
  locks: { slot: SlotId; id: string; stars: number }[],
  state: PitState,
): BoardLine {
  const bySlot = new Map(locks.map((lock) => [lock.slot, lock] as const));
  function star(slot: SlotId, id: string): number {
    const lock = bySlot.get(slot);
    if (lock) return lock.stars;
    return pitRank(state, id) ?? 1;
  }
  return {
    ...line,
    leftStars: star("left", line.left),
    vanguardStars: star("vanguard", line.vanguard),
    rightStars: star("right", line.right),
  };
}

function boardFromLocks(
  locks: { slot: SlotId; id: string; stars: number }[],
  troop: TroopType,
): BoardLine | null {
  const bySlot = new Map(locks.map((lock) => [lock.slot, lock] as const));
  const left = bySlot.get("left");
  const vanguard = bySlot.get("vanguard");
  const right = bySlot.get("right");
  if (!left || !vanguard || !right) return null;
  const ids = [left.id, vanguard.id, right.id];
  if (new Set(ids).size !== 3) return null;
  const names = ids.map((id) => getCatalogDragon(id)?.name ?? id);
  return {
    name: names.join(" · "),
    why: "",
    troop,
    mode: "pvp",
    left: left.id,
    vanguard: vanguard.id,
    right: right.id,
    leftStars: left.stars,
    vanguardStars: vanguard.stars,
    rightStars: right.stars,
  };
}

export function evaluateAroundLine(
  line: BoardLine,
  pinnedId: string,
  stars: number,
  state: PitState,
): AroundChoice {
  return evaluateLine(line, pinnedId, stars, state);
}

export function choicesAroundDragon(opts: {
  dragonId: string;
  stars: number;
  troop: TroopType;
  mode?: LineupMode;
  limit?: number;
  state?: PitState;
  /** Only seat lines on `troop` — skip affinity/other-troop variants. */
  lockTroop?: boolean;
}): AroundChoice[] {
  const dragon = getCatalogDragon(opts.dragonId);
  if (!dragon) return [];
  const stars = Math.min(10, Math.max(1, Math.round(opts.stars) || 1));
  const limit = opts.limit ?? 16;
  const mode = opts.mode ?? "pvp";
  const state = opts.state ?? emptyPit();
  const found: AroundChoice[] = [];
  const seen = new Set<string>();

  for (const entry of bookAround(opts.dragonId, opts.troop, mode)) {
    const line = boardFromBook(entry, { id: opts.dragonId, stars });
    if (!line) continue;
    const key = boardFingerprint(line);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(evaluateLine(line, opts.dragonId, stars, state));
  }

  const affinities = new Set(dragon.affinities);
  const troops = opts.lockTroop
    ? [opts.troop]
    : uniqueTroops(opts.dragonId, opts.troop);
  const kitByTroop = new Map(
    troops.map((troop) => [
      troop,
      troop === opts.troop || affinities.has(troop)
        ? kitTeamsAround({
            dragonId: opts.dragonId,
            stars,
            troop,
            mode,
          })
        : [],
    ]),
  );

  for (const troop of troops) {
    const kit = kitByTroop.get(troop) ?? [];
    const lines = [
      ...suggestTeamsAround({
        dragonId: opts.dragonId,
        stars,
        troop,
        mode,
        limit: troop === opts.troop ? 16 : 6,
      }),
      ...kit.slice(0, troop === opts.troop || affinities.has(troop) ? 12 : 0),
    ];
    for (const line of lines) {
      const key = boardFingerprint(line);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(evaluateLine(line, opts.dragonId, stars, state));
    }
  }

  found.sort((a, b) => b.score - a.score);
  const bestSeat = new Map<string, AroundChoice>();
  for (const choice of found) {
    const key = seatingKey(choice.line);
    const prev = bestSeat.get(key);
    if (!prev || choice.score > prev.score) bestSeat.set(key, choice);
  }
  const ranked = [...bestSeat.values()].sort((a, b) => b.score - a.score);

  function kitTriosFor(troop: TroopType): string[] {
    const kit = kitByTroop.get(troop) ?? [];
    const trios: string[] = [];
    for (const line of kit) {
      const key = trioKey(line);
      if (trios.includes(key)) continue;
      trios.push(key);
      if (trios.length >= 5) break;
    }
    return trios;
  }

  function seatingsOf(trio: string): AroundChoice[] {
    return ranked.filter((row) => trioKey(row.line) === trio).slice(0, 2);
  }

  const kitPinned: AroundChoice[] = [];
  const pinnedTrios = new Set<string>();
  const kitRoom = Math.min(limit, 12);

  function pinTrio(trio: string, room: number) {
    if (pinnedTrios.has(trio) || kitPinned.length >= room) return;
    const pair = seatingsOf(trio);
    if (pair.length === 0) return;
    pinnedTrios.add(trio);
    for (const row of pair) {
      if (kitPinned.length >= room) break;
      kitPinned.push(row);
    }
  }

  const selectedRoom = Math.max(8, kitRoom - 2);
  for (const entry of bookAround(opts.dragonId, opts.troop, mode)) {
    const line = boardFromBook(entry, { id: opts.dragonId, stars });
    if (line) pinTrio(trioKey(line), selectedRoom);
  }
  for (const trio of kitTriosFor(opts.troop)) pinTrio(trio, selectedRoom);
  for (const troop of troops) {
    if (troop === opts.troop || !affinities.has(troop)) continue;
    for (const trio of kitTriosFor(troop)) pinTrio(trio, kitRoom);
  }

  const trioCount = new Map<string, number>();
  for (const row of kitPinned) {
    const trio = trioKey(row.line);
    trioCount.set(trio, (trioCount.get(trio) ?? 0) + 1);
  }
  const rest: AroundChoice[] = [];
  for (const choice of ranked) {
    if (kitPinned.includes(choice)) continue;
    const trio = trioKey(choice.line);
    const n = trioCount.get(trio) ?? 0;
    if (n >= 2) continue;
    trioCount.set(trio, n + 1);
    rest.push(choice);
  }
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

export function choicesAroundSeats(opts: {
  seats: Partial<Record<SlotId, SeatLock | null | undefined>>;
  troop: TroopType;
  mode?: LineupMode;
  limit?: number;
  state?: PitState;
}): AroundChoice[] {
  const locks = (["left", "vanguard", "right"] as const)
    .map((slot) => {
      const seat = opts.seats[slot];
      if (!seat?.dragonId) return null;
      return {
        slot,
        id: seat.dragonId,
        stars: Math.min(10, Math.max(1, Math.round(seat.stars) || 1)),
      };
    })
    .filter((row): row is { slot: SlotId; id: string; stars: number } =>
      Boolean(row),
    );
  if (locks.length === 0) return [];
  const limit = opts.limit ?? 16;
  const mode = opts.mode ?? "pvp";
  const state = opts.state ?? emptyPit();
  const pins = locks.map((lock) => ({ id: lock.id, stars: lock.stars }));
  const seen = new Set<string>();
  const found: AroundChoice[] = [];

  function take(line: BoardLine, bonus = 0) {
    if (!lineMatchesLocks(line, locks)) return;
    const next = withLockStars(line, locks, state);
    const key = seatingKey(next);
    if (seen.has(key)) return;
    seen.add(key);
    const choice = evaluatePinnedLine(next, pins, state);
    found.push(bonus ? { ...choice, score: choice.score + bonus } : choice);
  }

  for (const lock of locks) {
    for (const choice of choicesAroundDragon({
      dragonId: lock.id,
      stars: lock.stars,
      troop: opts.troop,
      mode,
      state,
      limit,
    })) {
      take(choice.line);
    }
  }

  const exact = boardFromLocks(locks, opts.troop);
  if (exact) take(exact, 80);

  found.sort((a, b) => b.score - a.score);
  return found.slice(0, limit);
}

export function seatStars(line: BoardLine, dragonId: string): number | null {
  if (line.left === dragonId) return line.leftStars;
  if (line.vanguard === dragonId) return line.vanguardStars;
  if (line.right === dragonId) return line.rightStars;
  return null;
}
