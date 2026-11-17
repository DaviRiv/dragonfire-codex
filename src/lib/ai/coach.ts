import { localComboLines } from "@/lib/ai/local";
import { preferredSlot } from "@/lib/ai/around";
import { choicesAroundDragon } from "@/lib/around-choices";
import { detectMode, detectTroop } from "@/lib/ai/intent";
import {
  DEFAULT_MODE,
  DEFAULT_TROOP,
  lineSignature,
  type TurnPlan,
} from "@/lib/ai/conversation";
import type { AiLine } from "@/lib/ai/prompt";
import type { RosterCard, SuggestRequest } from "@/lib/ai/roster";
import { ONLINE_DPS_CORE, metaSeatIds } from "@/data/meta";
import { makePick } from "@/lib/lineup";
import { allDragons, findDragon } from "@/lib/dragons";
import { modeLabels, troopLabels } from "@/lib/labels";
import { pairingReport } from "@/lib/pairing";
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
  "Seat the online DPS meta core",
  "Build a shield PvP core from my pit",
  "Who soaks if Vhagar is already marching?",
  "Spear rally with a healer",
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

function anchoredComboLines(input: {
  anchorId: string;
  anchorSlot?: SlotId | null;
  request: SuggestRequest;
  state: PitState;
  lineup: Lineup;
  troop: TroopType;
  mode: LineupMode;
  skip: string[];
}): AiLine[] {
  const dragon = findDragon(input.anchorId, input.state.customDragons);
  if (!dragon) return [];
  const owned = input.state.owned.find((row) => row.dragonId === input.anchorId);
  const stars = owned?.starRank ?? 6;
  const skipSet = new Set(input.skip.filter((id) => id !== input.anchorId));
  const allowed = new Set(input.request.roster.map((card) => card.id));
  const candidates = choicesAroundDragon({
    dragonId: input.anchorId,
    stars,
    troop: input.troop,
    mode: input.mode,
    state: input.state,
    limit: 16,
    lockTroop: true,
  }).filter((choice) => {
    const seats = [choice.line.left, choice.line.vanguard, choice.line.right];
    if (seats.some((id) => skipSet.has(id))) return false;
    if (input.anchorSlot && choice.line[input.anchorSlot] !== input.anchorId) {
      return false;
    }
    if (input.request.pool === "pit") {
      return seats.every((id) => id === input.anchorId || allowed.has(id));
    }
    return true;
  });

  if (candidates.length > 0) {
    return candidates.slice(0, 6).map((choice, index) => {
      const topNote = choice.pros[0]?.title;
      const reason = topNote
        ? `${topNote}. ${seatSentence(
            {
              name: choice.line.name,
              troop: choice.line.troop,
              mode: choice.line.mode,
              left: choice.line.left,
              vanguard: choice.line.vanguard,
              right: choice.line.right,
              why: "",
            },
            input.state,
          )}.`
        : `${seatSentence(
            {
              name: choice.line.name,
              troop: choice.line.troop,
              mode: choice.line.mode,
              left: choice.line.left,
              vanguard: choice.line.vanguard,
              right: choice.line.right,
              why: "",
            },
            input.state,
          )}.`;
      return {
        name:
          index === 0
            ? `${dragon.name} core`
            : `${dragon.name} option ${index + 1}`,
        troop: choice.line.troop,
        mode: choice.line.mode,
        left: choice.line.left,
        vanguard: choice.line.vanguard,
        right: choice.line.right,
        why: reason,
      };
    });
  }

  // Fallback: fill the remaining two seats directly from the active roster.
  const seat = input.anchorSlot ?? preferredSlot(dragon);
  const blocked = new Set([
    ...skipSet,
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
 * composition order as Suggest: meta core first when it is free, then healer,
 * soak, damage.
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
        ? `No complete ${troopLabels[opts.troop]} ${modeLabels[opts.mode]} line around ${anchorName} fits your owned pit right now. Switch the pool to All or adjust exclusions.`
        : `No line around ${anchorName} matched with those exclusions. Clear a skip or try another seat.`;
    }
    return opts.skip.length > 0
      ? `Nothing left to seat once ${nameList(opts.skip, opts.state)} sit out. Bring one of them back, or switch the pool to All.`
      : "I need at least three dragons in this pool before I can seat a line.";
  }
  const pool = opts.request.pool === "pit" ? "pit" : "full roster";
  const troop = troopLabels[opts.troop];
  const mode = modeLabels[opts.mode];
  const left = opts.skip.length
    ? ` Holding back ${nameList(opts.skip, opts.state)}.`
    : "";
  const alts = opts.lines.slice(1).length
    ? ` ${opts.lines.length - 1} alternate${opts.lines.length - 1 === 1 ? "" : "s"} below.`
    : "";
  const lead = opts.again ? "Different line" : "Best line";
  const around = anchorName ? ` around ${anchorName}` : "";
  return `${lead}${around} for ${troop} ${mode} from your ${pool}: ${head.name} — ${seatSentence(head, opts.state)}.${left}${alts}`;
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
    const report = pairingReport(lineupFromAiLine(line, state, pool), state);
    const pros = report.pros.slice(0, 2).map((note) => note.title);
    const cons = report.cons.slice(0, 2).map((note) => note.title);
    const why = `${line.name} is ${seatSentence(line, state)}. ${line.why}`;
    const payoff = pros.length ? ` Payoffs: ${pros.join("; ")}.` : "";
    const gaps = cons.length
      ? ` Gaps: ${cons.join("; ")}.`
      : " No gaps flagged by the pairing rules.";
    return { reply: `${why}${payoff}${gaps}`, lines: plan.referenced };
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
      reply: `${line.name} it is — ${seatSentence(line, state)}. Tap Seat on Team on the card to save it as a formation.`,
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
  });

  if (plan.intent === "explain" || plan.intent === "compare") {
    // Nothing offered yet to explain or compare — rank first, then say so.
    const head = lines[0];
    const reply = head
      ? `No line on the table yet, so here is the ranked one for ${troopLabels[plan.troop]} ${modeLabels[plan.mode]}: ${head.name} — ${seatSentence(head, state)}. ${head.why}`
      : "I need at least three dragons in this pool before I can compare lines.";
    return { reply, lines };
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
    excludeUsed: false,
    updatedAt: new Date().toISOString(),
  };
}
