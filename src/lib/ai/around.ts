import { CURRENT_META_LINES } from "@/data/meta";
import { DRAGONS } from "@/data/dragons";
import { emptyPit, findDragon } from "@/lib/dragons";
import { isFinisher, isHealer, isTank } from "@/lib/roles";
import { suggestDragons, suggestFullLine } from "@/lib/suggest";
import { emptySlots, makePick } from "@/lib/lineup";
import type { BoardLine } from "@/lib/boards";
import { boardFingerprint } from "@/lib/boards";
import type { Dragon, Lineup, LineupMode, SlotId, TroopType } from "@/lib/types";

/**
 * Ordered seats this kit actually wants. Tanks soak in Vanguard. Sentinel
 * Recovery (Malachite) stays Left. Healers whose Vanguard habit buffs the
 * Right Flank (Rhysarion) prefer Vanguard so that buff lands on a teammate;
 * Left is the other legal seat. Finishers go Right.
 */
export function preferredSlots(dragon: Dragon): SlotId[] {
  if (isTank(dragon)) return ["vanguard"];
  if (isHealer(dragon)) {
    if (dragon.flankBonus === "right") return ["vanguard", "left"];
    return ["left"];
  }
  return ["right"];
}

export function preferredSlot(dragon: Dragon): SlotId {
  return preferredSlots(dragon)[0] ?? "right";
}

