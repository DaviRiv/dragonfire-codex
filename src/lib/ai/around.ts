import { ONLINE_DPS_CORE } from "@/data/meta";
import { DRAGONS } from "@/data/dragons";
import { emptyPit, findDragon } from "@/lib/dragons";
import { isHealer, isTank } from "@/lib/roles";
import { suggestDragons, suggestFullLine } from "@/lib/suggest";
import { emptySlots, makePick } from "@/lib/lineup";
import type { BoardLine } from "@/lib/boards";
import { boardFingerprint } from "@/lib/boards";
import type { Dragon, Lineup, LineupMode, SlotId, TroopType } from "@/lib/types";

export function preferredSlot(dragon: Dragon): SlotId {
  if (isTank(dragon)) return "vanguard";
  if (isHealer(dragon)) return "left";
  return "right";
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

function metaLine(stars: number, dragonId: string): BoardLine | null {
  const core = ONLINE_DPS_CORE;
  const ids = [core.left.id, core.vanguard.id, core.right.id];
  if (!ids.includes(dragonId)) return null;
  if (ids.some((id) => !findDragon(id))) return null;
  return lineFromIds({
    troop: core.troop,
    mode: core.mode,
    pinnedId: dragonId,
    stars,
    left: core.left.id,
    vanguard: core.vanguard.id,
    right: core.right.id,
  });
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
    preferredSlot(dragon),
    "left",
    "vanguard",
    "right",
  ] as SlotId[]);
  const found: BoardLine[] = [];
  const seen = new Set<string>();

  function take(line: BoardLine | null) {
    if (!line || found.length >= limit) return;
    if (!seatsOf(line).includes(opts.dragonId)) return;
    const key = boardFingerprint(line);
    if (seen.has(key)) return;
    seen.add(key);
    found.push(line);
  }

  if (opts.troop === ONLINE_DPS_CORE.troop) {
    take(metaLine(stars, opts.dragonId));
  }

  for (const slot of slotOrder) {
    const exclude = new Set<string>();
    for (let attempt = 0; attempt < 6 && found.length < limit; attempt++) {
      const line = fillAround({
        dragonId: opts.dragonId,
        stars,
        slot,
        troop: opts.troop,
        mode: opts.mode,
        exclude,
      });
      if (!line) break;
      take(line);
      for (const id of seatsOf(line)) {
        if (id !== opts.dragonId) exclude.add(id);
      }
    }
  }

  const firstPool = limit > 8 ? 6 : 4;
  const secondPool = limit > 8 ? 4 : 3;
  for (const slot of slotOrder) {
    if (found.length >= limit) break;
    for (const line of fillPartners({
      dragonId: opts.dragonId,
      stars,
      slot,
      troop: opts.troop,
      mode: opts.mode,
      firstPool,
      secondPool,
    })) {
      take(line);
      if (found.length >= limit) break;
    }
  }

  return found;
}
