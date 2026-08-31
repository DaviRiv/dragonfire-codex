"use client";

import type { ReactNode } from "react";
import { DragonIcon } from "@/components/dragon-icon";
import { formatInvestment, lineupKindLabel, resolveSlot, SLOT_IDS } from "@/lib/lineup";
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
  onNameChange,
  children,
}: {
  lineup: Lineup;
  state: PitState;
  selectedSlot?: SlotId | null;
  onSelectSlot?: (slot: SlotId) => void;
  onClearSlot?: (slot: SlotId) => void;
  onNameChange?: (name: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-stone-900/80 to-black/50 p-2 ring-1 ring-amber-500/20 sm:p-3">
      <div className="mb-1 flex items-center gap-2 sm:mb-2">
        <span className="rounded-full px-2 py-0.5 text-[10px] tracking-[0.16em] text-amber-200/90 ring-1 ring-amber-400/30">
          {lineupKindLabel(lineup.kind).toUpperCase()}
        </span>
        {onNameChange ? (
          <input
            value={lineup.name}
            onChange={(e) => onNameChange(e.target.value)}
            aria-label="Team name"
            className="font-heading min-w-0 flex-1 bg-transparent text-sm tracking-wide text-amber-50 outline-none placeholder:text-amber-200/40"
            placeholder="Name this team"
          />
        ) : (
          <p className="font-heading min-w-0 flex-1 truncate text-sm tracking-wide text-amber-50">
            {lineup.name}
          </p>
        )}
      </div>
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
      {children ? (
        <div className="mt-2 space-y-1.5 border-t border-amber-500/15 pt-2">
          {children}
        </div>
      ) : null}
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
          "flex min-h-[7.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 select-none",
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
          size="2xl"
        />
        <span className="font-heading text-[10px] tracking-[0.16em] text-amber-200/90">
          {slotShort[slot].toUpperCase()}
        </span>
        <span className="max-w-full truncate text-xs">
          {dragon?.name ?? "Tap to pick"}
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
