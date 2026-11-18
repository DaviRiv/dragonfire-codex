"use client";

import type { ReactNode } from "react";
import { DragonPortrait } from "@/components/dragon-portrait";
import { DragonProfile, StatLine } from "@/components/dragon-profile";
import {
  BreedChip,
  DragonBuffChips,
  DragonDamageChips,
} from "@/components/dragon-meta";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { marchLabels, rarityLabels, troopLabels } from "@/lib/labels";
import { dragonPower, formatPower, scaledStats, troopCount } from "@/lib/scale-stats";
import type { Dragon, DragonStats, TroopType } from "@/lib/types";

export function DragonInspectDialog({
  dragon,
  open,
  onOpenChange,
  highlightTroop,
  starRank,
  reignLevel,
  ownedStars,
  ownedHabits,
  ownedHabitRanks,
  onHabitRankChange,
  pitExtra,
}: {
  dragon: Dragon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightTroop?: TroopType;
  starRank?: number;
  reignLevel?: number;
  ownedStars?: number | null;
  ownedHabits?: number[];
  ownedHabitRanks?: number[];
  onHabitRankChange?: (habit: number, rank: number) => void;
  pitExtra?: ReactNode;
}) {
  if (!dragon) return null;

  const rankStars = starRank ?? 1;
  const reign = reignLevel ?? 1;
  const stats = scaledStats(dragon, rankStars, reign);
  const power = dragonPower(dragon.rarity, rankStars, reign);
  const troops = troopCount(dragon.rarity, rankStars, reign);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(92dvh,100dvh-1rem)] gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <div className="border-b border-border/50 px-3 pt-3 pb-3">
          <InspectDialogHeader
            dragon={dragon}
            stats={stats}
            power={power}
            troops={troops}
            ownedStars={ownedStars}
            reign={reign}
          />
        </div>

        <div className="max-h-[min(62dvh,36rem)] space-y-3 overflow-y-auto px-3 py-3">
          {pitExtra ? <div className="space-y-3">{pitExtra}</div> : null}
          <DragonProfile
            dragon={dragon}
            highlightTroop={highlightTroop}
            starRank={rankStars}
            reignLevel={reign}
            ownedStars={ownedStars}
            ownedHabits={ownedHabits}
            ownedHabitRanks={ownedHabitRanks}
            onHabitRankChange={onHabitRankChange}
            hideIdentityHeader
            hideStatBlock
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InspectDialogHeader({
  dragon,
  stats,
  power,
  troops,
  ownedStars,
  reign,
}: {
  dragon: Dragon;
  stats: DragonStats;
  power: number;
  troops: number;
  ownedStars?: number | null;
  reign: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <DragonPortrait
        dragonId={dragon.id}
        name={dragon.name}
        breed={dragon.breed}
        custom={dragon.custom}
        className="size-[5.5rem] shrink-0 rounded-lg ring-1 ring-amber-400/30"
        sizes="88px"
        showMark={false}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <DialogHeader className="space-y-0 text-left">
          <DialogTitle className="font-heading text-lg leading-tight tracking-wide text-amber-50">
            {dragon.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {dragon.epithet}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-1">
          <BreedChip breed={dragon.breed} />
          <DragonDamageChips dragon={dragon} className="justify-start" />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {rarityLabels[dragon.rarity]}
          <span aria-hidden> · </span>
          {dragon.affinities.map((t) => troopLabels[t]).join(", ")}
        </p>
        <DragonBuffChips dragon={dragon} max={3} className="justify-start" />
        <StatLine stats={stats} />
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {ownedStars != null && ownedStars > 0 ? (
            <>
              ★{ownedStars} · Lv {reign}
              <span aria-hidden> · </span>
            </>
          ) : null}
          {formatPower(power)} power
          <span aria-hidden> · </span>
          {troops.toLocaleString()} troops
          <span aria-hidden> · </span>
          {marchLabels[dragon.marchSpeed]}
        </p>
      </div>
    </div>
  );
}