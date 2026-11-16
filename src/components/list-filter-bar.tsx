"use client";

import { MiniChip } from "@/components/chip";
import { ChipRow } from "@/components/filter-bar";
import { SearchField } from "@/components/search-field";
import { TroopIcon } from "@/components/troop-icon";
import {
  BREEDS,
  RARITIES,
  TROOP_TYPES,
  breedLabels,
  rarityLabels,
  troopLabels,
} from "@/lib/labels";
import type { Breed, Rarity, TroopType } from "@/lib/types";

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
  placeholder?: string;
  breed: Breed | "all";
  onBreedChange: (value: Breed | "all") => void;
  rarity: Rarity | "all";
  onRarityChange: (value: Rarity | "all") => void;
  troop?: TroopType | "all";
  onTroopChange?: (value: TroopType | "all") => void;
}) {
  return (
    <div className="space-y-2 border-b border-border/50 bg-card/90 p-2.5">
      <SearchField
        value={query}
        onChange={onQueryChange}
        label={placeholder || "Search"}
        inputClassName="h-11 md:h-8"
      />
      <ChipRow label="Breed">
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
      </ChipRow>
      <ChipRow label="Rarity">
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
      </ChipRow>
      {onTroopChange && troop !== undefined ? (
        <ChipRow label="Troop affinity">
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
              title={troopLabels[t]}
              aria-label={troopLabels[t]}
            >
              <TroopIcon troop={t} className="size-4" />
            </MiniChip>
          ))}
        </ChipRow>
      ) : null}
    </div>
  );
}
