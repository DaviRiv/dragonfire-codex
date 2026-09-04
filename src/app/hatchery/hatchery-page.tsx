"use client";

import { useMemo, useState } from "react";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonSheet } from "@/components/dragon-sheet";
import { HabitPickerDialog, HabitSearchButton } from "@/components/habit-picker";
import { StarRank, StarStepper } from "@/components/star-rank";
import { DRAGONS } from "@/data/dragons";
import { lineupsUsingDragon } from "@/lib/dragons";
import { usePit } from "@/lib/store";
import type { Dragon } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HatcheryPage() {
  const { ready, state, setCatalogOwned, setDragonHabits } = usePit();
  const [inspecting, setInspecting] = useState<Dragon | null>(null);
  const [habitDragon, setHabitDragon] = useState<Dragon | null>(null);

  const ownedById = useMemo(
    () => new Map(state.owned.map((row) => [row.dragonId, row] as const)),
    [state.owned],
  );

  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground">Opening the hatchery…</p>
    );
  }

  const inspectingOwned = inspecting
    ? (ownedById.get(inspecting.id) ?? null)
    : null;
  const habitOwned = habitDragon
    ? (ownedById.get(habitDragon.id) ?? null)
    : null;

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
      <div className="grid grid-cols-3 gap-x-1 gap-y-2 p-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {DRAGONS.map((dragon) => {
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
                size="2xl"
                dimmed={stars <= 0}
                stars={stars}
                starsLayout="row"
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
        reignLevel={inspectingOwned?.reignLevel}
        ownedStars={inspectingOwned?.starRank ?? null}
        ownedHabits={inspectingOwned?.habits}
        extra={
          inspecting ? (
            <div>
              <p className="text-label mb-1">Star rank</p>
              <StarRank
                value={inspectingOwned?.starRank ?? 0}
                onChange={(starRank) => setStars(inspecting, starRank)}
              />
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
        onChange={(habits) => {
          if (habitDragon) setDragonHabits(habitDragon.id, habits);
        }}
        onStarChange={(next) => {
          if (habitDragon) setStars(habitDragon, next);
        }}
      />
    </div>
  );
}
