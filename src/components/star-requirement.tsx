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
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5",
        !ok && "font-medium text-red-400",
        className,
      )}
      title={starGateHint(stars, ownedStars)}
    >
      {!ok ? (
        <>
          <TriangleAlert
            className="mb-px size-3 shrink-0 self-center"
            aria-hidden
          />
          <span className="sr-only">Warning: </span>
        </>
      ) : null}
      {children ?? `${stars}★`}
    </span>
  );
}
