"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamBuilderWorkspace } from "@/app/team-page";
import type { TeamBuilderSeed } from "@/lib/team-builder-seed";
import { cn } from "@/lib/utils";

export function TeamBuilderDialog({
  open,
  onOpenChange,
  seed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed?: TeamBuilderSeed | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[min(94dvh,calc(100dvh-0.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-[min(96rem,calc(100%-0.5rem))] max-w-none flex-col gap-2 overflow-hidden p-3 sm:p-4",
          "top-[max(0.25rem,env(safe-area-inset-top))] translate-y-0 sm:top-[max(0.5rem,env(safe-area-inset-top))] sm:translate-y-0",
        )}
      >
        <DialogHeader className="shrink-0 gap-0.5 text-left">
          <DialogTitle className="font-heading text-lg tracking-wide">
            Build a team
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Seat Left, Vanguard, and Right — Copilot suggests full lines as you
            lock dragons, or pick a suggestion from chat below.
          </DialogDescription>
        </DialogHeader>
        <TeamBuilderWorkspace
          key={open ? JSON.stringify(seed ?? {}) : "closed"}
          seed={seed}
          className="min-h-0 flex-1 overflow-hidden"
        />
      </DialogContent>
    </Dialog>
  );
}