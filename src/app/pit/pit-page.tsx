"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AddDragonDialog } from "@/components/add-dragon-dialog";
import { AffinityBadges } from "@/components/affinity-badges";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonPortrait } from "@/components/dragon-portrait";
import { EmptyState } from "@/components/empty-state";
import { StarRank } from "@/components/star-rank";
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
import { exportPit, isPitState, usePit } from "@/lib/store";
import type { OwnedDragon } from "@/lib/types";
import { Download, Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";

export function PitPage() {
  const { ready, state, updateOwned, removeOwned, loadSample, resetPit, importState } =
    usePit();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<OwnedDragon | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">Your pit</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Log every dragon you hatched. Star rank stays between reigns; reign
            level is this campaign. Slotting a dragon on Build also adds them here.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {state.owned.length === 0 ? (
            <Button variant="secondary" onClick={loadSample}>
              Load sample pit
            </Button>
          ) : null}
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            Add dragon
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search your pit…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {state.owned.length === 0 ? (
        <EmptyState
          title="The pit is empty"
          description="Add dragons from the hatchery, or just slot them on Build — they land here automatically."
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
        <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card/70 ring-1 ring-foreground/10">
          {dragons.map((owned) => {
            const used = lineupsUsingDragon(state, owned.id);
            const dragon = findDragon(owned.dragonId, state.customDragons);
            if (!dragon) return null;
            return (
              <button
                key={owned.id}
                type="button"
                onClick={() => setEditing(owned)}
                className="flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left select-none active:bg-amber-500/15"
              >
                <DragonIcon
                  dragonId={dragon.id}
                  name={dragon.name}
                  rarity={dragon.rarity}
                  custom={dragon.custom}
                  size="lg"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-heading block truncate text-base">
                    {dragon.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    ★{owned.starRank} · Reign {owned.reignLevel}
                    {used.length
                      ? ` · ${used.length} lineup${used.length === 1 ? "" : "s"}`
                      : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <section className="rounded-2xl bg-card/60 p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-xl tracking-wide">Your data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything stays in this browser. Export a JSON backup before you
          clear storage.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" onClick={() => exportPit(state)}>
            <Download data-icon="inline-start" />
            Export pit
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload data-icon="inline-start" />
            Import
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (
                window.confirm(
                  "Clear this browser’s pit, lineups, and teams?",
                )
              ) {
                resetPit();
              }
            }}
          >
            Clear pit
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const parsed: unknown = JSON.parse(await file.text());
                if (!isPitState(parsed)) {
                  toast.error("That file is not a Dragonfire pit export.");
                  return;
                }
                importState(parsed);
              } catch {
                toast.error("Could not read that file.");
              }
            }}
          />
        </div>
      </section>

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
    <Sheet open={!!owned} onOpenChange={onOpenChange}>
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
      <SheetFooter className="gap-2">
        <Button
          className="w-full"
          onClick={() => onSave(owned.id, { starRank, reignLevel, notes })}
        >
          Save
        </Button>
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => onRemove(owned.id)}
        >
          Remove from pit
        </Button>
      </SheetFooter>
    </>
  );
}
