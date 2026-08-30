"use client";

import { useMemo, useState } from "react";
import { ChoiceButton } from "@/components/chip";
import { DragonIcon } from "@/components/dragon-icon";
import { Input } from "@/components/ui/input";
import { DRAGONS } from "@/data/dragons";
import { BREEDS, RARITIES, TROOP_TYPES, breedLabels, rarityLabels, troopShort } from "@/lib/labels";
import { usePit } from "@/lib/store";
import type { Breed, Rarity, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HatcheryPage() {
  const { ready, state, addFromCatalog } = usePit();
  const [query, setQuery] = useState("");
  const [breed, setBreed] = useState<Breed | "all">("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [troop, setTroop] = useState<TroopType | "all">("all");

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

  return (
    <div className="space-y-3 sm:space-y-6">
      <div>
        <h1 className="font-heading text-xl tracking-wide sm:text-3xl">
          Hatchery
        </h1>
        <p className="mt-1 hidden max-w-xl text-sm text-muted-foreground sm:block">
          Tap a dragon icon to add it to your pit. Slotting from Build does the
          same automatically.
        </p>
      </div>
      <Input
        placeholder="Search dragons…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        enterKeyHint="search"
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <ChoiceButton
          active={breed === "all"}
          onClick={() => setBreed("all")}
        >
          All
        </ChoiceButton>
        {BREEDS.map((b) => (
          <ChoiceButton
            key={b}
            active={breed === b}
            onClick={() => setBreed(b)}
          >
            {breedLabels[b]}
          </ChoiceButton>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ChoiceButton
          active={rarity === "all"}
          onClick={() => setRarity("all")}
        >
          Any rarity
        </ChoiceButton>
        {RARITIES.map((r) => (
          <ChoiceButton
            key={r}
            active={rarity === r}
            onClick={() => setRarity(r)}
          >
            {rarityLabels[r]}
          </ChoiceButton>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ChoiceButton
          active={troop === "all"}
          onClick={() => setTroop("all")}
        >
          Any troop
        </ChoiceButton>
        {TROOP_TYPES.map((t) => (
          <ChoiceButton
            key={t}
            active={troop === t}
            onClick={() => setTroop(t)}
          >
            {troopShort[t]}
          </ChoiceButton>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {filtered.length} dragon{filtered.length === 1 ? "" : "s"}
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {filtered.map((d) => {
          const owned = state.owned.some((o) => o.dragonId === d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                if (!owned) addFromCatalog(d.id);
              }}
              disabled={owned}
              className={cn(
                "flex min-h-[7.5rem] flex-col items-center gap-1.5 rounded-2xl bg-card/70 px-1 py-3 ring-1 ring-foreground/10 select-none",
                owned && "opacity-50",
              )}
            >
              <DragonIcon
                dragonId={d.id}
                name={d.name}
                rarity={d.rarity}
                size="xl"
              />
              <span className="w-full truncate text-center text-xs font-medium">
                {d.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {owned ? "In pit" : "Tap to add"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
