import { localComboLines } from "@/lib/ai/local";
import { COACH_SYSTEM, type AiLine } from "@/lib/ai/prompt";
import {
  formatRosterLine,
  type SuggestRequest,
} from "@/lib/ai/roster";
import { makePick } from "@/lib/lineup";
import { modeLabels, troopLabels } from "@/lib/labels";
import type {
  Lineup,
  LineupKind,
  LineupMode,
  PitState,
  TroopType,
} from "@/lib/types";

export type CoachHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export const COACH_STARTERS = [
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

export function buildRosterBlock(request: SuggestRequest): string {
  const troop = troopLabels[request.troop];
  const mode = modeLabels[request.mode];
  const poolLabel =
    request.pool === "pit"
      ? `PIT ONLY (${request.roster.length} owned). Do not pick anyone missing from this list.`
      : `FULL HATCHERY (${request.roster.length} dragons). Unowned rows are theory goals, not a live march.`;
  const skip = request.skipUsed
    ? "Skip other teams is on. Rows tagged on:NAME already sit on another saved pit formation. Prefer dragons without that tag unless the player asks to reuse them."
    : "The same dragon may appear on more than one saved team.";
  return `Pool: ${poolLabel}
Default troop: ${troop} (${request.troop})
Default mode: ${mode} (${request.mode})
${skip}

Roster (id | name | breed | jobs | rank | affinities | flank | needs | gives | kit):
${request.roster.map(formatRosterLine).join("\n")}`;
}

export function buildCoachMessages(
  request: SuggestRequest,
  question: string,
  history: CoachHistoryTurn[],
): { role: "system" | "user" | "assistant"; content: string }[] {
  const prior = history.slice(-8).map((turn) => ({
    role: turn.role,
    content: turn.content.slice(0, 1200),
  }));
  return [
    { role: "system", content: COACH_SYSTEM },
    { role: "user", content: buildRosterBlock(request) },
    ...prior,
    { role: "user", content: question.trim().slice(0, 800) },
  ];
}

export function localCoachAnswer(
  question: string,
  request: SuggestRequest,
  state: PitState,
  lineup: Lineup,
): { reply: string; lines: AiLine[] } {
  const guess = guessTroopMode(question);
  const working: Lineup = {
    ...lineup,
    troop: guess.troop,
    mode: guess.mode,
  };
  const lines = localComboLines(working, state, request.roster);
  const head = lines[0];
  const pool = request.pool === "pit" ? "pit" : "hatchery";
  const reply = head
    ? `From this ${pool}, I would run ${head.name}: ${head.why} Log in with OpenAI if you want a back-and-forth that follows this question.`
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
