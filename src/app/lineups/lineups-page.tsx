"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { LineupCard } from "@/components/lineup-card";
import { MiniChip } from "@/components/chip";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePit } from "@/lib/store";
import type { LineupKind } from "@/lib/types";
import { Plus } from "lucide-react";

export function LineupsPage() {
  const { ready, state, createLineup } = usePit();
  const router = useRouter();
  const [filter, setFilter] = useState<LineupKind | "all">("all");

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Loading lineups…</p>;
  }

  function newLineup(kind: LineupKind) {
    const count = state.lineups.filter((l) => l.kind === kind).length;
    const lineup = createLineup(
      kind === "theory" ? `Theory ${count + 1}` : `Lineup ${count + 1}`,
      kind,
    );
    router.push(`/lineups/${lineup.id}`);
  }

  const visible =
    filter === "all"
      ? state.lineups
      : state.lineups.filter((lineup) => lineup.kind === filter);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">Saved teams</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Pit lines use dragons you own. Theory lines are wish-lists — stars
            you set here never change the pit.{" "}
            <Link href="/teams" className="text-amber-200 underline-offset-2 hover:underline">
              Bundle into a war kit
            </Link>
            .
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button onClick={() => newLineup("pit")} className="w-full sm:w-auto">
            <Plus data-icon="inline-start" />
            Pit line
          </Button>
          <Button
            variant="secondary"
            onClick={() => newLineup("theory")}
            className="w-full sm:w-auto"
          >
            <Plus data-icon="inline-start" />
            Theory
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {(
          [
            ["all", "All"],
            ["pit", "Pit"],
            ["theory", "Theory"],
          ] as const
        ).map(([id, label]) => (
          <MiniChip
            key={id}
            active={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </MiniChip>
        ))}
      </div>

      {state.lineups.length === 0 ? (
        <EmptyState
          title="No lineups yet"
          description="Build from your pit, or theory-craft a line with dragons you want."
          action={
            <div className="grid w-full max-w-sm gap-2">
              <Button onClick={() => newLineup("pit")}>New pit line</Button>
              <Button variant="outline" onClick={() => newLineup("theory")}>
                New theory line
              </Button>
            </div>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nothing in this filter"
          description="Switch to All, or create a line of this kind."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((lineup) => (
            <LineupCard key={lineup.id} lineup={lineup} state={state} />
          ))}
        </div>
      )}
    </div>
  );
}
