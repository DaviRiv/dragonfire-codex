"use client";

import { BreedChip, DragonDamageChips } from "@/components/dragon-meta";
import { DragonIcon } from "@/components/dragon-icon";
import { HabitSearchButton } from "@/components/habit-picker";
import { StarStepper } from "@/components/star-rank";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pitInspectReign, pitInspectStarRank } from "@/lib/pit-catalog";
import { rarityLabels, statShort, STAT_KEYS } from "@/lib/labels";
import { dragonPower, formatPower, scaledStats } from "@/lib/scale-stats";
import { dragonRoles, roleChipClass, roleShort } from "@/lib/roles";
import type { Dragon, OwnedDragon } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GitCompare, ZoomIn } from "lucide-react";

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
  const rankStars = pitInspectStarRank(owned);
  const reign = pitInspectReign(owned);
  const stats = scaledStats(dragon, rankStars, reign);
  const power = dragonPower(dragon.rarity, rankStars, reign);
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
        <PitCardMetaLine stars={stars} reign={ownedDragon ? reign : null} power={power} />
      </header>

      <div className="relative mx-auto px-2 pt-2">
        <DragonIcon
          dragonId={dragon.id}
          name={dragon.name}
          rarity={dragon.rarity}
          custom={dragon.custom}
          size="xl"
          dimmed={!ownedDragon}
          onClick={onInspect}
          className="mx-auto"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label={`Inspect ${dragon.name}`}
          data-pit-inspect={dragon.id}
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
          }}
          className="absolute top-1 right-1 size-8 bg-background/90 text-amber-100 ring-1 ring-amber-400/40 shadow-sm hover:bg-amber-500/20"
        >
          <ZoomIn className="size-4" />
        </Button>
        <HabitSearchButton
          name={dragon.name}
          onClick={onHabits}
          className="absolute -right-0.5 bottom-0 bg-background/90 backdrop-blur-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-2 pt-2 text-[10px] tabular-nums">
        {STAT_KEYS.map((key) => (
          <div
            key={key}
            className="flex items-baseline justify-between gap-1 rounded-md bg-black/25 px-1.5 py-0.5 ring-1 ring-foreground/10"
          >
            <span className="text-muted-foreground">{statShort[key]}</span>
            <span className="font-medium text-foreground">{stats[key]}</span>
          </div>
        ))}
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
  power,
}: {
  stars: number;
  reign: number | null;
  power: number;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
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
      <span aria-hidden>·</span>
      <span title="Hub power at shown star and reign">
        {formatPower(power)} power
      </span>
    </p>
  );
}