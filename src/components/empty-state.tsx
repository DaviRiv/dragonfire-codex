import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  titleAs: Title = "h2",
  description,
  action,
  className,
}: {
  title: string;
  /**
   * An empty state stands in for a region's content, so its title is that
   * region's heading. Override to h1 only where it replaces the whole page.
   */
  titleAs?: "p" | "h1" | "h2";
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-sunken flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center sm:px-6 sm:py-14",
        className,
      )}
    >
      <Title className="font-heading text-lg tracking-wide text-foreground">
        {title}
      </Title>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
