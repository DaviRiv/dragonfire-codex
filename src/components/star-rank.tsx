"use client";

import {
  PortraitStars,
  STAR_MAX,
  STAR_ROW,
} from "@/components/portrait-stars";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function starRankCaption(value: number): string {
  if (value <= 0) return "0★";
  return `★${value}`;
}

export function StarStepper({
  value,
  onDelta,
  size = "md",
}: {
  value: number;
  onDelta: (delta: number) => void;
  size?: "sm" | "md";
}) {
  const compact = size === "sm";
  /*
   * A 44px triple does not fit a three-up grid cell on a 390px phone, so the
   * compact pair draws at 36px and borrows the rest of its hit area from the
   * gap with `.tap`. Full size keeps the 44px box it already had.
   */
  const stepClass = compact
    ? "tap size-9 min-h-9 min-w-9"
    : "min-h-11 min-w-11";
  return (
    <div
      className="flex items-center justify-center gap-0.5"
      aria-label={starRankCaption(value)}
    >
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="One less star"
        disabled={value <= 0}
        className={stepClass}
        onClick={(event) => {
          event.stopPropagation();
          onDelta(-1);
        }}
      >
        −
      </Button>
      <span
        className={cn(
          "text-center tabular-nums",
          compact ? "min-w-7 text-[12px]" : "min-w-10 text-[13px]",
          value > STAR_ROW ? "text-red-400" : "text-amber-200",
        )}
      >
        ★{value || 0}
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="One more star"
        disabled={value >= STAR_MAX}
        className={stepClass}
        onClick={(event) => {
          event.stopPropagation();
          onDelta(1);
        }}
      >
        +
      </Button>
    </div>
  );
}

export function StarRank({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2", onChange && "w-full")}>
      <PortraitStars
        value={value}
        onChange={onChange}
        size={size === "sm" ? "lg" : "sheet"}
        layout="row"
      />
      {onChange ? (
        <>
          <StarStepper
            value={value}
            onDelta={(delta) =>
              onChange(Math.min(STAR_MAX, Math.max(0, (value || 0) + delta)))
            }
          />
          <p className="text-center text-[13px] text-muted-foreground">
            {starRankCaption(value)}. 0★ is not in your collection.
          </p>
        </>
      ) : null}
    </div>
  );
}
