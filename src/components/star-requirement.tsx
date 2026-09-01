import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { qualifiesForStars, starGateHint } from "@/lib/stars";
import { cn } from "@/lib/utils";

/** Star gate. Red warning icon when the pit rank cannot use the ability yet. */
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
  const hint = starGateHint(stars, ownedStars);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 align-middle",
        !ok && "star-gate-warn font-semibold",
        className,
      )}
      title={hint}
      aria-label={ok ? undefined : hint}
    >
      {!ok ? (
        <>
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          <span className="sr-only">Warning: </span>
        </>
      ) : null}
      {children ?? `${stars}★`}
    </span>
  );
}
