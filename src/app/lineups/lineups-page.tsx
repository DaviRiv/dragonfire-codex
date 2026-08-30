"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddDragonDialog } from "@/components/add-dragon-dialog";
import { EmptyState } from "@/components/empty-state";
import { LineupCard } from "@/components/lineup-card";
import { Button } from "@/components/ui/button";
import { usePit } from "@/lib/store";
import { Plus } from "lucide-react";

export function LineupsPage() {
  const { ready, state, createLineup } = usePit();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Loading lineups…</p>;
  }

  function newLineup() {
    const lineup = createLineup(`Lineup ${state.lineups.length + 1}`);
    router.push(`/lineups/${lineup.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl tracking-wide">Lineups</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Three dragons, three lanes: Left Flank, Vanguard, Right Flank. Match
            a troop type to their affinities and save a preset for each fight.
          </p>
        </div>
        <Button onClick={newLineup} disabled={state.owned.length === 0}>
          <Plus data-icon="inline-start" />
          New lineup
        </Button>
      </div>

      {state.owned.length === 0 ? (
        <EmptyState
          title="Add dragons before you form a line"
          description="A lineup needs dragons from your pit. Log what you hatched, then come back to slot them."
          action={
            <Button onClick={() => setAddOpen(true)}>Add dragons</Button>
          }
        />
      ) : state.lineups.length === 0 ? (
        <EmptyState
          title="No lineups yet"
          description="Create a PvP wall, a rally march, and a keep defense. You can reuse the same dragon across saved formations."
          action={<Button onClick={newLineup}>Build your first lineup</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {state.lineups.map((lineup) => (
            <LineupCard key={lineup.id} lineup={lineup} state={state} />
          ))}
        </div>
      )}
      <AddDragonDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
