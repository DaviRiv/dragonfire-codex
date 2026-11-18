import { coachLines } from "@/lib/ai/coach";
import { makeSuggestRequest, type AiLine } from "@/lib/ai/prompt";
import { collectRoster, type AiPool } from "@/lib/ai/roster";
import { contextLineup } from "@/app/coach/use-coach-chat";
import { findDragon } from "@/lib/dragons";
import { TROOP_TYPES } from "@/lib/labels";
import type { PitState, SlotId, TroopType } from "@/lib/types";

export type FocusConfig = {
  dragonId: string | null;
  slot: SlotId | "auto";
  troops: TroopType[];
};

export type FocusResult = {
  config: FocusConfig;
  lines: AiLine[];
  pool: AiPool;
  /** The free pit could not complete a line, so every dragon was used. */
  fellBack: boolean;
};

export function focusConfigKey(config: FocusConfig): string {
  const troops = TROOP_TYPES.filter((troop) => config.troops.includes(troop));
  return `${config.dragonId ?? "-"}|${config.slot}|${troops.join(",")}`;
}

/** Troops to search: the picked ones the focus dragon fights in, else all picked. */
function searchTroops(state: PitState, config: FocusConfig): TroopType[] {
  const picked = TROOP_TYPES.filter((troop) => config.troops.includes(troop));
  if (!config.dragonId) return picked;
  const dragon = findDragon(config.dragonId, state.customDragons);
  const onAffinity = picked.filter((troop) => dragon?.affinities.includes(troop));
  return onAffinity.length > 0 ? onAffinity : picked;
}

function trioKey(line: AiLine): string {
  return [line.left, line.vanguard, line.right].sort().join("|");
}

function linesFromPool(
  state: PitState,
  config: FocusConfig,
  pool: AiPool,
  limit: number,
): AiLine[] {
  const lineup = contextLineup(state.lineups, pool);
  const roster = collectRoster(state, lineup, pool);
  const perTroop = searchTroops(state, config).map((troop) =>
    coachLines({
      request: makeSuggestRequest(
        { ...lineup, troop, mode: "pvp" },
        state,
        pool,
        roster,
      ),
      state,
      lineup,
      troop,
      mode: "pvp",
      skip: [],
      anchorId: config.dragonId,
      anchorSlot: config.slot === "auto" ? null : config.slot,
      lockTroop: true,
    }),
  );

  // Round-robin so every picked troop gets its best line before seconds.
  const out: AiLine[] = [];
  const seen = new Set<string>();
  const depth = Math.max(0, ...perTroop.map((lines) => lines.length));
  for (let i = 0; i < depth && out.length < limit; i++) {
    for (const lines of perTroop) {
      const line = lines[i];
      if (!line) continue;
      const key = trioKey(line);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(line);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function focusSuggestions(
  state: PitState,
  config: FocusConfig,
  limit = 3,
): FocusResult {
  const fromPit = linesFromPool(state, config, "pit", limit);
  if (fromPit.length > 0) {
    return { config, lines: fromPit, pool: "pit", fellBack: false };
  }
  return {
    config,
    lines: linesFromPool(state, config, "hatchery", limit),
    pool: "hatchery",
    fellBack: true,
  };
}