import { localComboLines } from "@/lib/ai/local";
import { kitTeamsAround, preferredSlot } from "@/lib/ai/around";
import { choicesAroundDragon, evaluateAroundLine, type AroundChoice } from "@/lib/around-choices";
import { detectMode, detectTroop } from "@/lib/ai/intent";
import {
  DEFAULT_MODE,
  DEFAULT_TROOP,
  lineSignature,
  type TurnPlan,
} from "@/lib/ai/conversation";
import type { AiLine } from "@/lib/ai/prompt";
import type { RosterCard, SuggestRequest } from "@/lib/ai/roster";
import { CURRENT_META_LINES, ONLINE_DPS_CORE, metaSeatIds } from "@/data/meta";
import { makePick } from "@/lib/lineup";
import { allDragons, findDragon, newOwnedDragon } from "@/lib/dragons";
import { canonAbility, dragonProvides } from "@/lib/abilities";
import { defaultHabits } from "@/lib/habits";
import {
  habitNumberForUnlockStars,
  habitPreview,
  kitProgress,
  liveOwnedHabitRanks,
  liveOwnedHabits,
} from "@/lib/habits";
import { modeLabels, troopLabels } from "@/lib/labels";
import { partnerRules, pairingReport } from "@/lib/pairing";
import { isFinisher, isHealer, isMitigation, isTank } from "@/lib/roles";
import { suggestFullLine } from "@/lib/suggest";
import type {
  Lineup,
  LineupKind,
  LineupMode,
  PitState,
  SlotId,
  TroopType,
} from "@/lib/types";

export const COACH_STARTERS = [
  "Build me a team around Vhagar",
  "Who pairs best with Malachite?",
  "Build a rally team around Caraxes",
  "Team with Venator without Vhagar",
] as const;

export function guessTroopMode(text: string): {
  troop: TroopType;
  mode: LineupMode;
} {
  return {
    troop: detectTroop(text) ?? DEFAULT_TROOP,
    mode: detectMode(text) ?? DEFAULT_MODE,
  };
}

function namesToSkip(question: string, roster: RosterCard[]): string[] {
  const hay = question.toLowerCase();
  if (
    !/\b(skip|without|busy|marching|already|leave out|not use)\b/.test(hay)
  ) {
    return [];
  }
  return roster
    .filter((card) => {
      const name = card.name.toLowerCase();
      return name.length >= 3 && (hay.includes(name) || hay.includes(card.id));
    })
    .map((card) => card.id);
}

function wantsOnlineDps(question: string, troop: TroopType, mode: LineupMode) {
  if (/\b(online|meta)\b/i.test(question)) return true;
  if (/\bspear|\brally|\bpve|\bcampaign|\bdefen|\bgather/.test(question.toLowerCase())) {
    return false;
  }
  return mode === "pvp" && troop === "shieldbearers";
}

function metaLineIfFree(
  request: SuggestRequest,
  skip: string[],
): AiLine | null {
  const core = ONLINE_DPS_CORE;
  const ids = metaSeatIds(core);
  if (ids.some((id) => skip.includes(id))) return null;
  const cards = ids.map((id) => request.roster.find((card) => card.id === id));
  if (cards.some((card) => !card)) return null;
  if (request.skipUsed && cards.some((card) => card?.otherTeam)) return null;
  return {
    name: core.name,
    troop: core.troop,
    mode: core.mode,
    left: core.left.id,
    vanguard: core.vanguard.id,
    right: core.right.id,
    why: core.why,
  };
}

function nameFor(id: string, state: PitState): string {
  return findDragon(id, state.customDragons)?.name ?? id;
}

function nameList(ids: string[], state: PitState): string {
  return ids.map((id) => nameFor(id, state)).join(", ");
}

function benchmarkPitState(state: PitState, minStars = 6): PitState {
  const byId = new Map(state.owned.map((row) => [row.dragonId, row] as const));
  const owned = allDragons(state.customDragons).map((dragon) => {
    const existing = byId.get(dragon.id);
    if (existing && existing.starRank >= minStars) return existing;
    return newOwnedDragon(
      dragon.id,
      minStars,
      existing?.reignLevel ?? 25,
      defaultHabits(minStars),
      existing?.habitRanks,
    );
  });
  return { ...state, owned };
}

