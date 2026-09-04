import { emptySlots } from "@/lib/lineup";
import type { SuggestRequest } from "@/lib/ai/roster";
import type { Lineup, PitState } from "@/lib/types";

export function stubLineup(request: SuggestRequest): Lineup {
  return {
    id: "ai-stub",
    name: request.lineupName,
    kind: request.pool === "pit" ? "pit" : "theory",
    mode: request.mode,
    troop: request.troop,
    notes: "",
    slots: emptySlots(),
    ignoreLevel: false,
    craftStars: 10,
    excludeUsed: request.skipUsed,
    updatedAt: new Date().toISOString(),
  };
}

export function stubState(request: SuggestRequest): PitState {
  return {
    version: 2,
    owned: request.roster
      .filter((card) => card.owned)
      .map((card) => ({
        id: `own-${card.id}`,
        dragonId: card.id,
        starRank: card.stars ?? 1,
        reignLevel: card.reign ?? 1,
        notes: "",
      })),
    customDragons: [],
    lineups: [stubLineup(request)],
    teams: [],
  };
}
