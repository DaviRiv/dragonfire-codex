import { cn } from "@/lib/utils";

/**
 * Placeholder block for content that is genuinely pending. These routes read
 * the pit out of localStorage on the client, so the server HTML used to be a
 * single grey sentence where a grid or a list was about to appear — which
 * reads as "nothing loaded" rather than "loading". Nothing here adds delay.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-foreground/[0.07]",
        className,
      )}
    />
  );
}

/** Shape of the dragon grid on /pit. */
export function GridSkeleton({ cards = 18 }: { cards?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading your pit"
      className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
    >
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          className="surface flex flex-col items-center gap-1 rounded-xl px-1 pt-1 pb-1.5 ring-1 ring-foreground/10"
        >
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="size-[4.75rem] rounded-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Shape of a list of saved lines or war kits. */
export function CardListSkeleton({
  rows = 2,
  columns = 2,
  label,
}: {
  rows?: number;
  columns?: number;
  label: string;
}) {
  return (
    <div role="status" aria-label={label} className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div
        className={cn(
          "grid gap-4",
          columns === 2 ? "md:grid-cols-2" : "md:grid-cols-1",
        )}
      >
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/10"
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
