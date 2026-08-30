"use client";

import { useMemo, useState } from "react";
import { Chip, ChipRow } from "@/components/chip";
import { CatalogTile } from "@/components/dragon-card";
import { Input } from "@/components/ui/input";
import { DRAGONS } from "@/data/dragons";
import { BREEDS, RARITIES, TROOP_TYPES, breedLabels, rarityLabels, troopLabels } from "@/lib/labels";
import { usePit } from "@/lib/store";
import type { Breed, Rarity, TroopType } from "@/lib/types";

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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
          Hatchery
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Every dragon in the roster. Slot them from Build and they land in your
          pit automatically — or add them here to track stars first.
        </p>
      </div>
      <Input
        placeholder="Search dragons…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
        enterKeyHint="search"
      />
      <ChipRow>
        <Chip active={breed === "all"} onClick={() => setBreed("all")}>
          All breeds
        </Chip>
        {BREEDS.map((b) => (
          <Chip key={b} active={breed === b} onClick={() => setBreed(b)}>
            {breedLabels[b]}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow>
        <Chip active={rarity === "all"} onClick={() => setRarity("all")}>
          All rarities
        </Chip>
        {RARITIES.map((r) => (
          <Chip key={r} active={rarity === r} onClick={() => setRarity(r)}>
            {rarityLabels[r]}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow>
        <Chip active={troop === "all"} onClick={() => setTroop("all")}>
          All affinities
        </Chip>
        {TROOP_TYPES.map((t) => (
          <Chip key={t} active={troop === t} onClick={() => setTroop(t)}>
            {troopLabels[t]}
          </Chip>
        ))}
      </ChipRow>
      <p className="text-sm text-muted-foreground">
        {filtered.length} dragon{filtered.length === 1 ? "" : "s"}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {filtered.map((d) => (
          <CatalogTile
            key={d.id}
            id={d.id}
            name={d.name}
            epithet={d.epithet}
            breed={d.breed}
            rarity={d.rarity}
            affinities={d.affinities}
            owned={state.owned.some((o) => o.dragonId === d.id)}
            onAdd={() => addFromCatalog(d.id)}
          />
        ))}
      </div>
    </div>
  );
}
