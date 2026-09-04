import { emptySlots } from "@/lib/lineup";
import { defaultHabits } from "@/lib/habits";
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
      .map((card) => {
        const starRank = card.stars ?? 1;
        return {
          id: `own-${card.id}`,
          dragonId: card.id,
          starRank,
          reignLevel: card.reign ?? 1,
          notes: "",
          habits: defaultHabits(starRank),
        };
      }),
    customDragons: [],
    lineups: [stubLineup(request)],
    teams: [],
  };
}
