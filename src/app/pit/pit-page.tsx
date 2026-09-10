"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AddDragonDialog } from "@/components/add-dragon-dialog";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonSheet } from "@/components/dragon-sheet";
import { HabitPickerDialog, HabitSearchButton } from "@/components/habit-picker";
import { StarRank, StarStepper } from "@/components/star-rank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TroopIcons } from "@/components/troop-icon";
import { allDragons, lineupsUsingDragon } from "@/lib/dragons";
import { dragonRoles, roleChipClass, roleShort } from "@/lib/roles";
import { clampReign } from "@/lib/lineup";
import { exportPit, isPitState, usePit } from "@/lib/store";
import type { Dragon, OwnedDragon } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Download, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

export function PitPage() {
  const {
    ready,
    state,
    setCatalogOwned,
    setDragonHabits,
    setDragonHabitRank,
    updateOwned,
    loadSample,
    resetPit,
    importState,
  } = usePit();
  const [inspecting, setInspecting] = useState<Dragon | null>(null);
  const [habitDragon, setHabitDragon] = useState<Dragon | null>(null);
  const [unlistedOpen, setUnlistedOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ownedById = useMemo(
    () => new Map(state.owned.map((row) => [row.dragonId, row] as const)),
    [state.owned],
  );
  // Unlisted dragons the player added are owned too, so they belong in the
  // grid — otherwise there is no way to re-rank or release them.
  const catalog = useMemo(
    () => allDragons(state.customDragons),
    [state.customDragons],
  );

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Opening the pit…</p>;
  }

  const inspectingOwned = inspecting
    ? (ownedById.get(inspecting.id) ?? null)
    : null;
  const habitOwned = habitDragon
    ? (ownedById.get(habitDragon.id) ?? null)
    : null;
  const inspectingTeams = inspectingOwned
    ? lineupsUsingDragon(state, inspectingOwned.id)
    : [];

  function setStars(dragon: Dragon, starRank: number) {
    const next = Math.max(0, Math.min(10, Math.round(starRank) || 0));
    if (next <= 0) {
      const row = ownedById.get(dragon.id);
      if (row) {
        const used = lineupsUsingDragon(state, row.id);
        if (
          used.length > 0 &&
          !window.confirm(
            `${dragon.name} sits on ${used.length} saved team${used.length === 1 ? "" : "s"}. Clear stars anyway?`,
          )
        ) {
          return;
        }
      }
      setCatalogOwned(dragon.id, { owned: false });
      return;
    }
    setCatalogOwned(dragon.id, { owned: true, starRank: next });
  }

  return (
    <div className="-mx-3 -mt-3 min-h-[calc(100dvh-3rem-env(safe-area-inset-top))] sm:-mx-4 sm:-mt-6 md:min-h-[calc(100dvh-3.5rem)]">
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
        <p className="text-label mr-auto">
          {state.owned.length} owned
        </p>
        {state.owned.length === 0 ? (
          <Button size="sm" variant="secondary" onClick={loadSample}>
            Sample
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => setUnlistedOpen(true)}>
          <Plus data-icon="inline-start" />
          Unlisted
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportPit(state)}
        >
          <Download data-icon="inline-start" />
          Export
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
        >
          <Upload data-icon="inline-start" />
          Import
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (
              window.confirm("Clear this browser’s pit, lineups, and teams?")
            ) {
              resetPit();
            }
          }}
        >
          Clear
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
      <div className="grid grid-cols-3 gap-x-1 gap-y-2 p-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {catalog.map((dragon) => {
          const owned = ownedById.get(dragon.id);
          const stars = owned?.starRank ?? 0;
          return (
            <div
              key={dragon.id}
              className="flex flex-col items-center px-0.5 py-1"
            >
              <div className="relative mb-1 flex h-5 w-full items-center">
                <p
                  className={cn(
                    "font-heading line-clamp-1 w-full px-6 text-center text-[11px] tracking-wide uppercase sm:text-xs",
                    stars > 0 ? "text-amber-50" : "text-muted-foreground",
                  )}
                >
                  {dragon.name}
                </p>
                <span className="absolute top-1/2 right-0 -translate-y-1/2">
                  <HabitSearchButton
                    name={dragon.name}
                    onClick={() => setHabitDragon(dragon)}
                  />
                </span>
              </div>
              <DragonIcon
                dragonId={dragon.id}
                name={dragon.name}
                rarity={dragon.rarity}
                custom={dragon.custom}
                size="2xl"
                dimmed={stars <= 0}
                onClick={() => setInspecting(dragon)}
              />
              <div className="mt-0.5">
                <StarStepper
                  value={stars}
                  onDelta={(delta) => setStars(dragon, stars + delta)}
                />
              </div>
            </div>
          );
        })}
      </div>
      <DragonSheet
        dragon={inspecting}
        open={!!inspecting}
        onOpenChange={(next) => {
          if (!next) setInspecting(null);
        }}
        starRank={inspectingOwned?.starRank}
        ownedStars={inspectingOwned?.starRank ?? null}
        ownedHabits={inspectingOwned?.habits}
        ownedHabitRanks={inspectingOwned?.habitRanks}
        onHabitRankChange={
          inspecting
            ? (habit, rank) => setDragonHabitRank(inspecting.id, habit, rank)
            : undefined
        }
        extra={
          inspecting ? (
            <div className="space-y-3">
              <div>
                <p className="text-label mb-1">Star rank</p>
                <StarRank
                  value={inspectingOwned?.starRank ?? 0}
                  onChange={(starRank) => setStars(inspecting, starRank)}
                />
              </div>
              {inspectingOwned ? (
                <>
                  <OwnedFacts
                    key={inspectingOwned.id}
                    dragon={inspecting}
                    owned={inspectingOwned}
                    onReign={(reignLevel) =>
                      updateOwned(inspectingOwned.id, { reignLevel })
                    }
                  />
                  <OwnedNotes
                    key={inspectingOwned.id}
                    notes={inspectingOwned.notes}
                    onSave={(notes) =>
                      updateOwned(inspectingOwned.id, { notes })
                    }
                  />
                </>
              ) : null}
              {inspectingTeams.length > 0 ? (
                <div>
                  <p className="text-label mb-1">
                    Already seated on {inspectingTeams.length} saved team
                    {inspectingTeams.length === 1 ? "" : "s"}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {inspectingTeams.map((lineup) => (
                      <li key={lineup.id}>
                        <Link
                          href={`/lineups/${lineup.id}`}
                          className="text-amber-200 underline-offset-2 hover:underline"
                        >
                          {lineup.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null
        }
      />
      <HabitPickerDialog
        dragon={habitDragon}
        open={!!habitDragon}
        onOpenChange={(next) => {
          if (!next) setHabitDragon(null);
        }}
        starRank={habitOwned?.starRank ?? 0}
        selected={habitOwned?.habits ?? []}
        ranks={habitOwned?.habitRanks}
        onChange={(habits) => {
          if (habitDragon) setDragonHabits(habitDragon.id, habits);
        }}
        onRankChange={(habit, rank) => {
          if (habitDragon) setDragonHabitRank(habitDragon.id, habit, rank);
        }}
        onStarChange={(next) => {
          if (habitDragon) setStars(habitDragon, next);
        }}
      />
      <AddDragonDialog open={unlistedOpen} onOpenChange={setUnlistedOpen} />
    </div>
  );
}

const ROLE_CLASS: Record<string, string> = {
  Heal: roleChipClass.healing,
  Tank: roleChipClass.tanking,
  DPS: roleChipClass.damage,
  CC: roleChipClass.control,
};

const REIGN_MIN = 1;
const REIGN_MAX = 80;

/**
 * What Copilot and Suggest actually read off this dragon: jobs, affinities,
 * and reign. Reign only lived in the save file before, so a player could not
 * see or fix it.
 */
function OwnedFacts({
  dragon,
  owned,
  onReign,
}: {
  dragon: Dragon;
  owned: OwnedDragon;
  onReign: (reignLevel: number) => void;
}) {
  const roles = dragonRoles(dragon).map((role) => roleShort[role]);
  const [draft, setDraft] = useState(String(owned.reignLevel));

  function commitReign(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isFinite(parsed)
      ? clampReign(parsed)
      : owned.reignLevel;
    setDraft(String(next));
    if (next !== owned.reignLevel) onReign(next);
  }

  return (
    <div className="space-y-2 rounded-xl bg-card/50 p-3 ring-1 ring-foreground/10">
      <p className="text-label">In your pit</p>
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-amber-200">★{owned.starRank}</span>
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <TroopIcons troops={dragon.affinities} iconClassName="size-4" />
        {roles.length > 0 ? (
          <>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            {roles.map((role) => (
              <span
                key={role}
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] ring-1",
                  ROLE_CLASS[role] ?? "ring-foreground/20",
                )}
              >
                {role}
              </span>
            ))}
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="pit-reign" className="shrink-0 text-[13px]">
          Reign level
        </Label>
        <Input
          id="pit-reign"
          type="number"
          inputMode="numeric"
          min={REIGN_MIN}
          max={REIGN_MAX}
          step={1}
          value={draft}
          className="h-10 w-24 md:h-8"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commitReign(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitReign(event.currentTarget.value);
            }
          }}
        />
        <span className="text-xs text-muted-foreground">
          {REIGN_MIN}–{REIGN_MAX}
        </span>
      </div>
    </div>
  );
}

function OwnedNotes({
  notes,
  onSave,
}: {
  notes: string;
  onSave: (notes: string) => void;
}) {
  const [draft, setDraft] = useState(notes);
  return (
    <div className="space-y-1.5">
      <Label htmlFor="pit-notes">Notes</Label>
      <Textarea
        id="pit-notes"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Habits you skip, who it pairs with…"
        className="min-h-20 text-sm"
      />
      <Button
        size="sm"
        disabled={draft === notes}
        onClick={() => {
          onSave(draft);
          toast.success("Notes saved.");
        }}
      >
        Save notes
      </Button>
    </div>
  );
}
