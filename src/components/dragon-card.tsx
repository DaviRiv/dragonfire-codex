import type { ReactNode } from "react";
import { AffinityBadges } from "@/components/affinity-badges";
import { DragonPortrait } from "@/components/dragon-portrait";
import { StarRank } from "@/components/star-rank";
import { Badge } from "@/components/ui/badge";
import { findDragon } from "@/lib/dragons";
import { breedLabels, rarityLabels } from "@/lib/labels";
import type { Breed, OwnedDragon, PitState, Rarity, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";

const rarityTone: Record<string, string> = {
  legendary: "border-amber-400/50 bg-amber-400/10 text-amber-200",
  epic: "border-violet-400/50 bg-violet-400/10 text-violet-200",
  rare: "border-sky-400/40 bg-sky-400/10 text-sky-200",
};

export function DragonCard({
  owned,
  state,
  selected,
  highlightTroop,
  onClick,
  footer,
}: {
  owned: OwnedDragon;
  state: PitState;
  selected?: boolean;
  highlightTroop?: TroopType;
  onClick?: () => void;
  footer?: ReactNode;
}) {
  const dragon = findDragon(owned.dragonId, state.customDragons);
  if (!dragon) return null;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-card/80 ring-1 ring-foreground/10 transition",
        selected && "ring-2 ring-amber-400/80",
        onClick && "cursor-pointer hover:ring-amber-400/50",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="flex flex-1 flex-col text-left disabled:cursor-default"
      >
        <DragonPortrait
          dragonId={dragon.id}
          name={dragon.name}
          breed={dragon.breed}
          custom={dragon.custom}
          className="aspect-[4/3] w-full"
        />
        <div className="p-3">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-heading truncate text-base tracking-wide">
                {dragon.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {dragon.epithet}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0 rounded-md font-normal text-[10px] sm:text-xs", rarityTone[dragon.rarity])}
            >
              {rarityLabels[dragon.rarity]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {breedLabels[dragon.breed]}
            {dragon.custom ? " · Custom" : ""}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <StarRank value={owned.starRank} size="sm" />
            <span className="text-xs text-muted-foreground">
              Reign {owned.reignLevel}
            </span>
          </div>
          <AffinityBadges
            affinities={dragon.affinities}
            highlight={highlightTroop}
            className="mt-3"
          />
        </div>
      </button>
      {footer ? (
        <div className="border-t border-foreground/10 px-3 py-2">{footer}</div>
      ) : null}
    </article>
  );
}

export function CatalogTile({
  id,
  name,
  epithet,
  breed,
  rarity,
  affinities,
  owned,
  onAdd,
}: {
  id: string;
  name: string;
  epithet: string;
  breed: Breed;
  rarity: Rarity;
  affinities: TroopType[];
  owned?: boolean;
  onAdd?: () => void;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-card/70 ring-1 ring-foreground/10">
      <DragonPortrait
        dragonId={id}
        name={name}
        breed={breed}
        className="aspect-[4/3] w-full"
      />
      <div className="p-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-heading truncate tracking-wide">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{epithet}</p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 rounded-md font-normal text-[10px] sm:text-xs", rarityTone[rarity])}
          >
            {rarityLabels[rarity]}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{breedLabels[breed]}</p>
        <AffinityBadges affinities={affinities} className="mt-3" />
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            disabled={owned}
            className="mt-3 min-h-11 w-full rounded-lg bg-primary/90 text-sm font-medium text-primary-foreground disabled:opacity-40 sm:h-8 sm:min-h-0"
          >
            {owned ? "Owned" : "Mark owned"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
