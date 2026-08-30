"use client";

import { useEffect, useState } from "react";
import { LineupEditor } from "@/app/lineups/lineup-editor";
import { Chip, ChipRow } from "@/components/chip";
import { Button } from "@/components/ui/button";
import { usePit } from "@/lib/store";
import { troopShort } from "@/lib/labels";
import { Plus } from "lucide-react";

export function BuildPage() {
  const { ready, state, createLineup, ensureLineup } = usePit();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (state.lineups.length === 0) {
      ensureLineup("New lineup");
    }
  }, [ready, state.lineups.length, ensureLineup]);

  const resolvedId =
    (activeId && state.lineups.some((lineup) => lineup.id === activeId)
      ? activeId
      : state.lineups[0]?.id) ?? null;

  if (!ready || !resolvedId) {
    return <p className="text-sm text-muted-foreground">Opening the board…</p>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
          Build a line
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pick a troop, tap a lane, then tap a suggested dragon. No need to fill
          the pit first.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => {
            const lineup = createLineup(
              `Lineup ${state.lineups.length + 1}`,
            );
            setActiveId(lineup.id);
          }}
          className="shrink-0"
        >
          <Plus data-icon="inline-start" />
          <span className="sm:hidden">New</span>
          <span className="hidden sm:inline">New lineup</span>
        </Button>
        <ChipRow className="min-w-0 flex-1">
          {state.lineups.map((lineup) => (
            <Chip
              key={lineup.id}
              active={resolvedId === lineup.id}
              onClick={() => setActiveId(lineup.id)}
            >
              {lineup.name}
              <span className="ml-1.5 text-[11px] text-muted-foreground">
                {troopShort[lineup.troop]}
              </span>
            </Chip>
          ))}
        </ChipRow>
      </div>
      <LineupEditor lineupId={resolvedId} embedded />
    </div>
  );
}
