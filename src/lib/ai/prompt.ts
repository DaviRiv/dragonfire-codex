import { GAME_FACTS } from "@/data/game-facts";
import {
  formatRosterLine,
  type RosterCard,
  type SuggestRequest,
} from "@/lib/ai/roster";
import { modeLabels, troopLabels } from "@/lib/labels";
import { placedInLineup } from "@/lib/lineup";
import type { Lineup, LineupMode, PitState, TroopType } from "@/lib/types";

export type AiLine = {
  name: string;
  troop: TroopType;
  mode: LineupMode;
  left: string;
  vanguard: string;
  right: string;
  why: string;
};

/** System half of the team-combination prompt. Keep this stable; fill the user half. */
export const TEAM_COMBO_SYSTEM = `You are a Game of Thrones: Dragonfire formation coach for a fan tool. Pick three-dragon lines only from the roster in the user message.

Rules:
- A line is Left Flank, Vanguard, Right Flank. Use each dragon at most once per line.
- Fill composition in order: a healer if nobody Recovers, then soak / damage mitigation (Taunt or self Damage Received), then a damage dealer to finish.
- Feeding Burn so a tank’s Taunt can hit 50% does not outrank a missing healer.
- Prefer the Vanguard for Taunt soak. Do not seat the same dragon twice.
- Prefer the asked troop type when a dragon has that affinity, but a correct job mix beats a weak affinity.
- Rows tagged on:NAME already sit on another saved pit formation. If Skip other teams is on, prefer dragons without that tag.
- ids in the JSON must match roster ids exactly (lowercase slugs like vhagar).
- Return 2 or 3 distinct lines. Vary the core when the roster allows.
- Do not invent dragons, stats, or heirlooms. Do not mention Army Power.

${GAME_FACTS.map((fact) => `- ${fact}`).join("\n")}

Reply with JSON only:
{"lines":[{"name":"short label","troop":"shieldbearers","mode":"pvp","left":"id","vanguard":"id","right":"id","why":"one sentence"}]}

troop must be one of: cavalry, shieldbearers, archers, spearmen, siege.
mode must be one of: pvp, pve, rally, defense, gathering.`;

/** Chat half: same roster rules, plus a spoken reply and the boards to show. */
export const COACH_SYSTEM = `You are a Game of Thrones: Dragonfire formation coach in a live chat for a fan tool. Pick three-dragon lines only from the roster in the user message.

Rules:
- A line is Left Flank, Vanguard, Right Flank. Use each dragon at most once per line.
- Fill composition in order: a healer if nobody Recovers, then soak / damage mitigation (Taunt or self Damage Received), then a damage dealer to finish.
- Feeding Burn so a tank’s Taunt can hit 50% does not outrank a missing healer.
- Prefer the Vanguard for Taunt soak. Do not seat the same dragon twice.
- Prefer the asked troop type when a dragon has that affinity, but a correct job mix beats a weak affinity.
- Rows tagged on:NAME already sit on another saved pit formation. If Skip other teams is on, prefer dragons without that tag.
- ids in the JSON must match roster ids exactly (lowercase slugs like vhagar).
- Answer the latest player message in 2–5 short sentences.
- Always include 1–3 distinct lines so the app can draw the boards. If they ask about an existing idea, still return the line you recommend.
- Do not invent dragons, stats, or heirlooms. Do not mention Army Power.

${GAME_FACTS.map((fact) => `- ${fact}`).join("\n")}

Reply with JSON only:
{"reply":"what you say to the player","lines":[{"name":"short label","troop":"shieldbearers","mode":"pvp","left":"id","vanguard":"id","right":"id","why":"one sentence"}]}

troop must be one of: cavalry, shieldbearers, archers, spearmen, siege.
mode must be one of: pvp, pve, rally, defense, gathering.`;

export function currentSlots(lineup: Lineup, state: PitState) {
  const placed = placedInLineup(lineup, state);
  const id = (slot: "left" | "vanguard" | "right") =>
    placed.find((row) => row.slot === slot)?.dragon.id ?? null;
  return { left: id("left"), vanguard: id("vanguard"), right: id("right") };
}

export function buildUserPrompt(request: SuggestRequest): string {
  const troop = troopLabels[request.troop];
  const mode = modeLabels[request.mode];
  const current = `${request.current.left ?? "empty"} / ${request.current.vanguard ?? "empty"} / ${request.current.right ?? "empty"}`;
  const poolLabel =
    request.pool === "pit"
      ? `PIT ONLY (${request.roster.length} owned). Do not pick anyone missing from this list.`
      : `FULL HATCHERY (${request.roster.length} dragons). Unowned rows are theory goals, not a live march. Prefer released names unless a goal line is clearly better.`;
  const skip = request.skipUsed
    ? "Skip other teams is on. Rows tagged on:NAME already sit on another saved pit formation. Prefer dragons without that tag unless the player note asks to reuse them."
    : "The same dragon may appear on more than one saved team. Rows tagged on:NAME are already seated elsewhere.";
  const note = request.note?.trim()
    ? `\nPlayer note:\n${request.note.trim()}\n`
    : "";

  return `Line: ${request.lineupName}
Asked troop: ${troop} (${request.troop})
Asked mode: ${mode} (${request.mode})
Current seats (L / V / R): ${current}
Pool: ${poolLabel}
${skip}
${note}
Roster (id | name | breed | jobs | rank | affinities | flank | needs | gives | kit):
${request.roster.map((card) => formatRosterLine(card)).join("\n")}

Suggest 2-3 combinations from that roster.`;
}

export function filledPrompt(request: SuggestRequest): string {
  return `${TEAM_COMBO_SYSTEM}

---

${buildUserPrompt(request)}`;
}

export function makeSuggestRequest(
  lineup: Lineup,
  state: PitState,
  pool: SuggestRequest["pool"],
  roster: RosterCard[],
  note?: string,
): SuggestRequest {
  return {
    pool,
    note,
    troop: lineup.troop,
    mode: lineup.mode,
    skipUsed: lineup.kind === "pit" && lineup.excludeUsed !== false,
    lineupName: lineup.name,
    current: currentSlots(lineup, state),
    roster,
  };
}
