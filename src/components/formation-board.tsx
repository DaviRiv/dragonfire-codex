"use client";

import { DragonIcon } from "@/components/dragon-icon";
import { formatInvestment, resolveSlot, SLOT_IDS } from "@/lib/lineup";
import { slotShort } from "@/lib/labels";
import type { Lineup, PitState, SlotId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
    <div className="rounded-2xl bg-gradient-to-b from-stone-900/80 to-black/50 p-2 ring-1 ring-amber-500/20 sm:p-4">
      <p className="mb-1 text-center font-heading text-[10px] tracking-[0.28em] text-amber-200/80 sm:mb-2 sm:text-xs">
        {lineup.kind === "theory" ? "THEORY LINE" : "YOUR LINE"}
      </p>
      <div className="grid grid-cols-3 gap-1">
        {SLOT_IDS.map((slot) => (
          <SlotButton
            key={slot}
            slot={slot}
            lineup={lineup}
            state={state}
            selected={selectedSlot === slot}
            onSelect={onSelectSlot}
            onClear={onClearSlot}
          />
        ))}
      </div>
    </div>
  );
}

function SlotButton({
  slot,
  lineup,
  state,
  selected,
  onSelect,
  onClear,
}: {
  slot: SlotId;
  lineup: Lineup;
  state: PitState;
  selected: boolean;
  onSelect?: (slot: SlotId) => void;
  onClear?: (slot: SlotId) => void;
}) {
  const resolved = resolveSlot(lineup, state, slot);
  const dragon = resolved?.dragon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelect?.(slot)}
        className={cn(
          "flex min-h-[6.5rem] w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 select-none",
          selected && "bg-amber-500/20 ring-2 ring-amber-300",
        )}
      >
        <DragonIcon
          dragonId={dragon?.id}
          name={dragon?.name}
          rarity={dragon?.rarity}
          custom={dragon?.custom}
          empty={!dragon}
          selected={selected}
          size="xl"
        />
        <span className="font-heading text-[10px] tracking-[0.16em] text-amber-200/90">
          {slotShort[slot].toUpperCase()}
        </span>
        <span className="max-w-full truncate text-xs">
          {dragon?.name ?? "Tap"}
        </span>
        {resolved ? (
          <span className="text-[10px] text-amber-100/80">
            {formatInvestment(resolved.starRank, resolved.reignLevel, {
              kind: lineup.kind,
              ignoreLevel: lineup.ignoreLevel,
            })}
          </span>
        ) : null}
      </button>
      {dragon && onClear ? (
        <button
          type="button"
          aria-label={`Clear ${slotShort[slot]}`}
          onClick={(e) => {
            e.stopPropagation();
            onClear(slot);
          }}
          className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full bg-black/80 text-stone-100 ring-1 ring-white/25"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
