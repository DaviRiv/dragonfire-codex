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
import { SectionLabel } from "@/components/section-label";
import { marchLabels, rarityLabels, troopLabels } from "@/lib/labels";
import { dragonPower, formatPower, scaledStats, troopCount } from "@/lib/scale-stats";
import type { Dragon, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";

function InspectSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-foreground/10",
        className,
      )}
    >
      <SectionLabel as="h3" className="mb-1.5 text-[11px] text-amber-50/90">
        {title}
      </SectionLabel>
      {children}
    </section>
  );
}

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
  const owned =
    ownedStars != null && ownedStars > 0
      ? `★${ownedStars} · Lv ${reign}`
      : "Not in your pit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(92dvh,100dvh-1rem)] gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <div className="border-b border-border/50 px-3 pt-3 pb-2.5">
          <InspectDialogHeader dragon={dragon} owned={owned} power={power} />
        </div>

        <div className="max-h-[min(62dvh,36rem)] space-y-2 overflow-y-auto px-3 py-2">
          <InspectSection title="Identity">
            <div className="flex flex-wrap items-center gap-1">
              <BreedChip breed={dragon.breed} />
              <DragonDamageChips dragon={dragon} className="justify-start" />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {rarityLabels[dragon.rarity]}
              <span aria-hidden> · </span>
              {dragon.affinities.map((t) => troopLabels[t]).join(", ")}
            </p>
            <DragonBuffChips
              dragon={dragon}
              max={4}
              className="mt-1.5 justify-start"
            />
          </InspectSection>

          <InspectSection title="Combat">
            <StatLine stats={stats} />
            <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
              {formatPower(power)} Hub power
              <span aria-hidden> · </span>
              {troops.toLocaleString()} troops
              <span aria-hidden> · </span>
              {marchLabels[dragon.marchSpeed]} march
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground/90">
              STR, INS, INT, INIT from Hub at your star and reign — no separate
              attack/HP/crit in catalog.
            </p>
          </InspectSection>

          {pitExtra ? (
            <InspectSection title="Your pit">{pitExtra}</InspectSection>
          ) : null}

          <InspectSection title="Abilities">
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
          </InspectSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InspectDialogHeader({
  dragon,
  owned,
  power,
}: {
  dragon: Dragon;
  owned: string;
  power: number;
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
      <div className="min-w-0 flex-1 pt-0.5">
        <DialogHeader className="space-y-0 text-left">
          <DialogTitle className="font-heading text-lg leading-tight tracking-wide text-amber-50">
            {dragon.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {dragon.epithet}
          </DialogDescription>
        </DialogHeader>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {owned}
          <span aria-hidden> · </span>
          <span className="tabular-nums">{formatPower(power)} power</span>
        </p>
      </div>
    </div>
  );
}