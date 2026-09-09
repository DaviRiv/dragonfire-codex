import { DRAGONS, getCatalogDragon } from "@/data/dragons";
import { STATUS_GLOSSARY } from "@/data/status-glossary";
import { joinNames } from "@/lib/abilities";
import {
  choicesAroundDragon,
  evaluateAroundLine,
  type AroundChoice,
  type ChoiceNote,
} from "@/lib/around-choices";
import { boardFingerprint, lineupFromBoard, type BoardLine } from "@/lib/boards";
import {
  CUT_HEAL,
  INTERRUPT_HEAL,
  analyzeEnemy,
  lineProvidesAbility,
  type EnemyLine,
  type EnemyProfile,
} from "@/lib/counter";
import { emptyPit } from "@/lib/dragons";
import {
  defaultCounterTroop,
  troopMatchup,
  troopMatchupCopy,
} from "@/lib/labels";
import { boardFromBook, bookAgainst } from "@/lib/line-book";
import { isCrowdControl, isHealer, isTank } from "@/lib/roles";
import type { Dragon, PitState, TroopType } from "@/lib/types";

export type CounterChoice = AroundChoice & {
  matchup: ReturnType<typeof troopMatchup>;
};

function trioKey(line: BoardLine): string {
  return [line.left, line.vanguard, line.right].slice().sort().join("|");
}

function seatingKey(line: BoardLine): string {
  return `${line.left}|${line.vanguard}|${line.right}`;
}

function pitStars(state: PitState, dragonId: string): number | null {
  const row = state.owned.find((item) => item.dragonId === dragonId);
  return row ? row.starRank : null;
}

function starsOn(line: BoardLine, dragonId: string): number {
  if (line.left === dragonId) return line.leftStars;
  if (line.vanguard === dragonId) return line.vanguardStars;
  return line.rightStars;
}

function applySeatStars(
  line: BoardLine,
  state: PitState,
  anchorId: string,
  anchorStars: number,
): BoardLine {
  const star = (id: string) =>
    id === anchorId ? anchorStars : (pitStars(state, id) ?? 6);
  const next: BoardLine = {
    ...line,
    leftStars: star(line.left),
    vanguardStars: star(line.vanguard),
    rightStars: star(line.right),
  };
  return next;
}

function stampPitStars(line: BoardLine, state: PitState): BoardLine {
  const star = (id: string) => pitStars(state, id) ?? 6;
  return {
    ...line,
    leftStars: star(line.left),
    vanguardStars: star(line.vanguard),
    rightStars: star(line.right),
  };
}

function usesEnemy(line: BoardLine, enemy: EnemyLine): boolean {
  const taken = new Set([enemy.left, enemy.vanguard, enemy.right]);
  return [line.left, line.vanguard, line.right].some((id) => taken.has(id));
}

function pinId(line: BoardLine): string {
  const ids = [line.right, line.left, line.vanguard];
  for (const ability of [...CUT_HEAL, ...INTERRUPT_HEAL]) {
    for (const id of ids) {
      const dragon = getCatalogDragon(id);
      if (dragon?.provides?.some((gate) => gate.ability === ability)) return id;
    }
  }
  for (const id of ids) {
    const dragon = getCatalogDragon(id);
    if (dragon && isHealer(dragon)) return id;
  }
  return line.left;
}

function ownedCount(line: BoardLine, state: PitState): number {
  return [line.left, line.vanguard, line.right].filter(
    (id) => pitStars(state, id) != null,
  ).length;
}

function healerNames(profile: EnemyProfile): string {
  return joinNames(profile.healers.map((row) => row.dragon.name));
}