function describeLineNatural(
  choice: AroundChoice,
  evalState: PitState,
): string {
  const left = findDragon(choice.line.left, evalState.customDragons);
  const vanguard = findDragon(choice.line.vanguard, evalState.customDragons);
  const right = findDragon(choice.line.right, evalState.customDragons);
  if (!left || !vanguard || !right) {
    return `${choice.line.vanguard} in Vanguard, ${choice.line.left} left, ${choice.line.right} right.`;
  }

  const aiLine: AiLine = {
    name: choice.id,
    troop: choice.line.troop,
    mode: choice.line.mode,
    left: choice.line.left,
    vanguard: choice.line.vanguard,
    right: choice.line.right,
    why: "",
  };
  return explainLineThorough(aiLine, evalState, "hatchery", {
  compact: true,
  choicePros: choice.pros,
  });
}

/** Natural-language breakdown of roles, affinity, and kit synergies for chat + cards. */
export function explainLineThorough(
  line: AiLine,
  state: PitState,
  pool: SuggestRequest["pool"],
  opts?: {
    lead?: string;
    compact?: boolean;
    choicePros?: AroundChoice["pros"];
  },
): string {
  const left = findDragon(line.left, state.customDragons);
  const vanguard = findDragon(line.vanguard, state.customDragons);
  const right = findDragon(line.right, state.customDragons);
  if (!left || !vanguard || !right) return line.why || seatSentence(line, state);

  const troopName = troopLabels[line.troop];
  const modeName = modeLabels[line.mode];
  const report = pairingReport(lineupFromAiLine(line, state, pool), state);
  const dragons = [left, vanguard, right];
  const offTroop = dragons.filter((d) => !d.affinities.includes(line.troop));

  const sentences: string[] = [];
  if (opts?.lead) sentences.push(opts.lead);

  const lane: string[] = [];
  if (isTank(vanguard)) {
    lane.push(
      `${vanguard.name} taunts in Vanguard to soak focus and protect the wings`,
    );
  } else if (isMitigation(vanguard)) {
    lane.push(`${vanguard.name} mitigates in Vanguard so the line survives burst`);
  } else {
    lane.push(`${vanguard.name} leads Vanguard`);
  }
  const healer = dragons.find(isHealer);
  const finisher = dragons.find(isFinisher);
  if (healer && healer.id !== vanguard.id) {
    lane.push(`${healer.name} keeps Recovery online for sustain`);
  }
  if (finisher && finisher.id !== healer?.id && finisher.id !== vanguard.id) {
    lane.push(`${finisher.name} converts setup into finish damage`);
  }
  sentences.push(
    `For ${modeName}, ${lane.join("; ")}.`,
  );

  if (offTroop.length === 0) {
    sentences.push(
      `All three share ${troopName} affinity, so you keep the full +20% troop stat bonus on every dragon.`,
    );
  } else {
    sentences.push(
      `${offTroop.map((d) => d.name).join(" and ")} sit off-troop here and miss that +20% bonus — only use this if nothing full-affinity fits your roster.`,
    );
  }

  const kitFromChoice = (opts?.choicePros ?? [])
    .slice(0, opts?.compact ? 2 : 4)
    .map((note) =>
      (note.detail?.trim() || note.title).replace(/\.$/, ""),
    );
  const kitFromReport = report.pros
    .slice(0, opts?.compact ? 2 : 5)
    .map((note) =>
      (note.detail?.trim() || note.title).replace(/\.$/, ""),
    );
  const kitBits = [...new Set([...kitFromChoice, ...kitFromReport])].slice(
    0,
    opts?.compact ? 2 : 4,
  );
  if (kitBits.length > 0) {
    sentences.push(
      `Mechanically, ${kitBits.join(". ")}.`,
    );
  }

  const starNotes = starHabitNotes(line, state, pool);
  const stars = dragons
    .map((dragon) => {
      const owned = state.owned.find((row) => row.dragonId === dragon.id);
      return `${dragon.name} ${owned?.starRank ?? 10}★`;
    })
    .join(", ");
  sentences.push(
    `Copilot ranked the actual star profile (${stars}), because habits unlock at 2★, 4★, 6★, 8★, and 10★.`,
  );
  if (starNotes.live.length > 0) {
    sentences.push(`Star unlocks: ${starNotes.live.join(" ")}`);
  }
  if (starNotes.goals.length > 0) {
    sentences.push(`Next synergy breakpoint: ${starNotes.goals.join(" ")}`);
  }

  if (!opts?.compact && report.cons.length > 0) {
    const gaps = report.cons
      .slice(0, 2)
      .map((note) => note.title.replace(/\.$/, ""));
    sentences.push(`Trade-off: ${gaps.join("; ")}.`);
  }

  return sentences.join(" ");
}

