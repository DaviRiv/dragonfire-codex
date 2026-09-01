"use client";

import { MiniChip } from "@/components/chip";
import { Input } from "@/components/ui/input";
import {
  BREEDS,
  RARITIES,
  TROOP_TYPES,
  breedLabels,
  rarityLabels,
  troopShort,
} from "@/lib/labels";
import type { Breed, Rarity, TroopType } from "@/lib/types";
import { Search } from "lucide-react";

export function ListFilterBar({
  query,
  onQueryChange,
  placeholder,
  breed,
  onBreedChange,
  rarity,
  onRarityChange,
  troop,
  onTroopChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  breed: Breed | "all";
  onBreedChange: (value: Breed | "all") => void;
  rarity: Rarity | "all";
  onRarityChange: (value: Rarity | "all") => void;
  troop?: TroopType | "all";
  onTroopChange?: (value: TroopType | "all") => void;
}) {
  return (
    <div className="space-y-2 border-b border-border/50 bg-card/90 p-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={placeholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          enterKeyHint="search"
        />
      </div>
      <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        <MiniChip active={breed === "all"} onClick={() => onBreedChange("all")}>
          All breeds
        </MiniChip>
        {BREEDS.map((b) => (
          <MiniChip
            key={b}
            active={breed === b}
            onClick={() => onBreedChange(b)}
          >
            {breedLabels[b]}
          </MiniChip>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        <MiniChip
          active={rarity === "all"}
          onClick={() => onRarityChange("all")}
        >
          Any rarity
        </MiniChip>
        {RARITIES.map((r) => (
          <MiniChip
            key={r}
            active={rarity === r}
            onClick={() => onRarityChange(r)}
          >
            {rarityLabels[r]}
          </MiniChip>
        ))}
      </div>
      {onTroopChange && troop !== undefined ? (
        <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          <MiniChip
            active={troop === "all"}
            onClick={() => onTroopChange("all")}
          >
            Any troop
          </MiniChip>
          {TROOP_TYPES.map((t) => (
            <MiniChip
              key={t}
              active={troop === t}
              onClick={() => onTroopChange(t)}
            >
              {troopShort[t]}
            </MiniChip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
