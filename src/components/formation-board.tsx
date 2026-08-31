"use client";

import type { ReactNode } from "react";
import { DragonIcon } from "@/components/dragon-icon";
import { formatInvestment, lineupKindLabel, resolveSlot, SLOT_IDS } from "@/lib/lineup";
import { slotShort } from "@/lib/labels";
import { vanguardBonus } from "@/lib/habits";
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
    <div className="rounded-2xl bg-gradient-to-b from-stone-900/80 to-black/50 p-3 ring-1 ring-amber-500/20 sm:p-4">
      <div className="mb-2 flex items-center gap-2 sm:mb-3">
        <span className="rounded-full px-2 py-0.5 text-[10px] tracking-[0.16em] text-amber-200/90 ring-1 ring-amber-400/30">
          {lineupKindLabel(lineup.kind).toUpperCase()}
        </span>
        {onNameChange ? (
          <input
            value={lineup.name}
            onChange={(e) => onNameChange(e.target.value)}
            aria-label="Team name"
            className="font-heading min-w-0 flex-1 bg-transparent text-base tracking-wide text-amber-50 outline-none placeholder:text-amber-200/40 sm:text-lg"
            placeholder="Name this team"
          />
        ) : (
          <p className="font-heading min-w-0 flex-1 truncate text-base tracking-wide text-amber-50 sm:text-lg">
            {lineup.name}
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
          "flex min-h-[13.5rem] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-3 select-none sm:min-h-[15rem]",
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
          size="3xl"
        />
        <span className="font-heading text-[11px] tracking-[0.16em] text-amber-200/90">
          {slotShort[slot].toUpperCase()}
        </span>
        <span className="max-w-full truncate text-sm">
          {dragon?.name ?? "Tap to pick"}
        </span>
        {resolved ? (
          <span className="text-[11px] text-amber-100/80">
            {formatInvestment(resolved.starRank, resolved.reignLevel, {
              kind: lineup.kind,
              ignoreLevel: lineup.ignoreLevel,
            })}
          </span>
        ) : null}
        {slot === "vanguard" && dragon ? (
          <span
            className="compact-line max-w-full px-1 text-center text-[10px] text-emerald-200/90"
            title={vanguardBonus(dragon)}
          >
            {vanguardBonus(dragon)}
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