type StarHabitSummary = { live: string[]; goals: string[]; score: number };

/**
 * Explain only habit gates that materially interact with this exact line.
 * Pairing notes already know whether a provider/consumer gate is live at the
 * player's rank, so we do not praise a 10★ kit when the pit owns 4★.
 */
function starHabitNotes(
  line: AiLine,
  state: PitState,
  pool: SuggestRequest["pool"],
): StarHabitSummary {
  const lineup = lineupFromAiLine(line, state, pool);
  const report = pairingReport(lineup, state);
  const live: string[] = [];
  const goals: string[] = [];

  for (const note of report.pros) {
    const ids = [line.left, line.vanguard, line.right];
    const owner = ids
      .map((id) => {
        const dragon = findDragon(id, state.customDragons);
        const owned = state.owned.find((row) => row.dragonId === id);
        if (!dragon || !owned) return null;
        const gates = [...(dragon.needs ?? []), ...(dragon.provides ?? [])];
        const gate = gates.find(
          (candidate) =>
            candidate.unlockStars != null &&
            (!note.ability ||
              canonAbility(candidate.ability) === canonAbility(note.ability)),
        );
        if (!gate?.unlockStars || owned.starRank < gate.unlockStars) return null;
        return { dragon, owned, gate };
      })
      .find(Boolean);
    if (!owner) continue;
    const habit = habitNumberForUnlockStars(owner.gate.unlockStars);
    if (
      habit != null &&
      !liveOwnedHabits(owner.owned, "pit")?.includes(habit)
    ) {
      continue;
    }
    const rank = habit
      ? liveOwnedHabitRanks(owner.owned)[habit - 1]
      : undefined;
    const body = habit
      ? habitPreview(owner.dragon.id, habit - 1, rank)
      : "";
    const reason = body && body !== "Not recorded yet."
      ? ` ${body}`
      : ` It enables ${note.title.replace(/\.$/, "")}.`;
    live.push(
      `${owner.dragon.name} is ${owner.owned.starRank}★; its ${owner.gate.unlockStars}★ Habit${habit ? ` ${habit}` : ""} is live.${reason}`,
    );
  }

  for (const note of report.cons) {
    if (note.cause !== "stars" || note.stars == null) continue;
    const have =
      note.ownedStars == null ? "not owned" : `${note.ownedStars}★`;
    goals.push(
      `${note.title.replace(/\.$/, "")} (currently ${have}); that habit must unlock before this pairing fires.`,
    );
  }

  if (live.length === 0 && goals.length === 0) {
    for (const id of [line.left, line.vanguard, line.right]) {
      const dragon = findDragon(id, state.customDragons);
      const owned = state.owned.find((row) => row.dragonId === id);
      if (!dragon || !owned) continue;
      const progress = kitProgress(dragon, owned.starRank, owned.habits);
      const next = progress.nextUnlocks[0];
      if (!next) continue;
      const named = next.habits[0];
      const effect = next.effects[0];
      goals.push(
        `${dragon.name} is ${owned.starRank}★; ${next.stars}★ unlocks ${named ? `Habit ${named.habit}` : effect ?? "its next habit"}, which Copilot will re-evaluate for stronger pairings.`,
      );
    }
  }

  return {
    live: [...new Set(live)].slice(0, 2),
    goals: [...new Set(goals)].slice(0, 2),
    score: live.length * 12 - goals.length * 16,
  };
}

