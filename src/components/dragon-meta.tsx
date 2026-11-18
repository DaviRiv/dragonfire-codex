import type { ReactNode } from "react";
import { TONE_BADGE_CLASS, type GameTone } from "@/lib/ability-text";
import {
  dragonDamageKinds,
  dragonProvidedBuffs,
} from "@/lib/dragon-display";
import { breedChipClass, breedLabels, troopLabels } from "@/lib/labels";
import { troopWordClass } from "@/components/troop-words";
import type { Dragon, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";

function MetaChip({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full truncate rounded px-1 py-px text-[9px] font-medium leading-tight ring-1 sm:text-[10px]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function BreedChip({
  breed,
  className,
}: {
  breed: Dragon["breed"];
  className?: string;
}) {
  return (
    <MetaChip className={cn(breedChipClass[breed], className)}>
      {breedLabels[breed]}
    </MetaChip>
  );
}

export function TroopWords({
  troops,
  highlight,
  className,
  chipClassName,
}: {
  troops: TroopType[];
  highlight?: TroopType;
  className?: string;
  chipClassName?: string;
}) {
  if (troops.length === 0) return null;
  return (
    <span
      className={cn(
        "flex flex-wrap items-center justify-center gap-0.5",
        className,
      )}
    >
      {troops.map((troop) => (
        <MetaChip
          key={troop}
          title={troopLabels[troop]}
          className={cn(
            troopWordClass[troop],
            highlight === troop && "ring-amber-300/80",
            chipClassName,
          )}
        >
          {troopLabels[troop]}
        </MetaChip>
      ))}
    </span>
  );
}

export function DragonDamageChips({
  dragon,
  className,
}: {
  dragon: Pick<Dragon, "tags">;
  className?: string;
}) {
  const kinds = dragonDamageKinds(dragon);
  if (kinds.length === 0) return null;
  return (
    <span className={cn("flex flex-wrap justify-center gap-0.5", className)}>
      {kinds.map((kind) => (
        <MetaChip
          key={kind.tag}
          className={TONE_BADGE_CLASS[kind.tone as GameTone]}
          title={kind.tag}
        >
          {kind.label}
        </MetaChip>
      ))}
    </span>
  );
}

export function DragonBuffChips({
  dragon,
  max = 3,
  className,
}: {
  dragon: Pick<Dragon, "provides">;
  max?: number;
  className?: string;
}) {
  const buffs = dragonProvidedBuffs(dragon, max);
  if (buffs.length === 0) return null;
  return (
    <span
      className={cn(
        "flex flex-wrap justify-center gap-0.5 text-df-buff",
        className,
      )}
    >
      {buffs.map((buff) => (
        <MetaChip
          key={buff}
          className="border-df-buff/35 bg-df-buff/10 text-df-buff"
          title={buff}
        >
          {buff}
        </MetaChip>
      ))}
    </span>
  );
}

/** Compact facts under pit / picker portraits — breed, troops, damage, buffs. */
export function DragonMetaCompact({
  dragon,
  highlightTroop,
  className,
  showBuffs = true,
}: {
  dragon: Dragon;
  highlightTroop?: TroopType;
  className?: string;
  showBuffs?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col items-stretch gap-0.5",
        className,
      )}
    >
      <div className="flex justify-center">
        <BreedChip breed={dragon.breed} />
      </div>
      <TroopWords troops={dragon.affinities} highlight={highlightTroop} />
      <DragonDamageChips dragon={dragon} />
      {showBuffs ? <DragonBuffChips dragon={dragon} max={2} /> : null}
    </div>
  );
}