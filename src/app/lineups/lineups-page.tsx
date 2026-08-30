"use client";

import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { LineupCard } from "@/components/lineup-card";
import { Button } from "@/components/ui/button";
import { usePit } from "@/lib/store";
import { Plus } from "lucide-react";

export function LineupsPage() {
  const { ready, state, createLineup } = usePit();
  const router = useRouter();

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Loading lineups…</p>;
  }

  function newLineup() {
    const lineup = createLineup(`Lineup ${state.lineups.length + 1}`);
    router.push(`/lineups/${lineup.id}`);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">Saved lineups</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Presets you built on the board. Open one to keep picking, or start
            a new line from the hatchery suggestions.
          </p>
        </div>
        <Button onClick={newLineup} className="w-full sm:w-auto">
          <Plus data-icon="inline-start" />
          New lineup
        </Button>
      </div>

      {state.lineups.length === 0 ? (
        <EmptyState
          title="No lineups yet"
          description="Go to Build, pick a troop, and tap three suggested dragons."
          action={
            <Button onClick={newLineup}>Build your first lineup</Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {state.lineups.map((lineup) => (
            <LineupCard key={lineup.id} lineup={lineup} state={state} />
          ))}
        </div>
      )}
    </div>
  );
}