function copilotChoiceScore(
  choice: AroundChoice,
  mode: LineupMode,
  primaryTroop: TroopType,
  state: PitState,
  pool: SuggestRequest["pool"],
): number {
  const left = findDragon(choice.line.left, state.customDragons);
  const vanguard = findDragon(choice.line.vanguard, state.customDragons);
  const right = findDragon(choice.line.right, state.customDragons);
  if (!left || !vanguard || !right) return choice.score;
  const dragons = [left, vanguard, right];
  let score = choice.score;
  const starLine: AiLine = {
    name: choice.id,
    troop: choice.line.troop,
    mode: choice.line.mode,
    left: choice.line.left,
    vanguard: choice.line.vanguard,
    right: choice.line.right,
    why: "",
  };
  score += starHabitNotes(
    starLine,
    state,
    pool,
  ).score;
  const combatMode = mode === "pvp" || mode === "defense" || mode === "rally";
  if (combatMode) {
    if (isTank(vanguard)) score += 32;
    else if (dragons.some(isMitigation)) score += 6;
    else if (dragons.some(isTank)) score += 6;
    else score -= 18;
  }
  const offTroopCount = dragons.filter(
    (d) => !d.affinities.includes(choice.line.troop),
  ).length;
  if (offTroopCount === 0) score += 30;
  else score -= offTroopCount * 60;

  if (choice.cons.length === 0) score += 6;
  const distinctStatuses = new Set<string>();
  for (const dragon of dragons) {
    if (dragon.rarity === "legendary") score += 6;
    if (/\bCleanse\b/i.test(dragon.command)) score += 8;
    if (dragonProvides(dragon, "Resistance", 10)) score += 8;
    for (const gate of dragon.provides ?? []) {
      if (dragonProvides(dragon, canonAbility(gate.ability), 10)) {
        distinctStatuses.add(canonAbility(gate.ability));
      }
    }
    for (const rule of partnerRules(dragon, 10)) {
      if (dragons.some((mate) => mate.id !== dragon.id && mate.breed === rule.breed)) {
        score += 14;
      }
    }
  }
  score += distinctStatuses.size * 4;
  if (choice.line.troop === primaryTroop) score += 6;
  const isMetaCore = CURRENT_META_LINES.some(
    (core) =>
      core.troop === choice.line.troop &&
      core.mode === choice.line.mode &&
      core.left.id === choice.line.left &&
      core.vanguard.id === choice.line.vanguard &&
      core.right.id === choice.line.right,
  );
  if (isMetaCore) score += 5;
  return score;
}

