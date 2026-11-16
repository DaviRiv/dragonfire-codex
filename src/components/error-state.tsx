"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * A failed request, said plainly, with a way out. A load error used to render
 * through EmptyState as "Talk is quiet" with the real message as the body,
 * which told the reader the room was empty when in fact the fetch failed and
 * gave them nothing to press.
 */
export function ErrorState({
  title = "That did not load",
  detail,
  onRetry,
}: {
  title?: string;
  detail?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="surface-sunken flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-destructive/40 px-4 py-10 text-center sm:px-6"
    >
      <AlertTriangle
        className="size-5 text-destructive"
        aria-hidden
      />
      <div className="space-y-1">
        <h2 className="font-heading text-lg tracking-wide">{title}</h2>
        {detail ? (
          <p className="text-ui mx-auto max-w-md text-muted-foreground">
            {detail}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          <RotateCw data-icon="inline-start" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
