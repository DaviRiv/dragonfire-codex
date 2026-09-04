import { localComboLines } from "@/lib/ai/local";
import type { AiLine } from "@/lib/ai/prompt";
import type { RosterCard, SuggestRequest } from "@/lib/ai/roster";
import { ONLINE_DPS_CORE, metaSeatIds } from "@/data/meta";
import { makePick } from "@/lib/lineup";
import { findDragon } from "@/lib/dragons";
import { modeLabels, troopLabels } from "@/lib/labels";
import type {
  Lineup,
  LineupKind,
  LineupMode,
  PitState,
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
  const hay = text.toLowerCase();
  let troop: TroopType = "shieldbearers";
  if (/\bspear/.test(hay)) troop = "spearmen";
  else if (/\bcav|\bcavalry/.test(hay)) troop = "cavalry";
  else if (/\barch|\bbow/.test(hay)) troop = "archers";
  else if (/\bsiege/.test(hay)) troop = "siege";
  else if (/\bshield/.test(hay)) troop = "shieldbearers";

  let mode: LineupMode = "pvp";
  if (/\brally/.test(hay)) mode = "rally";
  else if (/\bdefen|\bkeep watch|\bkeep/.test(hay)) mode = "defense";
  else if (/\bgather/.test(hay)) mode = "gathering";
  else if (/\bpve|\bcampaign|\btile/.test(hay)) mode = "pve";
  return { troop, mode };
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

export function localCoachAnswer(
  question: string,
  request: SuggestRequest,
  state: PitState,
  lineup: Lineup,
): { reply: string; lines: AiLine[] } {
  const guess = guessTroopMode(question);
  const skip = namesToSkip(question, request.roster);
  const working: Lineup = {
    ...lineup,
    troop: guess.troop,
    mode: guess.mode,
  };
  const meta =
    wantsOnlineDps(question, guess.troop, guess.mode)
      ? metaLineIfFree(request, skip)
      : null;
  const extra = [...skip, ...(meta ? metaSeatIds() : [])];
  const ranked = localComboLines(working, state, request.roster, extra);
  const lines = meta
    ? [meta, ...ranked.filter((line) => line.name !== meta.name)]
    : ranked;
  const head = lines[0];
  const pool = request.pool === "pit" ? "pit" : "hatchery";
  const troop = troopLabels[guess.troop];
  const mode = modeLabels[guess.mode];
  const skipped = skip
    .map((id) => findDragon(id, state.customDragons)?.name ?? id)
    .join(", ");
  const alts = lines
    .slice(1)
    .map((line) => line.name)
    .join(", ");
  const reply = head
    ? `Local copilot for ${troop} ${mode} from this ${pool}.${skipped ? ` Left out ${skipped}.` : ""} I would run ${head.name}: ${head.why}${alts ? ` Also: ${alts}.` : ""} Copy for ChatGPT if you want a longer take.`
    : "I need at least three dragons in this pool before I can seat a line.";
  return { reply, lines };
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
