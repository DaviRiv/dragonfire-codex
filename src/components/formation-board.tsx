"use client";

import { DragonPortrait } from "@/components/dragon-portrait";
import { StarRank } from "@/components/star-rank";
import { findDragon } from "@/lib/dragons";
import { slotHints, slotLabels } from "@/lib/labels";
import type { Lineup, PitState, SlotId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export function FormationBoard({
  lineup,
  state,
  selectedSlot,
  onSelectSlot,
}: {
  lineup: Lineup;
  state: PitState;
  selectedSlot?: SlotId | null;
  onSelectSlot?: (slot: SlotId) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-stone-900/80 to-black/60 p-4 ring-1 ring-amber-500/20 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_55%)]" />
      <p className="relative mb-4 text-center font-heading text-xs tracking-[0.28em] text-amber-200/80">
        ENEMY LINES
      </p>
      <div className="relative grid gap-3 sm:grid-cols-3">
        <SlotCard
          slot="left"
          lineup={lineup}
          state={state}
          selected={selectedSlot === "left"}
          onSelect={onSelectSlot}
          className="sm:translate-y-6"
        />
        <SlotCard
          slot="vanguard"
          lineup={lineup}
          state={state}
          selected={selectedSlot === "vanguard"}
          onSelect={onSelectSlot}
          className="sm:-translate-y-2"
        />
        <SlotCard
          slot="right"
          lineup={lineup}
          state={state}
          selected={selectedSlot === "right"}
          onSelect={onSelectSlot}
          className="sm:translate-y-6"
        />
      </div>
      <p className="relative mt-6 text-center text-xs text-muted-foreground">
        Your army · tap a lane, then a dragon from the bench
      </p>
    </div>
  );
}

function SlotCard({
  slot,
  lineup,
  state,
  selected,
  onSelect,
  className,
}: {
  slot: SlotId;
  lineup: Lineup;
  state: PitState;
  selected: boolean;
  onSelect?: (slot: SlotId) => void;
  className?: string;
}) {
  const ownedId = lineup.slots[slot];
  const owned = state.owned.find((o) => o.id === ownedId);
  const dragon = owned
    ? findDragon(owned.dragonId, state.customDragons)
    : undefined;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(slot)}
      className={cn(
        "relative overflow-hidden rounded-xl text-left ring-1 transition",
        dragon
          ? "bg-black/40 ring-amber-500/25"
          : "min-h-44 bg-black/20 ring-dashed ring-foreground/15",
        selected && "ring-2 ring-amber-300",
        className,
      )}
    >
      {dragon && owned ? (
        <>
          <DragonPortrait
            dragonId={dragon.id}
            name={dragon.name}
            breed={dragon.breed}
            custom={dragon.custom}
            className="aspect-[4/5] w-full"
            sizes="(max-width: 640px) 90vw, 280px"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-10">
            <p className="font-heading text-[11px] tracking-[0.2em] text-amber-200/90">
              {slotLabels[slot].toUpperCase()}
            </p>
            <p className="font-heading truncate text-lg">{dragon.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {dragon.epithet}
            </p>
            <div className="mt-2">
              <StarRank value={owned.starRank} size="sm" />
            </div>
          </div>
        </>
      ) : (
        <div className="p-3">
          <p className="font-heading text-[11px] tracking-[0.2em] text-amber-200/90">
            {slotLabels[slot].toUpperCase()}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center text-muted-foreground">
            <Plus className="size-6" />
            <p className="mt-2 text-xs">{slotHints[slot]}</p>
          </div>
        </div>
      )}
    </button>
  );
}