function anchoredComboLines(input: {
  anchorId: string;
  anchorSlot?: SlotId | null;
  lockTroop?: boolean;
  request: SuggestRequest;
  state: PitState;
  lineup: Lineup;
  troop: TroopType;
  mode: LineupMode;
  skip: string[];
}): AiLine[] {
  const dragon = findDragon(input.anchorId, input.state.customDragons);
  if (!dragon) return [];
  const evalState =
    input.request.pool === "hatchery"
      ? benchmarkPitState(input.state, 10)
      : input.state;
  const owned = evalState.owned.find((row) => row.dragonId === input.anchorId);
  const stars = owned?.starRank ?? 10;
  const skipSet = new Set(input.skip.filter((id) => id !== input.anchorId));
  const usedElsewhere = new Set(
    input.request.pool === "pit"
      ? input.request.roster
          .filter((card) => Boolean(card.otherTeam) && card.id !== input.anchorId)
          .map((card) => card.id)
      : [],
  );
  const allowed = new Set(input.request.roster.map((card) => card.id));
  const primaryTroop = input.lockTroop
    ? input.troop
    : (dragon.affinities[0] ?? input.troop);
  const troop = input.lockTroop ? input.troop : primaryTroop;
  const troopsToSearch = input.lockTroop
    ? [input.troop]
    : [...new Set([primaryTroop, ...dragon.affinities])];

  const fromChoices = choicesAroundDragon({
    dragonId: input.anchorId,
    stars,
    troop,
    mode: input.mode,
    state: evalState,
    limit: 24,
    lockTroop: Boolean(input.lockTroop),
    availableIds: input.request.pool === "pit" ? allowed : undefined,
  });
  const fromKit = troopsToSearch.flatMap((t) =>
    kitTeamsAround({
      dragonId: input.anchorId,
      stars,
      troop: t,
      mode: input.mode,
    }),
  );

  const seen = new Set<string>();
  const merged: AroundChoice[] = [];
  for (const choice of fromChoices) {
    const key = `${choice.line.left}|${choice.line.vanguard}|${choice.line.right}|${choice.line.troop}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(choice);
  }
  for (const line of fromKit) {
    const key = `${line.left}|${line.vanguard}|${line.right}|${line.troop}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(evaluateAroundLine(line, input.anchorId, stars, evalState));
  }

  const filtered = merged.filter((choice) => {
    const seats = [choice.line.left, choice.line.vanguard, choice.line.right];
    if (!seats.includes(input.anchorId)) return false;
    if (seats.some((id) => skipSet.has(id) || usedElsewhere.has(id))) return false;
    if (input.anchorSlot && choice.line[input.anchorSlot] !== input.anchorId) {
      return false;
    }
    if (input.request.pool === "pit") {
      return seats.every((id) => id === input.anchorId || allowed.has(id));
    }
    return true;
  });

  // Never break troop affinity (+20% stats) when full-affinity teams exist.
  const fullAffinity = filtered.filter((choice) =>
    [choice.line.left, choice.line.vanguard, choice.line.right].every((id) =>
      findDragon(id, evalState.customDragons)?.affinities.includes(
        choice.line.troop,
      ),
    ),
  );
  const eligible = fullAffinity.length > 0 ? fullAffinity : filtered;

  const scored = eligible
    .map((choice) => ({
      choice,
      rank: copilotChoiceScore(
        choice,
        input.mode,
        primaryTroop,
        evalState,
        input.request.pool,
      ),
    }))
    .sort((a, b) => b.rank - a.rank || b.choice.score - a.choice.score);

  // Deduplicate identical 3-dragon trios (keep highest-scoring seating),
  // and when Any troop is active, ensure each affinity gets a top pick so
  // multi-troop dragons (e.g. Malachite Cavalry + Shieldbearers) surface both.
  const byTrio = new Map<string, (typeof scored)[number]>();
  for (const item of scored) {
    const trio = [
      item.choice.line.left,
      item.choice.line.vanguard,
      item.choice.line.right,
    ]
      .sort()
      .join("|");
    if (!byTrio.has(trio)) byTrio.set(trio, item);
  }
  const uniqueTrios = [...byTrio.values()];
  let candidates: AroundChoice[];
  if (!input.lockTroop && troopsToSearch.length > 1) {
    const picked: AroundChoice[] = [];
    const pickedIds = new Set<string>();
    for (const t of troopsToSearch) {
      const bestForTroop = uniqueTrios.find(
        (item) =>
          item.choice.line.troop === t && !pickedIds.has(item.choice.id),
      );
      if (bestForTroop) {
        picked.push(bestForTroop.choice);
        pickedIds.add(bestForTroop.choice.id);
      }
    }
    for (const item of uniqueTrios) {
      if (pickedIds.has(item.choice.id)) continue;
      picked.push(item.choice);
      pickedIds.add(item.choice.id);
      if (picked.length >= 6) break;
    }
    candidates = picked.slice(0, 6);
  } else {
    candidates = uniqueTrios.slice(0, 12).map((item) => item.choice);
  }

  const cap = input.lockTroop ? 12 : 6;
  if (candidates.length > 0) {
    return candidates.slice(0, cap).map((choice, index) => ({
      name:
        index === 0
          ? `${dragon.name} core`
          : `${dragon.name} option ${index + 1}`,
      troop: choice.line.troop,
      mode: choice.line.mode,
      left: choice.line.left,
      vanguard: choice.line.vanguard,
      right: choice.line.right,
      why: describeLineNatural(choice, evalState),
    }));
  }

  // Fallback: fill the remaining two seats directly from the active roster.
  const seat = input.anchorSlot ?? preferredSlot(dragon);
  const blocked = new Set([
    ...skipSet,
    ...usedElsewhere,
    ...(input.request.pool === "pit"
      ? allDragons(input.state.customDragons)
          .map((row) => row.id)
          .filter((id) => id !== input.anchorId && !allowed.has(id))
      : []),
  ]);
  const working: Lineup = {
    ...input.lineup,
    troop: input.troop,
    mode: input.mode,
    kind: "theory",
    slots: {
      left: null,
      vanguard: null,
      right: null,
      [seat]: makePick(input.anchorId, stars, owned?.reignLevel ?? 1),
    },
  };
  const out: AiLine[] = [];
  for (let i = 0; i < 3; i++) {
    const picks = suggestFullLine(working, input.state, {
      excludeIds: blocked,
    });
    const left =
      seat === "left"
        ? dragon
        : picks.find((pick) => pick.slot === "left")?.dragon;
    const vanguard =
      seat === "vanguard"
        ? dragon
        : picks.find((pick) => pick.slot === "vanguard")?.dragon;
    const right =
      seat === "right"
        ? dragon
        : picks.find((pick) => pick.slot === "right")?.dragon;
    if (!left || !vanguard || !right) break;
    if (
      input.request.pool === "pit" &&
      (!allowed.has(left.id) ||
        !allowed.has(vanguard.id) ||
        !allowed.has(right.id))
    ) {
      break;
    }
    for (const pick of picks) {
      if (pick.dragon.id !== input.anchorId) blocked.add(pick.dragon.id);
    }
    out.push({
      name:
        i === 0 ? `${dragon.name} core` : `${dragon.name} option ${i + 1}`,
      troop: input.troop,
      mode: input.mode,
      left: left.id,
      vanguard: vanguard.id,
      right: right.id,
      why: `${vanguard.name} in Vanguard, ${left.name} left, ${right.name} right.`,
    });
  }
  return out;
}

