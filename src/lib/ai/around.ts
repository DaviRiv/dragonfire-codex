import { ONLINE_DPS_CORE } from "@/data/meta";
import { DRAGONS } from "@/data/dragons";
import { emptyPit, findDragon } from "@/lib/dragons";
import { isHealer, isTank } from "@/lib/roles";
import { suggestFullLine } from "@/lib/suggest";
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
    name: "Boards",
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
  return `${vanguard} in Vanguard, ${left} on the left, ${right} on the right at ★${line.leftStars}.`;
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
    lineup.slots[pick.slot] = makePick(pick.dragon.id, opts.stars, 1);
  }
  const left = lineup.slots.left;
  const vanguard = lineup.slots.vanguard;
  const right = lineup.slots.right;
  if (!left || !vanguard || !right) return null;
  const ids = [left.dragonId, vanguard.dragonId, right.dragonId];
  if (new Set(ids).size !== 3) return null;
  if (!ids.includes(opts.dragonId)) return null;
  const draft: BoardLine = {
    name: "",
    why: "",
    troop: opts.troop,
    mode: opts.mode,
    left: left.dragonId,
    vanguard: vanguard.dragonId,
    right: right.dragonId,
    leftStars: opts.stars,
    vanguardStars: opts.stars,
    rightStars: opts.stars,
  };
  return {
    ...draft,
    name: nameLine(draft),
    why: whyFor(draft),
  };
}

function metaLine(stars: number, dragonId: string): BoardLine | null {
  const core = ONLINE_DPS_CORE;
  const ids = [core.left.id, core.vanguard.id, core.right.id];
  if (!ids.includes(dragonId)) return null;
  if (ids.some((id) => !findDragon(id))) return null;
  const draft: BoardLine = {
    name: core.name,
    why: core.why,
    troop: core.troop,
    mode: core.mode,
    left: core.left.id,
    vanguard: core.vanguard.id,
    right: core.right.id,
    leftStars: stars,
    vanguardStars: stars,
    rightStars: stars,
  };
  return draft;
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

  if (opts.mode === "pvp" && opts.troop === "shieldbearers") {
    take(metaLine(stars, opts.dragonId));
  }

  for (const slot of slotOrder) {
    const exclude = new Set<string>();
    for (let attempt = 0; attempt < 4 && found.length < limit; attempt++) {
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

  return found;
}
