"use client";

import { useMemo, useState } from "react";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonSheet } from "@/components/dragon-sheet";
import { StarRank, StarStepper } from "@/components/star-rank";
import { DRAGONS } from "@/data/dragons";
import { lineupsUsingDragon } from "@/lib/dragons";
import { usePit } from "@/lib/store";
import type { Dragon } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HatcheryPage() {
  const { ready, state, setCatalogOwned } = usePit();
  const [inspecting, setInspecting] = useState<Dragon | null>(null);

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
          const stars = ownedById.get(dragon.id)?.starRank ?? 0;
          return (
            <div
              key={dragon.id}
              className="flex flex-col items-center px-0.5 py-1"
            >
              <p
                className={cn(
                  "font-heading mb-1 line-clamp-1 w-full text-center text-[11px] tracking-wide uppercase sm:text-xs",
                  stars > 0 ? "text-amber-50" : "text-muted-foreground",
                )}
              >
                {dragon.name}
              </p>
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
    </div>
  );
}
