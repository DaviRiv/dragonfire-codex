"use client";

import { useMemo, useState } from "react";
import { LineupCard } from "@/components/lineup-card";
import { MiniSlotRow } from "@/components/lineup-card";
import { EmptyState } from "@/components/empty-state";
import { SectionLabel } from "@/components/section-label";
import { CardListSkeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { confirmDestructive } from "@/lib/confirm";
import { usePit } from "@/lib/store";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";

export function TeamsPage() {
  const { ready, state, createTeam, updateTeam, deleteTeam } = usePit();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected =
    state.teams.find((t) => t.id === selectedId) ?? state.teams[0] ?? null;

  if (!ready) {
    return <CardListSkeleton rows={1} columns={1} label="Loading war kits" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
            War kits
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Bundle saved teams you swap between: a PvP wall, a rally, and a keep
            defense as one kit.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            const team = createTeam(`Team ${state.teams.length + 1}`);
            setSelectedId(team.id);
          }}
          disabled={state.lineups.length === 0}
        >
          <Plus data-icon="inline-start" />
          New team
        </Button>
      </div>

      {state.lineups.length === 0 ? (
        <EmptyState
          title="Build a lineup first"
          description="Teams are groups of saved formations. Slot three dragons into a lineup, then collect the ones you actually march."
        />
      ) : state.teams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Create a team, then attach the lineups you want on call for a campaign or war."
          action={
            <Button
              onClick={() => {
                const team = createTeam("Alliance war kit");
                setSelectedId(team.id);
              }}
            >
              Create a team
            </Button>
          }
        />
      ) : (
        // The base column is pinned to minmax(0,1fr): left implicit it sized to
        // the widest child's min-content and scrolled the phone sideways.
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside
            aria-labelledby="team-switcher"
            className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block lg:space-y-2 lg:overflow-visible"
          >
            <SectionLabel id="team-switcher" className="sr-only">
              Your war kits
            </SectionLabel>
            {state.teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => setSelectedId(team.id)}
                className={cn(
                  "min-h-11 min-w-40 shrink-0 rounded-xl p-3 text-left ring-1 ring-foreground/10 lg:w-full lg:min-w-0",
                  selected?.id === team.id
                    ? "bg-amber-500/15 ring-amber-400/40"
                    : "surface hover:ring-amber-400/30",
                )}
              >
                <p className="font-heading tracking-wide">{team.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {team.lineupIds.length} lineup
                  {team.lineupIds.length === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </aside>
          {selected ? (
            <TeamEditor
              team={selected}
              onChange={(patch) => updateTeam(selected.id, patch)}
              onDelete={() => {
                if (
                  !confirmDestructive(
                    `Disband “${selected.name}”? The lineups it holds stay saved.`,
                  )
                ) {
                  return;
                }
                deleteTeam(selected.id);
                setSelectedId(null);
                toast.success(`Disbanded ${selected.name}.`);
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function TeamEditor({
  team,
  onChange,
  onDelete,
}: {
  team: Team;
  onChange: (
    patch: Partial<Pick<Team, "name" | "description" | "lineupIds">>,
  ) => void;
  onDelete: () => void;
}) {
  const { state } = usePit();
  const attached = useMemo(
    () => state.lineups.filter((l) => team.lineupIds.includes(l.id)),
    [state.lineups, team.lineupIds],
  );

  function toggle(id: string) {
    const next = team.lineupIds.includes(id)
      ? team.lineupIds.filter((x) => x !== id)
      : [...team.lineupIds, id];
    onChange({ lineupIds: next });
  }

  return (
    <div className="space-y-5 rounded-2xl surface p-4 ring-1 ring-foreground/10 sm:p-6">
      <div className="min-w-0 space-y-3">
        <div className="grid gap-1.5">
          <Label htmlFor="team-name">Team name</Label>
          <Input
            id="team-name"
            value={team.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="font-heading"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="team-desc">When you use it</Label>
          <Textarea
            id="team-desc"
            value={team.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Alliance war, tile push, gathering week…"
          />
        </div>
      </div>

      <section>
        <h2 className="font-heading mb-2 tracking-wide">Attached lineups</h2>
        {attached.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            None yet. Pick from the list below.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {attached.map((lineup) => (
              <LineupCard key={lineup.id} lineup={lineup} state={state} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-heading mb-2 tracking-wide">All lineups</h2>
        <ul className="space-y-2">
          {state.lineups.map((lineup) => {
            const on = team.lineupIds.includes(lineup.id);
            return (
              <li
                key={lineup.id}
                className="flex flex-col gap-2 rounded-xl bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{lineup.name}</p>
                  <div className="mt-1">
                    <MiniSlotRow lineup={lineup} state={state} />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={on ? "secondary" : "outline"}
                  onClick={() => toggle(lineup.id)}
                  className="w-full sm:w-auto"
                >
                  {on ? "Attached" : "Attach"}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Disband used to sit beside the name field, which made the most
          destructive control the most prominent thing on the page and put it
          above the lineups it would detach. */}
      <div className="flex justify-end border-t border-border/50 pt-4">
        <Button
          variant="outline"
          onClick={onDelete}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 data-icon="inline-start" />
          Disband this kit
        </Button>
      </div>
    </div>
  );
}
