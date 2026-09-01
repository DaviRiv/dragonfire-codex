import type { ReactNode } from "react";
import { qualifiesForStars, starGateHint } from "@/lib/stars";
import { cn } from "@/lib/utils";

/** Star gate. Red when the pit rank (or none) cannot use the ability yet. */
export function StarRequirement({
  stars,
  ownedStars,
  children,
  className,
}: {
  stars: number;
  ownedStars: number | null | undefined;
  children?: ReactNode;
  className?: string;
}) {
  const ok = qualifiesForStars(stars, ownedStars);
  return (
    <span
      className={cn(!ok && "font-medium text-red-400", className)}
      title={starGateHint(stars, ownedStars)}
    >
      {children ?? `${stars}★`}
    </span>
  );
}