function theoryLineup(troop: TroopType, mode: LineupMode, stars: number): Lineup {
  return {
    id: "boards-theory",
    name: "Team",
    kind: "theory",
    mode,
    troop,
    notes: "",
    slots: emptySlots(),
    ignoreLevel: true,
    craftStars: stars,
    excludeUsed: false,
    updatedAt: new Date().toISOString(),
  };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function seatsOf(line: BoardLine): string[] {
  return [line.left, line.vanguard, line.right];
}

function trioKey(line: Pick<BoardLine, "left" | "vanguard" | "right">): string {
  return [line.left, line.vanguard, line.right].slice().sort().join("|");
}

function seatingKey(line: Pick<BoardLine, "left" | "vanguard" | "right">): string {
  return `${line.left}|${line.vanguard}|${line.right}`;
}

function nameLine(line: BoardLine): string {
  const left = findDragon(line.left)?.name ?? line.left;
  const vanguard = findDragon(line.vanguard)?.name ?? line.vanguard;
  const right = findDragon(line.right)?.name ?? line.right;
  return `${left} · ${vanguard} · ${right}`;
}

function whyFor(line: BoardLine): string {
  const left = findDragon(line.left)?.name ?? line.left;
  const vanguard = findDragon(line.vanguard)?.name ?? line.vanguard;
  const right = findDragon(line.right)?.name ?? line.right;
  return `${vanguard} in Vanguard, ${left} on the left, ${right} on the right.`;
}

function lineFromIds(opts: {
  troop: TroopType;
  mode: LineupMode;
  pinnedId: string;
  stars: number;
  left: string;
  vanguard: string;
  right: string;
}): BoardLine | null {
  const ids = [opts.left, opts.vanguard, opts.right];
  if (new Set(ids).size !== 3) return null;
  if (!ids.includes(opts.pinnedId)) return null;
  if (ids.some((id) => !findDragon(id))) return null;
  const draft: BoardLine = {
    name: "",
    why: "",
    troop: opts.troop,
    mode: opts.mode,
    left: opts.left,
    vanguard: opts.vanguard,
    right: opts.right,
    leftStars: opts.left === opts.pinnedId ? opts.stars : 1,
    vanguardStars: opts.vanguard === opts.pinnedId ? opts.stars : 1,
    rightStars: opts.right === opts.pinnedId ? opts.stars : 1,
  };
  return {
    ...draft,
    name: nameLine(draft),
    why: whyFor(draft),
  };
}

function fillAround(opts: {
  dragonId: string;
  stars: number;
  slot: SlotId;
  troop: TroopType;
  mode: LineupMode;
  exclude: Set<string>;
}): BoardLine | null {
  const lineup = theoryLineup(opts.troop, opts.mode, opts.stars);
  lineup.slots[opts.slot] = makePick(opts.dragonId, opts.stars, 1);
  const picks = suggestFullLine(lineup, emptyPit(), {
    excludeIds: opts.exclude,
  });
  for (const pick of picks) {
    const rank = pick.dragon.id === opts.dragonId ? opts.stars : 1;
    lineup.slots[pick.slot] = makePick(pick.dragon.id, rank, 1);
  }
  const left = lineup.slots.left;
  const vanguard = lineup.slots.vanguard;
  const right = lineup.slots.right;
  if (!left || !vanguard || !right) return null;
  return lineFromIds({
    troop: opts.troop,
    mode: opts.mode,
    pinnedId: opts.dragonId,
    stars: opts.stars,
    left: left.dragonId,
    vanguard: vanguard.dragonId,
    right: right.dragonId,
  });
}

function fillPartners(opts: {
  dragonId: string;
  stars: number;
  slot: SlotId;
  troop: TroopType;
  mode: LineupMode;
  firstPool: number;
  secondPool: number;
}): BoardLine[] {
  const lineup = theoryLineup(opts.troop, opts.mode, opts.stars);
  lineup.slots[opts.slot] = makePick(opts.dragonId, opts.stars, 1);
  const fillOrder = (["vanguard", "left", "right"] as SlotId[]).filter(
    (slot) => slot !== opts.slot,
  );
  const [firstSlot, secondSlot] = fillOrder;
  if (!firstSlot || !secondSlot) return [];

  const firsts = suggestDragons({
    lineup,
    slot: firstSlot,
    state: emptyPit(),
  }).slice(0, opts.firstPool);

  const out: BoardLine[] = [];
  for (const first of firsts) {
    if (first.dragon.id === opts.dragonId) continue;
    const working: Lineup = {
      ...lineup,
      slots: { ...lineup.slots },
    };
    working.slots[firstSlot] = makePick(first.dragon.id, 1, 1);
    const seconds = suggestDragons({
      lineup: working,
      slot: secondSlot,
      state: emptyPit(),
    }).slice(0, opts.secondPool);
    for (const second of seconds) {
      if (
        second.dragon.id === opts.dragonId ||
        second.dragon.id === first.dragon.id
      ) {
        continue;
      }
      const seats = {
        left: opts.dragonId,
        vanguard: opts.dragonId,
        right: opts.dragonId,
        [opts.slot]: opts.dragonId,
        [firstSlot]: first.dragon.id,
        [secondSlot]: second.dragon.id,
      };
      const line = lineFromIds({
        troop: opts.troop,
        mode: opts.mode,
        pinnedId: opts.dragonId,
        stars: opts.stars,
        left: seats.left,
        vanguard: seats.vanguard,
        right: seats.right,
      });
      if (line) out.push(line);
    }
  }
  return out;
}

function kitLineScore(line: BoardLine): number {
  const left = findDragon(line.left);
  const vanguard = findDragon(line.vanguard);
  const right = findDragon(line.right);
  if (!left || !vanguard || !right) return 0;
  const bySlot = { left, vanguard, right } as const;
  const dragons = [left, vanguard, right];
  let score = 0;
  for (const [slot, dragon] of Object.entries(bySlot) as [SlotId, Dragon][]) {
    if (dragon.affinities.includes(line.troop)) score += 18;
    if (dragon.flankBonus === "right" && slot !== "right") score += 32;
    if (dragon.flankBonus === "left" && slot !== "left") score += 32;
    if (dragon.flankBonus === "right" && slot === "vanguard") score += 8;
    if (dragon.flankBonus === slot) score -= 8;
  }
  if (dragons.some(isHealer) && dragons.some(isFinisher)) score += 20;
  if (new Set(dragons.map((dragon) => dragon.breed)).size === 3) score += 12;
  if (
    !dragons.some(isTank) &&
    dragons.filter(isHealer).length >= 2 &&
    dragons.some(isFinisher)
  ) {
    score += 24;
  }
  return score;
}

function placePartners(
  pinSlot: SlotId,
  pinnedId: string,
  first: Dragon,
  second: Dragon,
): { left: string; vanguard: string; right: string } {
  const seats: Record<SlotId, string> = {
    left: "",
    vanguard: "",
    right: "",
  };
  seats[pinSlot] = pinnedId;
  let remaining = (["vanguard", "left", "right"] as SlotId[]).filter(
    (slot) => slot !== pinSlot,
  );

  function seat(dragon: Dragon): boolean {
    for (const slot of preferredSlots(dragon)) {
      if (!remaining.includes(slot)) continue;
      seats[slot] = dragon.id;
      remaining = remaining.filter((open) => open !== slot);
      return true;
    }
    return false;
  }

  const placedFirst = seat(first);
  const placedSecond = seat(second);
  if (!placedFirst && remaining[0]) {
    seats[remaining[0]] = first.id;
    remaining = remaining.slice(1);
  }
  if (!placedSecond && remaining[0]) {
    seats[remaining[0]] = second.id;
  }
  return { left: seats.left, vanguard: seats.vanguard, right: seats.right };
}

function fillKitPairs(opts: {
  dragonId: string;
  stars: number;
  slot: SlotId;
  troop: TroopType;
  mode: LineupMode;
}): BoardLine[] {
  const others = DRAGONS.filter((dragon) => dragon.id !== opts.dragonId);
  const pinned = findDragon(opts.dragonId);
  const healers = others.filter(isHealer);
  const finishers = others.filter(isFinisher);
  const tanks = others.filter(isTank);
  const pool: Dragon[][] = [];
  if (pinned && isFinisher(pinned) && !isHealer(pinned)) {
    for (let i = 0; i < healers.length; i++) {
      for (let j = i + 1; j < healers.length; j++) {
        pool.push([healers[i], healers[j]]);
      }
    }
    for (const healer of healers) {
      for (const tank of tanks) {
        pool.push([healer, tank]);
      }
    }
  } else {
    for (const healer of healers) {
      for (const finisher of finishers) {
        if (healer.id === finisher.id) continue;
        pool.push([healer, finisher]);
      }
    }
    if (pinned && isHealer(pinned)) {
      for (const healer of healers) {
        for (const second of healers) {
          if (healer.id >= second.id) continue;
          pool.push([healer, second]);
        }
      }
    }
  }
  if (pool.length === 0) {
    for (let i = 0; i < others.length; i++) {
      for (let j = i + 1; j < others.length; j++) {
        pool.push([others[i], others[j]]);
      }
    }
  }

  const best = new Map<string, { line: BoardLine; score: number }>();
  for (const [first, second] of pool) {
    for (const pair of [
      [first, second],
      [second, first],
    ] as const) {
      const seats = placePartners(opts.slot, opts.dragonId, pair[0], pair[1]);
      const line = lineFromIds({
        troop: opts.troop,
        mode: opts.mode,
        pinnedId: opts.dragonId,
        stars: opts.stars,
        ...seats,
      });
      if (!line) continue;
      const key = seatingKey(line);
      const score = kitLineScore(line);
      const prev = best.get(key);
      if (!prev || score > prev.score) best.set(key, { line, score });
    }
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.line.name.localeCompare(b.line.name))
    .map((row) => row.line);
}

function metaLines(
  stars: number,
  dragonId: string,
  troop: TroopType,
  mode: LineupMode,
): BoardLine[] {
  const out: BoardLine[] = [];
  for (const core of CURRENT_META_LINES) {
    if (core.troop !== troop || core.mode !== mode) continue;
    const ids = [core.left.id, core.vanguard.id, core.right.id];
    if (!ids.includes(dragonId)) continue;
    if (ids.some((id) => !findDragon(id))) continue;
    const line = lineFromIds({
      troop: core.troop,
      mode: core.mode,
      pinnedId: dragonId,
      stars,
      left: core.left.id,
      vanguard: core.vanguard.id,
      right: core.right.id,
    });
    if (line) out.push(line);
  }
  return out;
}

export function kitTeamsAround(opts: {
  dragonId: string;
  stars: number;
  troop: TroopType;
  mode: LineupMode;
}): BoardLine[] {
  const dragon = DRAGONS.find((row) => row.id === opts.dragonId);
  if (!dragon) return [];
  const stars = Math.min(10, Math.max(1, Math.round(opts.stars) || 1));
  const slots = preferredSlots(dragon);
  const batches = slots.map((slot) =>
    fillKitPairs({
      dragonId: opts.dragonId,
      stars,
      slot,
      troop: opts.troop,
      mode: opts.mode,
    }),
  );
  const primary = batches[0] ?? [];
  const rest = batches.slice(1).flat();
  const restByTrio = new Map<string, BoardLine[]>();
  for (const line of rest) {
    const key = trioKey(line);
    const rows = restByTrio.get(key) ?? [];
    rows.push(line);
    restByTrio.set(key, rows);
  }
  const out: BoardLine[] = [];
  const seen = new Set<string>();
  function take(line: BoardLine) {
    const key = seatingKey(line);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(line);
  }
  for (const line of primary) {
    take(line);
    for (const alt of restByTrio.get(trioKey(line)) ?? []) take(alt);
  }
  for (const line of rest) take(line);
  return out;
}

export function suggestTeamsAround(opts: {
  dragonId: string;
  stars: number;
  troop: TroopType;
  mode: LineupMode;
  limit?: number;
}): BoardLine[] {
  const dragon = DRAGONS.find((row) => row.id === opts.dragonId);
  if (!dragon) return [];
  const stars = Math.min(10, Math.max(1, Math.round(opts.stars) || 1));
  const limit = opts.limit ?? 5;
  const slotOrder = unique([
    ...preferredSlots(dragon),
    "left",
    "vanguard",
    "right",
  ] as SlotId[]);
  const found: BoardLine[] = [];
  const seen = new Set<string>();
  const compCap = limit > 8 ? Math.max(7, limit - 8) : limit;

  function take(line: BoardLine | null, cap = limit) {
    if (!line || found.length >= cap) return;
    if (!seatsOf(line).includes(opts.dragonId)) return;
    const key = boardFingerprint(line);
    if (seen.has(key)) return;
    seen.add(key);
    found.push(line);
  }

  for (const line of metaLines(stars, opts.dragonId, opts.troop, opts.mode)) {
    take(line, compCap);
  }

  for (const slot of slotOrder) {
    const exclude = new Set<string>();
    for (let attempt = 0; attempt < 6 && found.length < compCap; attempt++) {
      const line = fillAround({
        dragonId: opts.dragonId,
        stars,
        slot,
        troop: opts.troop,
        mode: opts.mode,
        exclude,
      });
      if (!line) break;
      take(line, compCap);
      for (const id of seatsOf(line)) {
        if (id !== opts.dragonId) exclude.add(id);
      }
    }
  }

  const firstPool = limit > 8 ? 6 : 4;
  const secondPool = limit > 8 ? 4 : 3;
  for (const slot of slotOrder) {
    if (found.length >= compCap) break;
    for (const line of fillPartners({
      dragonId: opts.dragonId,
      stars,
      slot,
      troop: opts.troop,
      mode: opts.mode,
      firstPool,
      secondPool,
    })) {
      take(line, compCap);
      if (found.length >= compCap) break;
    }
  }

  for (const slot of slotOrder) {
    if (found.length >= limit) break;
    for (const line of fillKitPairs({
      dragonId: opts.dragonId,
      stars,
      slot,
      troop: opts.troop,
      mode: opts.mode,
    })) {
      take(line);
      if (found.length >= limit) break;
    }
  }

  return found;
}
