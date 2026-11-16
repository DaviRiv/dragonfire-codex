"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Chips overflow sideways on a phone and wrap on a wider screen. This long
 * class string was pasted into six places with small differences; the group
 * role is here too, so a screen reader knows which facet a pressed chip
 * belongs to instead of hearing nine unrelated toggles in a row.
 */
export function ChipRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Shown in place of results when filters exclude everything. Deliberately not
 * the page-level `EmptyState`, which means "you own nothing yet": a reader who
 * hit this one needs their filters relaxed, not a tour of the app.
 */
export function NoMatches({
  onClear,
  children,
}: {
  onClear: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="surface surface-sunken flex flex-col items-center gap-2 rounded-xl px-4 py-8 text-center ring-1">
      <p className="text-ui text-muted-foreground">
        {children ?? "Nothing matches these filters."}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="text-ui-sm min-h-10 rounded-full px-3 text-amber-200 ring-1 ring-amber-400/40 transition-colors hover:bg-amber-500/15"
      >
        Clear filters
      </button>
    </div>
  );
}
