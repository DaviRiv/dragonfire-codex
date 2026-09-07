"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

function StarMark({ filled }: { filled: boolean }) {
  return (
    <Star className="size-5" fill={filled ? "currentColor" : "none"} />
  );
}

export function StarVote({
  value,
  average,
  count,
  disabled,
  onChange,
  signInHref,
}: {
  value: number | null;
  average: number | null;
  count: number;
  disabled?: boolean;
  onChange?: (stars: number) => void;
  signInHref?: string;
}) {
  const shown = value ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label="Rate this line"
      >
        {[1, 2, 3, 4, 5].map((stars) => {
          const active = shown >= stars;
          const className = cn(
            "rounded-md p-1 text-muted-foreground transition hover:text-amber-200",
            active && "text-amber-300",
          );
          if (disabled && signInHref) {
            return (
              <Link
                key={stars}
                href={signInHref}
                aria-label={`Sign in to rate ${stars} stars`}
                className={className}
              >
                <StarMark filled={active} />
              </Link>
            );
          }
          return (
            <button
              key={stars}
              type="button"
              role="radio"
              aria-checked={shown === stars}
              aria-label={`${stars} star${stars === 1 ? "" : "s"}`}
              disabled={disabled}
              className={cn(className, disabled && "opacity-70")}
              onClick={() => onChange?.(stars)}
            >
              <StarMark filled={active} />
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        {average == null
          ? "No ratings yet"
          : `${average.toFixed(1)} · ${count} rating${count === 1 ? "" : "s"}`}
        {value ? ` · your ${value}★` : null}
      </p>
    </div>
  );
}
