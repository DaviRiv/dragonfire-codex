"use client";

import { useMemo, useState } from "react";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonSheet } from "@/components/dragon-sheet";
import { MiniChip } from "@/components/chip";
import { ListFilterBar } from "@/components/list-filter-bar";
import { StarRank, StarStepper } from "@/components/star-rank";
import { Button } from "@/components/ui/button";
import { DRAGONS, UNRELEASED_DRAGONS } from "@/data/dragons";
import { lineupsUsingDragon } from "@/lib/dragons";
import { breedLabels, rarityLabels } from "@/lib/labels";
import { usePit } from "@/lib/store";
import type { Breed, Dragon, Rarity, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";

type OwnedFilter = "all" | "owned" | "missing";

export function HatcheryPage() {
  const { ready, state, setCatalogOwned, adjustOwnedStars } = usePit();
  const [query, setQuery] = useState("");
  const [breed, setBreed] = useState<Breed | "all">("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [troop, setTroop] = useState<TroopType | "all">("all");
  const [ownedFilter, setOwnedFilter] = useState<OwnedFilter>("all");
  const [inspecting, setInspecting] = useState<Dragon | null>(null);

  const ownedById = useMemo(
    () => new Map(state.owned.map((row) => [row.dragonId, row] as const)),
    [state.owned],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DRAGONS.filter((dragon) => {
      if (q && !`${dragon.name} ${dragon.epithet}`.toLowerCase().includes(q)) {
        return false;
      }
      if (breed !== "all" && dragon.breed !== breed) return false;
      if (rarity !== "all" && dragon.rarity !== rarity) return false;
      if (troop !== "all" && !dragon.affinities.includes(troop)) return false;
      const owned = ownedById.has(dragon.id);
      if (ownedFilter === "owned" && !owned) return false;
      if (ownedFilter === "missing" && owned) return false;
      return true;
    });
  }, [query, breed, rarity, troop, ownedFilter, ownedById]);

  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground">Opening the hatchery…</p>
    );
  }

  const inspectingOwned = inspecting
    ? (ownedById.get(inspecting.id) ?? null)
    : null;

  function markOwned(dragon: Dragon, nextOwned: boolean, starRank?: number) {
    if (!nextOwned) {
      const row = ownedById.get(dragon.id);
      if (row) {
        const used = lineupsUsingDragon(state, row.id);
        if (
          used.length > 0 &&
          !window.confirm(
            `${dragon.name} sits on ${used.length} saved team${used.length === 1 ? "" : "s"}. Unmark anyway?`,
          )
        ) {
          return;
        }
      }
    }
    setCatalogOwned(dragon.id, { owned: nextOwned, starRank });
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <h1 className="font-heading text-xl tracking-wide sm:text-3xl">
          Hatchery
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mark who you own and their star rank. That is your collection — it
          does not add a row to Pit. Pit is for reign, notes, and which teams
          they sit on.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl bg-card/70 ring-1 ring-foreground/10">
        <ListFilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Search dragons…"
          breed={breed}
          onBreedChange={setBreed}
          rarity={rarity}
          onRarityChange={setRarity}
          troop={troop}
          onTroopChange={setTroop}
        />
        <div className="flex flex-wrap gap-1 px-3 pt-2">
          <MiniChip
            active={ownedFilter === "all"}
            onClick={() => setOwnedFilter("all")}
          >
            All
          </MiniChip>
          <MiniChip
            active={ownedFilter === "owned"}
            onClick={() => setOwnedFilter("owned")}
          >
            Owned · {state.owned.length}
          </MiniChip>
          <MiniChip
            active={ownedFilter === "missing"}
            onClick={() => setOwnedFilter("missing")}
          >
            Not owned
          </MiniChip>
        </div>
        <p className="px-3 py-2 text-[13px] text-muted-foreground">
          {filtered.length} dragon{filtered.length === 1 ? "" : "s"}
        </p>
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nothing matches those filters.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4 lg:grid-cols-6">
            {filtered.map((dragon) => {
              const owned = ownedById.get(dragon.id);
              return (
                <div
                  key={dragon.id}
                  className={cn(
                    "flex min-h-[10.5rem] flex-col items-center rounded-2xl bg-background/50 px-1 py-2 ring-1 ring-foreground/10",
                    owned && "ring-amber-400/40",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setInspecting(dragon)}
                    className="flex w-full flex-col items-center gap-1 select-none"
                  >
                    <DragonIcon
                      dragonId={dragon.id}
                      name={dragon.name}
                      rarity={dragon.rarity}
                      size="xl"
                    />
                    <span className="line-clamp-2 w-full text-center text-[13px] leading-snug font-medium">
                      {dragon.name}
                    </span>
                  </button>
                  <MiniChip
                    active={Boolean(owned)}
                    className="mt-1.5"
                    onClick={() =>
                      markOwned(dragon, !owned, owned ? owned.starRank : 1)
                    }
                  >
                    {owned ? "Owned" : "Own"}
                  </MiniChip>
                  {owned ? (
                    <div className="mt-1 w-full">
                      <StarStepper
                        value={owned.starRank}
                        onDelta={(delta) => adjustOwnedStars(dragon.id, delta)}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {breedLabels[dragon.breed]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {UNRELEASED_DRAGONS.length > 0 ? (
        <div className="overflow-hidden rounded-2xl bg-card/50 ring-1 ring-foreground/10">
          <p className="px-3 py-2 text-[13px] text-muted-foreground">
            Not in the game yet · {UNRELEASED_DRAGONS.length} names from
            Dragonfire-Hub
          </p>
          <ul className="divide-y divide-border/40">
            {UNRELEASED_DRAGONS.map((dragon) => (
              <li
                key={dragon.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="font-heading tracking-wide">{dragon.name}</span>
                <span className="text-xs text-muted-foreground">
                  {rarityLabels[dragon.rarity]} · {breedLabels[dragon.breed]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={inspectingOwned ? "default" : "outline"}
                  onClick={() =>
                    markOwned(
                      inspecting,
                      !inspectingOwned,
                      inspectingOwned?.starRank ?? 1,
                    )
                  }
                >
                  {inspectingOwned ? "Owned" : "Mark owned"}
                </Button>
              </div>
              {inspectingOwned ? (
                <div>
                  <p className="text-label mb-1">Star rank</p>
                  <StarRank
                    value={inspectingOwned.starRank}
                    onChange={(starRank) =>
                      setCatalogOwned(inspecting.id, {
                        owned: true,
                        starRank,
                      })
                    }
                  />
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Mark owned, then set stars. This does not add them to Pit.
                </p>
              )}
            </>
          ) : null
        }
      />
    </div>
  );
}