/**
 * Rank lines for one troop / mode with a set of names held back. Same
 * composition order as Suggest: meta as a tie-break hint, then jobs, pairing,
 * and star habits from the ranker (ChatGPT may re-order when signed in).
 */
export function coachLines(input: {
  request: SuggestRequest;
  state: PitState;
  lineup: Lineup;
  troop: TroopType;
  mode: LineupMode;
  skip: string[];
  /** Prefer lines the thread has not offered yet. */
  avoidSignatures?: string[];
  question?: string;
  anchorId?: string | null;
  anchorSlot?: SlotId | null;
  lockTroop?: boolean;
  /** How many lines to return (defaults to 6, or 12 when lockTroop). */
  maxLines?: number;
}): AiLine[] {
  const working: Lineup = {
    ...input.lineup,
    troop: input.troop,
    mode: input.mode,
  };
  let lines: AiLine[];
  if (input.anchorId) {
    lines = anchoredComboLines({
      anchorId: input.anchorId,
      anchorSlot: input.anchorSlot,
      lockTroop: input.lockTroop,
      request: input.request,
      state: input.state,
      lineup: working,
      troop: input.troop,
      mode: input.mode,
      skip: input.skip,
    });
  } else {
    const question = input.question ?? "";
    const meta = wantsOnlineDps(question, input.troop, input.mode)
      ? metaLineIfFree(input.request, input.skip)
      : null;
    const extra = [...input.skip, ...(meta ? metaSeatIds() : [])];
    const ranked = localComboLines(working, input.state, input.request.roster, extra);
    lines = meta
      ? [meta, ...ranked.filter((line) => line.name !== meta.name)]
      : ranked;
  }
  const cap =
    input.maxLines ??
    (input.lockTroop ? 12 : 6);
  lines = lines.slice(0, cap);
  const avoid = new Set(input.avoidSignatures ?? []);
  if (avoid.size === 0) return lines;
  const fresh = lines.filter((line) => !avoid.has(lineSignature(line)));
  return fresh.length > 0 ? fresh : lines;
}

