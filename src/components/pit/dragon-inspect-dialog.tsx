"use client";

import type { ReactNode } from "react";
import { DragonPortrait } from "@/components/dragon-portrait";
import { DragonProfile, StatGrid } from "@/components/dragon-profile";
import {
  BreedChip,
  DragonBuffChips,
  DragonDamageChips,
  TroopWords,
} from "@/components/dragon-meta";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionLabel } from "@/components/section-label";
import { marchLabels, rarityLabels } from "@/lib/labels";
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
        "rounded-xl bg-black/25 p-3 ring-1 ring-foreground/10",
        className,
      )}
    >
      <SectionLabel as="h3" className="mb-2 text-amber-50/90">
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
  /** Pit ownership controls (stars, reign, notes) above the kit. */
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
        className="max-h-[min(92dvh,100dvh-1rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <div className="border-b border-border/50 bg-gradient-to-b from-amber-500/10 to-transparent px-4 pt-4 pb-3">
          <DialogHeader className="text-left">
            <DialogTitle className="font-heading text-xl tracking-wide text-amber-50">
              {dragon.name}
            </DialogTitle>
            <DialogDescription>{dragon.epithet}</DialogDescription>
          </DialogHeader>
          <DragonPortrait
            dragonId={dragon.id}
            name={dragon.name}
            breed={dragon.breed}
            custom={dragon.custom}
            className="mt-3 aspect-[16/10] w-full rounded-lg ring-1 ring-amber-400/25"
            sizes="640px"
          />
        </div>

        <div className="max-h-[min(58dvh,32rem)] space-y-3 overflow-y-auto px-4 py-3">
          <InspectSection title="Dragon identity">
            <div className="flex flex-wrap items-center gap-2">
              <BreedChip breed={dragon.breed} />
              <span className="text-xs text-muted-foreground">
                Breed (dragon type)
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Damage types (separate from breed)
            </p>
            <DragonDamageChips
              dragon={dragon}
              className="mt-1 justify-start"
            />
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <StatRow label="Rarity" value={rarityLabels[dragon.rarity]} />
              <StatRow
                label="Star rank"
                value={ownedStars != null && ownedStars > 0 ? `★${ownedStars}` : "Not owned"}
              />
              <StatRow label="Reign level" value={String(reign)} />
              <StatRow label="Hub power" value={formatPower(power)} />
            </div>
            <TroopWords
              troops={dragon.affinities}
              highlight={highlightTroop}
              className="mt-2 justify-start"
            />
            <DragonBuffChips
              dragon={dragon}
              max={6}
              className="mt-2 justify-start"
            />
          </InspectSection>

          <InspectSection title="Combat statistics">
            <p className="mb-2 text-[11px] text-muted-foreground">
              Dragonfire tracks Strength, Instinct, Intelligence, and
              Initiative at your reign level with star multipliers. The game
              does not publish separate attack, health, defense, or crit columns
              in this catalog.
            </p>
            <StatGrid stats={stats} />
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <StatRow label="Army troops" value={troops.toLocaleString()} />
              <StatRow label="March" value={marchLabels[dragon.marchSpeed]} />
            </div>
          </InspectSection>

          {pitExtra ? (
            <InspectSection title="Your pit">{pitExtra}</InspectSection>
          ) : null}

          <InspectSection title="Abilities &amp; skills" className="space-y-0">
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <p className="text-muted-foreground">{label}</p>
      <p className="text-right font-medium tabular-nums text-foreground">
        {value}
      </p>
    </>
  );
}