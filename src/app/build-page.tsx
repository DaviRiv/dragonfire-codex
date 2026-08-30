"use client";

import { useEffect, useState } from "react";
import { LineupEditor } from "@/app/lineups/lineup-editor";
import { ChoiceButton } from "@/components/chip";
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
    <div className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-xl tracking-wide sm:text-3xl">
          Build a line
        </h1>
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
          New
        </Button>
      </div>
      {state.lineups.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {state.lineups.map((lineup) => (
            <ChoiceButton
              key={lineup.id}
              active={resolvedId === lineup.id}
              onClick={() => setActiveId(lineup.id)}
              className="w-auto min-w-[7.5rem] px-3"
            >
              {lineup.name}
              <span className="ml-1.5 text-[11px] opacity-70">
                {troopShort[lineup.troop]}
              </span>
            </ChoiceButton>
          ))}
        </div>
      ) : null}
      <LineupEditor lineupId={resolvedId} embedded />
    </div>
  );
}