/** Payoffs minus gaps from the shared pairing rules. Higher is stronger. */
function lineScore(
  line: AiLine,
  state: PitState,
  pool: SuggestRequest["pool"],
): { pros: number; cons: number; score: number } {
  const report = pairingReport(lineupFromAiLine(line, state, pool), state);
  return {
    pros: report.pros.length,
    cons: report.cons.length,
    score: report.pros.length - report.cons.length,
  };
}

function seatSentence(line: AiLine, state: PitState): string {
  return `${nameFor(line.left, state)} left, ${nameFor(line.vanguard, state)} vanguard, ${nameFor(line.right, state)} right`;
}

function formationReply(opts: {
  lines: AiLine[];
  state: PitState;
  request: SuggestRequest;
  troop: TroopType;
  mode: LineupMode;
  skip: string[];
  again: boolean;
  anchorId?: string | null;
}): string {
  const head = opts.lines[0];
  const anchorName = opts.anchorId ? nameFor(opts.anchorId, opts.state) : null;
  if (!head) {
    if (anchorName) {
      return opts.request.pool === "pit"
        ? `No full-affinity ${troopLabels[opts.troop]} ${modeLabels[opts.mode]} line around ${anchorName} fits your owned pit right now. Switch the pool to All dragons or clear an exclusion.`
        : `No line around ${anchorName} matched with those exclusions. Clear a skip or try another troop/seat.`;
    }
    return opts.skip.length > 0
      ? `Nothing left to seat once ${nameList(opts.skip, opts.state)} sit out. Bring one of them back, or switch the pool to All dragons.`
      : "I need at least three dragons in this pool before I can seat a line.";
  }
  const troop = troopLabels[head.troop];
  const mode = modeLabels[head.mode];
  const heldBack = opts.skip.length
    ? `, benching ${nameList(opts.skip, opts.state)}`
    : "";

  const lead = opts.again
    ? anchorName
      ? `Another ${mode} angle around ${anchorName}${heldBack}.`
      : `Another ${troop} ${mode} line${heldBack}.`
    : anchorName
      ? `Best ${mode} fit around ${anchorName}${heldBack} — lineup is on the cards above.`
      : `Top ${troop} ${mode} options${heldBack} — lineup is on the cards above.`;

  const body = explainLineThorough(head, opts.state, opts.request.pool, {
    lead,
  });

  const altCount = Math.min(2, opts.lines.slice(1).length);
  const altNote =
    altCount > 0
      ? `Alternate cards swap partners while keeping the same core; say who to exclude or ask for another.`
      : "Name exclusions, another troop, or a different mode if you want to refine this.";

  return `${body} ${altNote}`;
}

export type CoachAnswer = { reply: string; lines: AiLine[] };

/**
 * Answer one planned turn. The plan already carries the troop, mode, and
 * exclusions the thread agreed on, so follow-ups keep their context.
 */
