"use client";

import { FormationBoard } from "@/components/formation-board";
import { Button } from "@/components/ui/button";
import { lineupFromAiLine } from "@/lib/ai/coach";
import type { AiLine } from "@/lib/ai/prompt";
import type { AiPool } from "@/lib/ai/roster";
import { pairingReport } from "@/lib/pairing";
import type { PitState } from "@/lib/types";

export function CoachFormation({
  line,
  state,
  pool,
  onSeat,
}: {
  line: AiLine;
  state: PitState;
  pool: AiPool;
  onSeat: (line: AiLine) => void;
}) {
  const lineup = lineupFromAiLine(line, state, pool);
  const pairing = pairingReport(lineup, state);
  return (
    <FormationBoard
      lineup={lineup}
      state={state}
      buffs={pairing.buffs}
      compact
    >
      <p className="text-[13px] leading-snug text-amber-50/90">{line.why}</p>
      <Button size="sm" onClick={() => onSeat(line)}>
        Seat on Team
      </Button>
    </FormationBoard>
  );
}
