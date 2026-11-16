"use client";

import { DragonIcon } from "@/components/dragon-icon";
import { SectionLabel } from "@/components/section-label";
import { slotShort } from "@/lib/labels";
import type { Dragon, SlotId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/**
 * One seat in the Left / Vanguard / Right bar. Team and Counter each carried
 * their own copy of this, so a fix to one quietly left the other behind.
 *
 * The star stepper gets its own row. Sharing a line with the name left a
 * seated dragon almost no width in a 118px column on a phone, and the
 * controls themselves were 24px and 18px boxes.
 */
export function SeatControl({
  slot,
  dragon,
  stars,
  open,
  onToggle,
  onStars,
  onClear,
  ...rest
}: {
  slot: SlotId;
  /** `undefined` when the catalog has no entry for a saved id. */
  dragon: Dragon | null | undefined;
  stars: number;
  open: boolean;
  onToggle: () => void;
  onStars: (next: number) => void;
  onClear: () => void;
} & React.ComponentProps<"div">) {
  return (
    <div
      {...rest}
      className={cn(
        "min-w-0 rounded-lg px-1 py-1 ring-1",
        open ? "bg-amber-500/15 ring-amber-300" : "ring-foreground/10",
        rest.className,
      )}
    >
      <SectionLabel as="h3">{slotShort[slot]}</SectionLabel>
      <button
        type="button"
        aria-pressed={open}
        aria-label={
          dragon
            ? `Change ${slotShort[slot]}, ${dragon.name}`
            : `Pick ${slotShort[slot]}`
        }
        className="mt-0.5 flex min-h-10 w-full min-w-0 items-center gap-1 rounded-md text-left hover:bg-muted/60"
        onClick={onToggle}
      >
        <DragonIcon
          dragonId={dragon?.id}
          name={dragon?.name}
          rarity={dragon?.rarity}
          empty={!dragon}
          size="sm"
          selected={open}
        />
        <span
          className={cn(
            "min-w-0 truncate text-[12px] leading-tight",
            dragon ? "text-amber-50" : "text-muted-foreground",
          )}
        >
          {dragon?.name ?? "Pick"}
        </span>
      </button>
      {dragon ? (
        <div className="mt-0.5 flex min-w-0 items-center justify-between gap-0.5">
          <button
            type="button"
            aria-label={`One less star on ${dragon.name}`}
            className="tap-y flex size-7 shrink-0 items-center justify-center rounded text-[13px] ring-1 ring-foreground/20 hover:bg-muted"
            onClick={() => onStars(stars - 1)}
          >
            −
          </button>
          <span className="text-num min-w-6 text-center text-[12px] text-amber-200">
            ★{stars}
          </span>
          <button
            type="button"
            aria-label={`One more star on ${dragon.name}`}
            className="tap-y flex size-7 shrink-0 items-center justify-center rounded text-[13px] ring-1 ring-foreground/20 hover:bg-muted"
            onClick={() => onStars(stars + 1)}
          >
            +
          </button>
          <button
            type="button"
            aria-label={`Clear ${slotShort[slot]}`}
            className="tap-y flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClear}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
