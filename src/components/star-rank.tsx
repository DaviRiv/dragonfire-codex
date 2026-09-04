"use client";

import { useEffect, useState } from "react";
import { MiniChip } from "@/components/chip";
import {
  PortraitStars,
  STAR_MAX,
  STAR_ROW,
  type StarPick,
} from "@/components/portrait-stars";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function starRankCaption(value: number): string {
  if (value <= 0) return "Not set";
  if (value <= STAR_ROW) return `★${value} yellow`;
  return `★${value} · ${value - STAR_ROW} red`;
}

export function StarStepper({
  value,
  onDelta,
}: {
  value: number;
  onDelta: (delta: number) => void;
}) {
  const atRed = value >= STAR_ROW;
  return (
    <div
      className="flex items-center justify-center gap-1"
      aria-label={starRankCaption(value)}
    >
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="One less star"
        disabled={value <= 1}
        className="min-h-11 min-w-11"
        onClick={(event) => {
          event.stopPropagation();
          onDelta(-1);
        }}
      >
        −
      </Button>
      <span
        className={cn(
          "min-w-10 text-center text-[13px] tabular-nums",
          value > STAR_ROW ? "text-red-400" : "text-amber-200",
        )}
      >
        ★{value || 0}
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant={atRed && value < STAR_MAX ? "default" : "outline"}
        aria-label={value >= STAR_ROW ? "Add a red star" : "One more star"}
        disabled={value >= STAR_MAX}
        className={cn(
          "min-h-11 min-w-11",
          atRed && value < STAR_MAX && "bg-red-600 text-white hover:bg-red-500",
        )}
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
  const [mode, setMode] = useState<StarPick>(value > STAR_ROW ? "red" : "gold");

  useEffect(() => {
    setMode(value > STAR_ROW ? "red" : "gold");
  }, [value]);

  return (
    <div className={cn("flex flex-col items-center gap-2", onChange && "w-full")}>
      {onChange ? (
        <div className="flex flex-wrap justify-center gap-1">
          <MiniChip active={mode === "gold"} onClick={() => setMode("gold")}>
            Yellow 1–5
          </MiniChip>
          <MiniChip active={mode === "red"} onClick={() => setMode("red")}>
            Red 6–10
          </MiniChip>
        </div>
      ) : null}
      <PortraitStars
        value={value}
        onChange={onChange}
        pick={onChange ? mode : undefined}
        size={size === "sm" ? "lg" : "sheet"}
        layout="row"
      />
      {onChange ? (
        <>
          <StarStepper
            value={value}
            onDelta={(delta) =>
              onChange(Math.min(STAR_MAX, Math.max(1, (value || 0) + delta)))
            }
          />
          <p className="text-center text-[13px] text-muted-foreground">
            {starRankCaption(value)}. Tap Yellow or Red, then a star — or use +
            to walk 1–10.
          </p>
        </>
      ) : null}
    </div>
  );
}