export function answerPlan(
  plan: TurnPlan,
  request: SuggestRequest,
  state: PitState,
  lineup: Lineup,
): CoachAnswer {
  const pool = request.pool;

  if (plan.intent === "explain" && plan.referenced.length > 0) {
    const line = plan.referenced[0];
    const lead = `${line.name} (${troopLabels[line.troop]} ${modeLabels[line.mode]}):`;
    return {
      reply: explainLineThorough(line, state, pool, { lead }),
      lines: plan.referenced,
    };
  }

  if (plan.intent === "compare" && plan.referenced.length > 0) {
    const scored = plan.referenced.map((line, index) => ({
      line,
      index,
      ...lineScore(line, state, pool),
    }));
    const ranked = [...scored].sort(
      (a, b) => b.score - a.score || a.index - b.index,
    );
    if (ranked.length === 1) {
      const only = ranked[0];
      return {
        reply: `Only ${only.line.name} is on the table right now — ${only.pros} payoff${only.pros === 1 ? "" : "s"} and ${only.cons} gap${only.cons === 1 ? "" : "s"} from the pairing rules. Ask for another option to compare.`,
        lines: plan.referenced,
      };
    }
    const detail = ranked
      .map(
        (row) =>
          `${row.line.name} (${row.pros} payoff${row.pros === 1 ? "" : "s"}, ${row.cons} gap${row.cons === 1 ? "" : "s"})`,
      )
      .join(" then ");
    const top = ranked[0];
    return {
      reply: `Strongest first: ${detail}. ${top.line.name} wins — ${seatSentence(top.line, state)}. ${top.line.why}`,
      lines: ranked.map((row) => row.line),
    };
  }

  if (plan.intent === "seat" && plan.referenced.length > 0) {
    const line = plan.referenced[0];
    return {
      reply: `${line.name} it is — ${seatSentence(line, state)}. Tap Save team on the card to add it to your pit marches.`,
      lines: [line],
    };
  }

  const avoid =
    plan.intent === "another" ? plan.referenced.map(lineSignature) : [];
  const lines = coachLines({
    request,
    state,
    lineup,
    troop: plan.troop,
    mode: plan.mode,
    skip: plan.excludeIds,
    avoidSignatures: avoid,
    question: plan.question,
    anchorId: plan.anchorId,
    anchorSlot: plan.anchorSlot,
    lockTroop: plan.lockTroop,
  });

  if (plan.intent === "explain" || plan.intent === "compare") {
    const head = lines[0];
    if (!head) {
      return {
        reply:
          "I need at least three dragons in this pool before I can explain or compare lines.",
        lines,
      };
    }
    if (plan.intent === "compare" && lines.length > 1) {
      const top = lines[0];
      const runner = lines[1];
      return {
        reply: `${top.name} (${seatSentence(top, state)}) edges out ${runner.name} for ${troopLabels[plan.troop]} ${modeLabels[plan.mode]}. ${top.why}`,
        lines,
      };
    }
    const lead = `${head.name} (${troopLabels[plan.troop]} ${modeLabels[plan.mode]}):`;
    return {
      reply: explainLineThorough(head, state, pool, { lead }),
      lines,
    };
  }

  return {
    reply: formationReply({
      lines,
      state,
      request,
      troop: plan.troop,
      mode: plan.mode,
      skip: plan.excludeIds,
      again: plan.intent === "another",
      anchorId: plan.anchorId,
    }),
    lines,
  };
}

/** Single-shot answer with no thread behind it. */
export function localCoachAnswer(
  question: string,
  request: SuggestRequest,
  state: PitState,
  lineup: Lineup,
): CoachAnswer {
  const guess = guessTroopMode(question);
  const skip = namesToSkip(question, request.roster);
  return answerPlan(
    {
      question,
      intent: "formation",
      troop: guess.troop,
      mode: guess.mode,
      excludeIds: skip,
      referenced: [],
      ordinal: null,
      roleTarget: null,
      followUp: false,
    },
    request,
    state,
    lineup,
  );
}

export function lineupFromAiLine(
  line: AiLine,
  state: PitState,
  pool: SuggestRequest["pool"],
): Lineup {
  const ids = [line.left, line.vanguard, line.right];
  const allOwned = ids.every((id) =>
    state.owned.some((owned) => owned.dragonId === id),
  );
  const kind: LineupKind =
    pool === "pit" && allOwned ? "pit" : "theory";
  const pickFor = (id: string) => {
    const owned = state.owned.find((row) => row.dragonId === id);
    return makePick(
      id,
      owned?.starRank ?? 10,
      owned?.reignLevel ?? 1,
    );
  };
  return {
    id: `coach-${line.left}-${line.vanguard}-${line.right}`,
    name: line.name,
    kind,
    mode: line.mode,
    troop: line.troop,
    notes: line.why,
    slots: {
      left: pickFor(line.left),
      vanguard: pickFor(line.vanguard),
      right: pickFor(line.right),
    },
    ignoreLevel: kind === "theory",
    craftStars: 10,
    excludeUsed: kind === "pit",
    updatedAt: new Date().toISOString(),
  };
}
