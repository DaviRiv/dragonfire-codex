"use client";

import { useMemo, useState } from "react";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonSheet } from "@/components/dragon-sheet";
import { ListFilterBar } from "@/components/list-filter-bar";
import { DRAGONS, UNRELEASED_DRAGONS } from "@/data/dragons";
import { breedLabels, rarityLabels } from "@/lib/labels";
import { usePit } from "@/lib/store";
import type { Breed, Dragon, Rarity, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HatcheryPage() {
  const { ready, state, addFromCatalog } = usePit();
  const [query, setQuery] = useState("");
  const [breed, setBreed] = useState<Breed | "all">("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [troop, setTroop] = useState<TroopType | "all">("all");
  const [inspecting, setInspecting] = useState<Dragon | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DRAGONS.filter((d) => {
      if (q && !`${d.name} ${d.epithet}`.toLowerCase().includes(q)) return false;
      if (breed !== "all" && d.breed !== breed) return false;
      if (rarity !== "all" && d.rarity !== rarity) return false;
      if (troop !== "all" && !d.affinities.includes(troop)) return false;
      return true;
    });
  }, [query, breed, rarity, troop]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Opening the hatchery…</p>;
  }

  const inspectingOwned = inspecting
    ? state.owned.some((o) => o.dragonId === inspecting.id)
    : false;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <h1 className="font-heading text-xl tracking-wide sm:text-3xl">
          Hatchery
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a dragon, add it to your pit, then pick a team. Commands, habits,
          and stats come from Dragonfire-Hub.
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
        <p className="px-3 py-2 text-[13px] text-muted-foreground">
          {filtered.length} dragon{filtered.length === 1 ? "" : "s"}
        </p>
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nothing matches those filters.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4 lg:grid-cols-6">
            {filtered.map((d) => {
              const owned = state.owned.some((o) => o.dragonId === d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setInspecting(d)}
                  className={cn(
                    "flex min-h-[8.25rem] flex-col items-center gap-1.5 rounded-2xl bg-background/50 px-1 py-3 ring-1 ring-foreground/10 select-none",
                    owned && "ring-amber-400/30",
                  )}
                >
                  <DragonIcon
                    dragonId={d.id}
                    name={d.name}
                    rarity={d.rarity}
                    size="xl"
                  />
                  <span className="line-clamp-2 w-full text-center text-[13px] leading-snug font-medium">
                    {d.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {breedLabels[d.breed]}
                    {owned ? " · In pit" : ""}
                  </span>
                </button>
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
        ownedStars={
          inspecting
            ? (state.owned.find((row) => row.dragonId === inspecting.id)
                ?.starRank ?? null)
            : null
        }
        actionLabel={inspectingOwned ? "Already in your pit" : "Add to pit"}
        actionDisabled={inspectingOwned}
        onAction={() => {
          if (!inspecting || inspectingOwned) return;
          addFromCatalog(inspecting.id);
          setInspecting(null);
        }}
      />
    </div>
  );
}
