"use client";

import type { ReactNode } from "react";
import { DragonIcon } from "@/components/dragon-icon";
import { SynergyBuffList } from "@/components/synergy-hover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MiniChip } from "@/components/chip";
import { formatInvestment, lineupKindLabel, resolveSlot, SLOT_IDS } from "@/lib/lineup";
import {
  MODES,
  TROOP_TYPES,
  modeShort,
  slotShort,
  troopShort,
} from "@/lib/labels";
import { vanguardBonus } from "@/lib/habits";
import { buffsOnDragon, type SynergyBuff } from "@/lib/synergy-buffs";
import type { Lineup, LineupMode, PitState, SlotId, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function FormationBoard({
  lineup,
  state,
  selectedSlot,
  onSelectSlot,
  onClearSlot,
  onNameChange,
  onTroopChange,
  onModeChange,
  buffs = [],
  children,
}: {
  lineup: Lineup;
  state: PitState;
  selectedSlot?: SlotId | null;
  onSelectSlot?: (slot: SlotId) => void;
  onClearSlot?: (slot: SlotId) => void;
  onNameChange?: (name: string) => void;
  onTroopChange?: (troop: TroopType) => void;
  onModeChange?: (mode: LineupMode) => void;
  buffs?: SynergyBuff[];
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-stone-900/80 to-black/50 p-3 ring-1 ring-amber-500/20 sm:p-4">
      <div className="mb-2 flex items-center gap-2 sm:mb-3">
        <span className="rounded-full px-2 py-0.5 text-xs tracking-wide text-amber-100 ring-1 ring-amber-400/35">
          {lineupKindLabel(lineup.kind)}
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
      {onTroopChange || onModeChange ? (
        <div className="mb-2 space-y-1.5 sm:mb-3">
          <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            {TROOP_TYPES.map((troop) => (
              <MiniChip
                key={troop}
                active={lineup.troop === troop}
                onClick={() => onTroopChange?.(troop)}
              >
                {troopShort[troop]}
              </MiniChip>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            {MODES.map((mode) => (
              <MiniChip
                key={mode}
                active={lineup.mode === mode}
                onClick={() => onModeChange?.(mode)}
              >
                {modeShort[mode]}
              </MiniChip>
            ))}
          </div>
        </div>
      ) : (
        <p className="mb-2 text-xs text-amber-100/75 sm:mb-3">
          {troopShort[lineup.troop]} · {modeShort[lineup.mode]}
        </p>
      )}
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
            buffs={buffs}
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
  buffs,
}: {
  slot: SlotId;
  lineup: Lineup;
  state: PitState;
  selected: boolean;
  onSelect?: (slot: SlotId) => void;
  onClear?: (slot: SlotId) => void;
  buffs: SynergyBuff[];
}) {
  const resolved = resolveSlot(lineup, state, slot);
  const dragon = resolved?.dragon;
  const live = dragon ? buffsOnDragon(buffs, dragon.id) : [];

  const face = (
    <>
      <DragonIcon
        dragonId={dragon?.id}
        name={dragon?.name}
        rarity={dragon?.rarity}
        custom={dragon?.custom}
        empty={!dragon}
        selected={selected}
        size="3xl"
      />
      <span className="text-label text-amber-200/90">
        {slotShort[slot]}
      </span>
      <span className="max-w-full truncate px-0.5 text-sm font-medium">
        {dragon?.name ?? "Tap to pick"}
      </span>
      {resolved ? (
        <span className="text-xs text-amber-100/85">
          {formatInvestment(resolved.starRank, resolved.reignLevel, {
            kind: lineup.kind,
            ignoreLevel: lineup.ignoreLevel,
          })}
        </span>
      ) : null}
      {live[0] ? (
        <span className="max-w-full truncate rounded-full px-1.5 py-px text-[10px] tracking-wide text-emerald-100 ring-1 ring-emerald-400/45">
          {live[0].ability}
        </span>
      ) : null}
      {slot === "vanguard" && dragon ? (
        <span
          className="line-clamp-2 max-w-full px-1 text-center text-[11px] leading-snug text-emerald-100 sm:text-xs"
          title={vanguardBonus(dragon, true)}
        >
          {vanguardBonus(dragon, true)}
        </span>
      ) : null}
    </>
  );

  const slotClass = cn(
    "flex min-h-[10.75rem] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2.5 select-none sm:min-h-[15rem] sm:py-3",
    selected && "bg-amber-500/20 ring-2 ring-amber-300",
  );

  return (
    <div className="relative">
      {live.length > 0 ? (
        <Tooltip>
          <TooltipTrigger
            delay={160}
            closeOnClick={false}
            render={
              <button
                type="button"
                onClick={() => onSelect?.(slot)}
                className={slotClass}
              />
            }
          >
            {face}
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={6}
            className="max-w-[18rem] flex-col items-stretch gap-0 rounded-xl bg-stone-950 px-3 py-2.5 text-left text-stone-100 ring-1 ring-emerald-400/35"
          >
            <SynergyBuffList buffs={live} />
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={() => onSelect?.(slot)}
          className={slotClass}
        >
          {face}
        </button>
      )}
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
