"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AddDragonDialog } from "@/components/add-dragon-dialog";
import { Disclosure } from "@/components/disclosure";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonPortrait } from "@/components/dragon-portrait";
import { DragonProfile } from "@/components/dragon-profile";
import { EmptyState } from "@/components/empty-state";
import { ListFilterBar } from "@/components/list-filter-bar";
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
import { breedLabels } from "@/lib/labels";
import { exportPit, isPitState, usePit } from "@/lib/store";
import type { Breed, OwnedDragon, Rarity, TroopType } from "@/lib/types";
import { Download, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

export function PitPage() {
  const { ready, state, updateOwned, removeOwned, loadSample, resetPit, importState } =
    usePit();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [breed, setBreed] = useState<Breed | "all">("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [troop, setTroop] = useState<TroopType | "all">("all");
  const [editing, setEditing] = useState<OwnedDragon | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dragons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.owned
      .flatMap((owned) => {
        const d = findDragon(owned.dragonId, state.customDragons);
        if (!d) return [];
        if (q && !`${d.name} ${d.epithet} ${d.breed} ${d.affinities.join(" ")}`
          .toLowerCase()
          .includes(q)) {
          return [];
        }
        if (breed !== "all" && d.breed !== breed) return [];
        if (rarity !== "all" && d.rarity !== rarity) return [];
        if (troop !== "all" && !d.affinities.includes(troop)) return [];
        return [{ owned, dragon: d }];
      })
      .sort(
        (a, b) =>
          b.owned.starRank - a.owned.starRank ||
          b.owned.reignLevel - a.owned.reignLevel ||
          a.dragon.name.localeCompare(b.dragon.name),
      );
  }, [query, breed, rarity, troop, state.owned, state.customDragons]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Opening the pit…</p>;
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-heading text-xl tracking-wide sm:text-3xl">
            Your pit
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {state.owned.length} owned · reign, notes, and teams
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {state.owned.length === 0 ? (
            <Button variant="secondary" onClick={loadSample}>
              Sample
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => router.push("/hatchery")}>
            Hatchery
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            Unlisted
          </Button>
        </div>
      </div>

      {state.owned.length === 0 ? (
        <EmptyState
          title="Nobody in the collection"
          description="Open Hatchery and set stars on the dragons you hatched. 0★ means you do not have them. Pit is for reign, notes, and which teams they sit on."
          action={
            <Button onClick={() => router.push("/hatchery")}>
              Set stars in Hatchery
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl bg-card/70 ring-1 ring-foreground/10">
          <ListFilterBar
            query={query}
            onQueryChange={setQuery}
            placeholder="Search your pit…"
            breed={breed}
            onBreedChange={setBreed}
            rarity={rarity}
            onRarityChange={setRarity}
            troop={troop}
            onTroopChange={setTroop}
          />
          {dragons.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing in your pit matches those filters.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {dragons.map(({ owned, dragon }) => {
                const used = lineupsUsingDragon(state, owned.id);
                return (
                  <button
                    key={owned.id}
                    type="button"
                    onClick={() => setEditing(owned)}
                    className="flex min-h-14 w-full items-center gap-2.5 overflow-visible px-3 py-2 text-left select-none active:bg-amber-500/15"
                  >
                    <DragonIcon
                      dragonId={dragon.id}
                      name={dragon.name}
                      rarity={dragon.rarity}
                      custom={dragon.custom}
                      size="md"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-heading block truncate text-sm">
                        {dragon.name}
                      </span>
                      <span className="block truncate text-[13px] text-muted-foreground">
                        ★{owned.starRank} · Reign {owned.reignLevel}
                        {used.length
                          ? ` · ${used.length} team${used.length === 1 ? "" : "s"}`
                          : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Disclosure title="Your data" badge="This browser">
        <p className="text-sm text-muted-foreground">
          Export a JSON backup before you clear storage. Nothing is uploaded.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
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
      </Disclosure>

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
  const { state, setDragonHabitRank } = usePit();
  const router = useRouter();
  const live = state.owned.find((row) => row.id === owned.id) ?? owned;
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
        <DragonProfile
          dragon={dragon}
          starRank={starRank}
          reignLevel={reignLevel}
          ownedStars={starRank}
          ownedHabits={live.habits}
          ownedHabitRanks={live.habitRanks}
          onHabitRankChange={(habit, rank) =>
            setDragonHabitRank(live.dragonId, habit, rank)
          }
        />
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
              TEAMS
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
