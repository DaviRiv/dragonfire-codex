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

/** Paste-into-ChatGPT rules. Human-readable lines, never JSON. */
export const CHATGPT_EXPORT_RULES = `Reply in plain English a player can read in ChatGPT. Do not return JSON.

For each three-dragon line, use this shape:

Name: short label
Troop / mode: troop / mode
Left / Vanguard / Right: Name / Name / Name
Why: one sentence

Rules:
- Pick only dragons from the roster. Use their names (vhagar is Vhagar).
- A line is Left Flank, Vanguard, Right Flank. Use each dragon at most once per line.
- Treat Current meta and meta:* tags as community snapshots, not a script. Prefer the lineup that fits the roster’s real stars and habit unlocks.
- Build composition in order: healer or recovery if the march needs sustain, soak / mitigation in Vanguard when the mode is combat, then a finisher that matches the troop job mix.
- Feeding Burn so a tank’s Taunt can hit 50% does not outrank a missing healer.
- Prefer the Vanguard for Taunt soak.
- Prefer the asked troop type when a dragon has that affinity, but a correct job mix beats a weak affinity.
- Rows tagged on:NAME already sit on another saved pit formation. If Skip other teams is on, prefer dragons without that tag.
- Do not invent dragons, stats, or heirlooms. Do not mention Army Power.

troop must be one of: cavalry, shieldbearers, archers, spearmen, siege.
mode must be one of: pvp, pve, rally, defense, gathering.`;

export function currentSlots(lineup: Lineup, state: PitState) {
  const placed = placedInLineup(lineup, state);
  const id = (slot: "left" | "vanguard" | "right") =>
    placed.find((row) => row.slot === slot)?.dragon.id ?? null;
  return { left: id("left"), vanguard: id("vanguard"), right: id("right") };
}

/** Compact roster for Copilot and for ChatGPT paste. */
export function buildRosterBlock(request: SuggestRequest): string {
  const troop = troopLabels[request.troop];
  const mode = modeLabels[request.mode];
  const poolLabel =
    request.pool === "pit"
      ? `PIT ONLY (${request.roster.length} owned). Do not pick anyone missing from this list.`
      : `FULL ROSTER (${request.roster.length} dragons). Unowned rows are theory goals, not a live march.`;
  const skip = request.skipUsed
    ? "Skip other teams is on. Rows tagged on:NAME already sit on another saved pit formation. Prefer dragons without that tag unless the player asks to reuse them."
    : "The same dragon may appear on more than one saved team.";
  return `Pool: ${poolLabel}
Default troop: ${troop} (${request.troop})
Default mode: ${mode} (${request.mode})
${skip}
Rows tagged meta:online-dps are the current PvP Shieldbearer DPS core (Malachite Left, Vhagar Vanguard, Venator Right). Other meta:* tags are September 2026 community cores.

Roster (id | name | jobs | rank | affinities | needs | gives):
${request.roster.map((card) => formatRosterLine(card, { compact: true })).join("\n")}`;
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
