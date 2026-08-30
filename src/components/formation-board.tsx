"use client";

import { DragonPortrait } from "@/components/dragon-portrait";
import { findDragon } from "@/lib/dragons";
import { slotShort } from "@/lib/labels";
import type { Lineup, PitState, SlotId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

export function FormationBoard({
  lineup,
  state,
  selectedSlot,
  onSelectSlot,
  onClearSlot,
}: {
  lineup: Lineup;
  state: PitState;
  selectedSlot?: SlotId | null;
  onSelectSlot?: (slot: SlotId) => void;
  onClearSlot?: (slot: SlotId) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-stone-900/80 to-black/60 p-2.5 ring-1 ring-amber-500/20 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_55%)]" />
      <p className="relative mb-2 text-center font-heading text-[10px] tracking-[0.28em] text-amber-200/80 sm:mb-4 sm:text-xs">
        ENEMY LINES
      </p>
      <div className="relative grid grid-cols-3 gap-1.5 sm:gap-3">
        <SlotCard
          slot="left"
          lineup={lineup}
          state={state}
          selected={selectedSlot === "left"}
          onSelect={onSelectSlot}
          onClear={onClearSlot}
          className="md:translate-y-6"
        />
        <SlotCard
          slot="vanguard"
          lineup={lineup}
          state={state}
          selected={selectedSlot === "vanguard"}
          onSelect={onSelectSlot}
          onClear={onClearSlot}
          className="md:-translate-y-2"
        />
        <SlotCard
          slot="right"
          lineup={lineup}
          state={state}
          selected={selectedSlot === "right"}
          onSelect={onSelectSlot}
          onClear={onClearSlot}
          className="md:translate-y-6"
        />
      </div>
      <p className="relative mt-3 text-center text-[11px] text-muted-foreground sm:mt-6 sm:text-xs">
        Tap a lane, then a dragon
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
  onClear,
  className,
}: {
  slot: SlotId;
  lineup: Lineup;
  state: PitState;
  selected: boolean;
  onSelect?: (slot: SlotId) => void;
  onClear?: (slot: SlotId) => void;
  className?: string;
}) {
  const ownedId = lineup.slots[slot];
  const owned = state.owned.find((o) => o.id === ownedId);
  const dragon = owned
    ? findDragon(owned.dragonId, state.customDragons)
    : undefined;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl text-left ring-1 transition",
        dragon
          ? "bg-black/40 ring-amber-500/25"
          : "bg-black/20 ring-dashed ring-foreground/15",
        selected && "ring-2 ring-amber-300",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(slot)}
        className="block w-full text-left"
      >
        {dragon && owned ? (
          <>
            <DragonPortrait
              dragonId={dragon.id}
              name={dragon.name}
              breed={dragon.breed}
              custom={dragon.custom}
              className="aspect-[4/5] w-full"
              sizes="(max-width: 640px) 33vw, 280px"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-1.5 pt-8 sm:p-3 sm:pt-10">
              <p className="font-heading text-[9px] tracking-[0.16em] text-amber-200/90 sm:text-[11px] sm:tracking-[0.2em]">
                {slotShort[slot].toUpperCase()}
              </p>
              <p className="font-heading truncate text-xs sm:text-lg">
                {dragon.name}
              </p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {dragon.epithet}
              </p>
              <p className="text-[10px] text-amber-200/80 sm:hidden">
                ★{owned.starRank}
              </p>
            </div>
          </>
        ) : (
          <div className="flex aspect-[4/5] flex-col p-1.5 sm:p-3">
            <p className="font-heading text-[9px] tracking-[0.16em] text-amber-200/90 sm:text-[11px] sm:tracking-[0.2em]">
              {slotShort[slot].toUpperCase()}
            </p>
            <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
              <Plus className="size-5 sm:size-6" />
              <p className="mt-1 text-center text-[10px] leading-tight sm:mt-2 sm:text-xs">
                Tap to pick
              </p>
            </div>
          </div>
        )}
      </button>
      {dragon && onClear ? (
        <button
          type="button"
          aria-label={`Clear ${slotShort[slot]}`}
          onClick={(e) => {
            e.stopPropagation();
            onClear(slot);
          }}
          className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-black/70 text-stone-200 ring-1 ring-white/20 hover:bg-black sm:top-2 sm:right-2"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
