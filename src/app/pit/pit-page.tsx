"use client";

import { useMemo, useState } from "react";
import { AddDragonDialog } from "@/components/add-dragon-dialog";
import { DragonCard } from "@/components/dragon-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { findDragon, lineupsUsingDragon } from "@/lib/dragons";
import { usePit } from "@/lib/store";
import type { OwnedDragon } from "@/lib/types";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { AffinityBadges } from "@/components/affinity-badges";
import { DragonPortrait } from "@/components/dragon-portrait";
import { StarRank } from "@/components/star-rank";

export function PitPage() {
  const { ready, state, updateOwned, removeOwned } = usePit();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<OwnedDragon | null>(null);

  const dragons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.owned.filter((owned) => {
      const d = findDragon(owned.dragonId, state.customDragons);
      if (!d) return false;
      if (!q) return true;
      return `${d.name} ${d.epithet} ${d.breed} ${d.affinities.join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [query, state.owned, state.customDragons]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Opening the pit…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl tracking-wide">Your pit</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Log every dragon you hatched. Star rank stays between reigns; reign
            level is this campaign. Lineups pull from this list.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          Add dragon
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search your pit…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {state.owned.length === 0 ? (
        <EmptyState
          title="The pit is empty"
          description="Add dragons from the hatchery roster, or record an unlisted one you already own. You can also load a sample pit from the overview."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              Add your first dragon
            </Button>
          }
        />
      ) : dragons.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Nothing in your pit matches that search."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dragons.map((owned) => {
            const used = lineupsUsingDragon(state, owned.id);
            return (
              <DragonCard
                key={owned.id}
                owned={owned}
                state={state}
                onClick={() => setEditing(owned)}
                footer={
                  <p className="text-xs text-muted-foreground">
                    {used.length === 0
                      ? "Not in a lineup yet"
                      : `In ${used.length} lineup${used.length === 1 ? "" : "s"}`}
                  </p>
                }
              />
            );
          })}
        </div>
      )}

      <AddDragonDialog open={open} onOpenChange={setOpen} />
      <EditDragonSheet
        owned={editing}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        onSave={(id, patch) => {
          updateOwned(id, patch);
          setEditing(null);
        }}
        onRemove={(id) => {
          removeOwned(id);
          setEditing(null);
        }}
      />
    </div>
  );
}

function EditDragonSheet({
  owned,
  onOpenChange,
  onSave,
  onRemove,
}: {
  owned: OwnedDragon | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    patch: { starRank: number; reignLevel: number; notes: string },
  ) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Sheet
      open={!!owned}
      onOpenChange={onOpenChange}
    >
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {owned ? (
          <EditDragonForm
            key={owned.id}
            owned={owned}
            onSave={onSave}
            onRemove={onRemove}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function EditDragonForm({
  owned,
  onSave,
  onRemove,
}: {
  owned: OwnedDragon;
  onSave: (
    id: string,
    patch: { starRank: number; reignLevel: number; notes: string },
  ) => void;
  onRemove: (id: string) => void;
}) {
  const { state } = usePit();
  const router = useRouter();
  const dragon = findDragon(owned.dragonId, state.customDragons);
  const [starRank, setStarRank] = useState(owned.starRank);
  const [reignLevel, setReignLevel] = useState(owned.reignLevel);
  const [notes, setNotes] = useState(owned.notes);
  const used = lineupsUsingDragon(state, owned.id);

  if (!dragon) return null;

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-heading tracking-wide">
          {dragon.name}
        </SheetTitle>
        <SheetDescription>{dragon.epithet}</SheetDescription>
      </SheetHeader>
      <DragonPortrait
        dragonId={dragon.id}
        name={dragon.name}
        breed={dragon.breed}
        custom={dragon.custom}
        className="mx-4 aspect-[4/3] rounded-lg"
        sizes="400px"
      />
      <div className="space-y-4 px-4">
        <AffinityBadges affinities={dragon.affinities} />
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="text-xs tracking-widest text-muted-foreground">HABIT</p>
          <p className="mt-1">{dragon.habit}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="text-xs tracking-widest text-muted-foreground">
            COMMAND
          </p>
          <p className="mt-1">{dragon.command}</p>
        </div>
        <div className="grid gap-1.5">
          <Label>Star rank</Label>
          <StarRank value={starRank} onChange={setStarRank} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reign-edit">Reign level</Label>
          <Input
            id="reign-edit"
            type="number"
            min={1}
            max={80}
            value={reignLevel}
            onChange={(e) => setReignLevel(Number(e.target.value))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Habit priority, relic count, who rides them…"
          />
        </div>
        {used.length > 0 ? (
          <div className="text-sm">
            <p className="text-xs tracking-widest text-muted-foreground">
              LINEUPS
            </p>
            <ul className="mt-1 space-y-1">
              {used.map((lineup) => (
                <li key={lineup.id}>
                  <button
                    type="button"
                    className="text-amber-200 underline-offset-2 hover:underline"
                    onClick={() => router.push(`/lineups/${lineup.id}`)}
                  >
                    {lineup.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <SheetFooter>
        <Button onClick={() => onSave(owned.id, { starRank, reignLevel, notes })}>
          Save
        </Button>
        <Button variant="destructive" onClick={() => onRemove(owned.id)}>
          Remove from pit
        </Button>
      </SheetFooter>
    </>
  );
}