function counterNotes(
  line: BoardLine,
  enemy: EnemyLine,
  profile: EnemyProfile,
): { pros: ChoiceNote[]; cons: ChoiceNote[]; bonus: number } {
  const pros: ChoiceNote[] = [];
  const cons: ChoiceNote[] = [];
  let bonus = 0;
  const match = troopMatchup(line.troop, enemy.troop);
  const troopTitle = troopMatchupCopy(line.troop, enemy.troop);
  if (match === "beats") {
    bonus += 90;
    pros.push({
      title: troopTitle,
      detail:
        "Tile advantage is the documented march triangle, not Army Power.",
    });
  } else if (match === "even") {
    cons.push({
      title: troopTitle,
      detail: "Same troop type — kits have to win the fight, not the tile.",
    });
  } else {
    bonus -= 70;
    cons.push({
      title: troopTitle,
      detail: "They hold the tile triangle. Pick the troop that beats theirs.",
    });
  }

  const ids = [line.left, line.vanguard, line.right];
  const starOf = (id: string) => starsOn(line, id);

  if (profile.healers.length > 0) {
    const names = healerNames(profile);
    for (const ability of INTERRUPT_HEAL) {
      const casters = lineProvidesAbility(ids, starOf, ability);
      if (casters.length === 0) continue;
      const glossary = STATUS_GLOSSARY[ability];
      bonus += 36;
      pros.push({
        title: `${joinNames(casters.map((row) => row.name))}’s ${ability} answers ${names}’s Recovery`,
        detail: glossary,
        ability,
        dragonId: casters[0]?.id,
      });
    }
    for (const ability of CUT_HEAL) {
      const casters = lineProvidesAbility(ids, starOf, ability);
      if (casters.length === 0) continue;
      const glossary = STATUS_GLOSSARY[ability];
      bonus += 40;
      pros.push({
        title: `${joinNames(casters.map((row) => row.name))} applies ${ability} into ${names}’s Recovery`,
        detail: glossary,
        ability,
        dragonId: casters[0]?.id,
      });
    }
  }

  return { pros, cons, bonus };
}

function scoreAnchor(dragon: Dragon, troop: TroopType, state: PitState): number {
  let score = 0;
  if (dragon.affinities.includes(troop)) score += 40;
  if (isHealer(dragon)) score += 28;
  if (isTank(dragon)) score += 18;
  if (isCrowdControl(dragon)) score += 22;
  if (dragon.provides?.some((gate) => gate.ability === "Prey")) score += 36;
  if (dragon.provides?.some((gate) => gate.ability === "Stun")) score += 30;
  if (dragon.provides?.some((gate) => gate.ability === "Overwhelm")) score += 30;
  const pit = pitStars(state, dragon.id);
  if (pit != null) score += 16 + pit;
  return score;
}

function pickAnchors(
  troop: TroopType,
  state: PitState,
  exclude: Set<string>,
  limit = 6,
): { id: string; stars: number }[] {
  const interrupt = new Set(["Stun", "Overwhelm", "Prey"]);
  const ranked = DRAGONS.map((dragon) => {
    if (exclude.has(dragon.id)) return null;
    let score = scoreAnchor(dragon, troop, state);
    if (dragon.provides?.some((gate) => interrupt.has(gate.ability))) {
      score += 20;
    }
    if (score <= 0) return null;
    return {
      dragon,
      score,
      stars: pitStars(state, dragon.id) ?? 6,
    };
  })
    .filter((row): row is { dragon: Dragon; score: number; stars: number } =>
      Boolean(row),
    )
    .sort(
      (a, b) =>
        b.score - a.score || a.dragon.name.localeCompare(b.dragon.name),
    );
  const out: { id: string; stars: number }[] = [];
  for (const row of ranked) {
    if (out.some((item) => item.id === row.dragon.id)) continue;
    out.push({ id: row.dragon.id, stars: row.stars });
    if (out.length >= limit) break;
  }
  return out;
}

