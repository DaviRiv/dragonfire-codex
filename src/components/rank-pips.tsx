"use client";

import { HABIT_RANK_MAX } from "@/lib/habits";
import { cn } from "@/lib/utils";

export function RankPip({
  rank,
  active,
  className,
}: {
  rank: number;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-5 items-center justify-center text-[10px]",
        active ? "text-black" : "text-amber-100",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute size-3.5 rotate-45 rounded-[2px] ring-1",
          active
            ? "bg-amber-400 ring-amber-100"
            : "bg-zinc-800 ring-amber-200/50",
        )}
      />
      <span className="relative tabular-nums">{rank}</span>
    </span>
  );
}

/** Rank 1–5 habit-upgrade picker. Percents in the habit paragraph follow this. */
export function RankPips({
  value,
  onChange,
  disabled,
  name,
}: {
  value: number;
  onChange?: (rank: number) => void;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-1"
      role="radiogroup"
      aria-label={name ? `${name} upgrade rank` : "Habit upgrade rank"}
    >
      <span className="mr-1 text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
        Rank
      </span>
      {Array.from({ length: HABIT_RANK_MAX }, (_, i) => {
        const rank = i + 1;
        const selected = value === rank;
        return (
          <button
            key={rank}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Rank ${rank}`}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onChange?.(rank);
            }}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md select-none",
              selected ? "bg-amber-400/15" : "hover:bg-muted",
              disabled && "opacity-50",
            )}
          >
            <RankPip rank={rank} active={selected} />
          </button>
        );
      })}
    </div>
  );
}
