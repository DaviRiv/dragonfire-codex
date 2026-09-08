"use client";

import { cn } from "@/lib/utils";

export function BetaBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 items-center rounded-full px-1.5 text-[9px] font-semibold tracking-[0.14em] text-amber-200 uppercase ring-1 ring-amber-400/55",
        className,
      )}
    >
      Beta
    </span>
  );
}