function decorate(
  choice: AroundChoice,
  enemy: EnemyLine,
  profile: EnemyProfile,
  state: PitState,
): CounterChoice {
  const extra = counterNotes(choice.line, enemy, profile);
  const pit = ownedCount(choice.line, state);
  const score = choice.score + extra.bonus + pit * 8;
  const seen = new Set<string>();
  const pros: ChoiceNote[] = [];
  for (const note of [...extra.pros, ...choice.pros]) {
    const key = note.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pros.push(note);
    if (pros.length >= 6) break;
  }
  const cons: ChoiceNote[] = [];
  const conSeen = new Set<string>();
  for (const note of [...extra.cons, ...choice.cons]) {
    const key = note.title.toLowerCase();
    if (conSeen.has(key)) continue;
    conSeen.add(key);
    cons.push(note);
    if (cons.length >= 6) break;
  }
  return {
    ...choice,
    score,
    pros,
    cons,
    matchup: troopMatchup(choice.line.troop, enemy.troop),
    label:
      extra.bonus >= 90
        ? "Troop advantage"
        : extra.bonus < 0
          ? "Troop disadvantage"
          : choice.label,
  };
}

export function choicesAgainstEnemy(opts: {
  enemy: EnemyLine;
  troop?: TroopType;
  state?: PitState;
  limit?: number;
}): CounterChoice[] {
  const enemy = opts.enemy;
  if (!getCatalogDragon(enemy.left) || !getCatalogDragon(enemy.vanguard) || !getCatalogDragon(enemy.right)) {
    return [];
  }
  if (new Set([enemy.left, enemy.vanguard, enemy.right]).size !== 3) return [];
  const troop = opts.troop ?? defaultCounterTroop(enemy.troop);
  const limit = opts.limit ?? 12;
  const state = opts.state ?? emptyPit();
  const profile = analyzeEnemy(enemy);
  const exclude = new Set([enemy.left, enemy.vanguard, enemy.right]);
  const found: CounterChoice[] = [];
  const seen = new Set<string>();

  function take(choice: AroundChoice, line: BoardLine, fromBook = false) {
    if (usesEnemy(line, enemy)) return;
    const key = seatingKey(line);
    if (seen.has(key)) return;
    seen.add(key);
    const next: AroundChoice = {
      ...choice,
      line,
      id: boardFingerprint(line),
      lineup: lineupFromBoard({ ...line, id: `counter-${boardFingerprint(line)}` }),
    };
    const decorated = decorate(next, enemy, profile, state);
    if (fromBook) decorated.score += 120;
    found.push(decorated);
  }

  for (const entry of bookAgainst(enemy, troop)) {
    const raw = boardFromBook(entry);
    if (!raw) continue;
    const line = stampPitStars(raw, state);
    const pin = pinId(line);
    take(evaluateAroundLine(line, pin, starsOn(line, pin), state), line, true);
  }

  for (const anchor of pickAnchors(troop, state, exclude)) {
    const raw = choicesAroundDragon({
      dragonId: anchor.id,
      stars: anchor.stars,
      troop,
      mode: "pvp",
      limit: 10,
      state,
      lockTroop: true,
    });
    for (const choice of raw) {
      const line = applySeatStars(choice.line, state, anchor.id, anchor.stars);
      take(choice, line);
    }
  }

  found.sort((a, b) => b.score - a.score);
  const best = new Map<string, CounterChoice>();
  for (const choice of found) {
    const key = trioKey(choice.line);
    const prev = best.get(key);
    if (!prev || choice.score > prev.score) best.set(key, choice);
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.line.name.localeCompare(b.line.name))
    .slice(0, limit);
}

export function enemyTroopGuess(ids: (string | null)[]): TroopType | null {
  const counts = new Map<TroopType, number>();
  for (const id of ids) {
    if (!id) continue;
    const dragon = getCatalogDragon(id);
    if (!dragon) continue;
    for (const troop of dragon.affinities) {
      counts.set(troop, (counts.get(troop) ?? 0) + 1);
    }
  }
  let best: TroopType | null = null;
  let n = 0;
  for (const [troop, count] of counts) {
    if (count > n) {
      best = troop;
      n = count;
    }
  }
  if (best) return best;
  for (const id of ids) {
    const dragon = id ? getCatalogDragon(id) : null;
    if (dragon?.affinities[0]) return dragon.affinities[0];
  }
  return null;
}
