"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CatalogTile } from "@/components/dragon-card";
import { Input } from "@/components/ui/input";
import { DRAGONS } from "@/data/dragons";
import { BREEDS, RARITIES, TROOP_TYPES, breedLabels, rarityLabels, troopLabels } from "@/lib/labels";
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
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-wide">Hatchery</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Every dragon currently in the roster. Portraits are original fan
          illustrations, not in-game art. Add the ones you hatched to your pit.
        </p>
      </div>
      <Input
        placeholder="Search dragons…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
      />
      <div className="flex flex-wrap gap-1.5">
        <Chip active={breed === "all"} onClick={() => setBreed("all")}>
          All breeds
        </Chip>
        {BREEDS.map((b) => (
          <Chip key={b} active={breed === b} onClick={() => setBreed(b)}>
            {breedLabels[b]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={rarity === "all"} onClick={() => setRarity("all")}>
          All rarities
        </Chip>
        {RARITIES.map((r) => (
          <Chip key={r} active={rarity === r} onClick={() => setRarity(r)}>
            {rarityLabels[r]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={troop === "all"} onClick={() => setTroop("all")}>
          All affinities
        </Chip>
        {TROOP_TYPES.map((t) => (
          <Chip key={t} active={troop === t} onClick={() => setTroop(t)}>
            {troopLabels[t]}
          </Chip>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {filtered.length} dragon{filtered.length === 1 ? "" : "s"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs ring-1 ring-foreground/15",
        active ? "bg-amber-500/20 text-amber-100" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
