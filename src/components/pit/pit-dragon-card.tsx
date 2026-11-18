"use client";

import { BreedChip, DragonDamageChips } from "@/components/dragon-meta";
import { DragonIcon } from "@/components/dragon-icon";
import { HabitSearchButton } from "@/components/habit-picker";
import { StarStepper } from "@/components/star-rank";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pitInspectReign } from "@/lib/pit-catalog";
import { rarityLabels } from "@/lib/labels";
import { dragonRoles, roleChipClass, roleShort } from "@/lib/roles";
import type { Dragon, OwnedDragon } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GitCompare, ScrollText } from "lucide-react";

export function PitDragonCard({
  dragon,
  owned,
  compareSelected,
  onInspect,
  onHabits,
  onCompareToggle,
  onStarsDelta,
}: {
  dragon: Dragon;
  owned?: OwnedDragon;
  compareSelected: boolean;
  onInspect: () => void;
  onHabits: () => void;
  onCompareToggle: () => void;
  onStarsDelta: (delta: number) => void;
}) {
  const stars = owned?.starRank ?? 0;
  const ownedDragon = stars > 0;
  const reign = pitInspectReign(owned);
  const roles = dragonRoles(dragon);

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl surface ring-1 transition",
        ownedDragon
          ? "ring-amber-400/35 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]"
          : "ring-foreground/10 opacity-90",
      )}
    >
      <header className="space-y-1 border-b border-border/40 px-2 pt-2 pb-1.5">
        <div className="flex items-start justify-between gap-1">
          <h3
            className={cn(
              "font-heading min-w-0 flex-1 truncate text-left text-[11px] tracking-wide uppercase sm:text-xs",
              ownedDragon ? "text-amber-50" : "text-muted-foreground",
            )}
            title={dragon.name}
          >
            {dragon.name}
          </h3>
          <Badge
            variant="outline"
            className="shrink-0 rounded px-1 py-0 text-[9px] font-normal text-muted-foreground"
          >
            {rarityLabels[dragon.rarity]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <BreedChip breed={dragon.breed} className="text-[9px]" />
          <DragonDamageChips dragon={dragon} className="justify-start" />
        </div>
        <PitCardMetaLine stars={stars} reign={ownedDragon ? reign : null} />
      </header>

      <div className="relative mx-auto px-2 pt-2">
        <DragonIcon
          dragonId={dragon.id}
          name={dragon.name}
          rarity={dragon.rarity}
          custom={dragon.custom}
          size="xl"
          dimmed={!ownedDragon}
          className="mx-auto"
          onClick={onInspect}
        />
        <HabitSearchButton
          name={dragon.name}
          onClick={onHabits}
          icon={ScrollText}
          className="absolute -right-0.5 bottom-0 bg-background/90 backdrop-blur-sm"
        />
      </div>

      {roles.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-0.5 px-2 pt-1.5">
          {roles.map((role) => (
            <span
              key={role}
              className={cn(
                "rounded-full px-1.5 py-px text-[9px] ring-1",
                roleChipClass[role],
              )}
            >
              {roleShort[role]}
            </span>
          ))}
        </div>
      ) : null}

      <footer className="mt-auto space-y-1.5 px-2 pt-2 pb-2">
        <StarStepper size="sm" value={stars} onDelta={onStarsDelta} />
        <Button
          type="button"
          size="sm"
          variant={compareSelected ? "default" : "outline"}
          className="h-8 w-full text-[11px]"
          aria-pressed={compareSelected}
          onClick={onCompareToggle}
        >
          <GitCompare data-icon="inline-start" className="size-3.5" />
          {compareSelected ? "Comparing" : "Compare"}
        </Button>
      </footer>
    </article>
  );
}

function PitCardMetaLine({
  stars,
  reign,
}: {
  stars: number;
  reign: number | null;
}) {
  return (
    <p className="text-[10px] text-muted-foreground">
      <span className="text-amber-100/90">
        {stars > 0 ? (
          <>
            ★{stars}
            {reign != null ? (
              <span className="text-muted-foreground"> · Lv {reign}</span>
            ) : null}
          </>
        ) : (
          "Not owned"
        )}
      </span>
    </p>
  );
}