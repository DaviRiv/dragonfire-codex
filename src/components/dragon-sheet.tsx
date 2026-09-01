"use client";

import { DragonPortrait } from "@/components/dragon-portrait";
import { DragonProfile } from "@/components/dragon-profile";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Dragon, TroopType } from "@/lib/types";

export function DragonSheet({
  dragon,
  open,
  onOpenChange,
  highlightTroop,
  starRank,
  reignLevel,
  actionLabel,
  onAction,
  actionDisabled,
  ownedStars,
}: {
  dragon: Dragon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightTroop?: TroopType;
  starRank?: number;
  reignLevel?: number;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  ownedStars?: number | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:justify-self-center"
      >
        {dragon ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-heading tracking-wide">
                {dragon.name}
              </SheetTitle>
              <SheetDescription>{dragon.epithet}</SheetDescription>
            </SheetHeader>
            <DragonPortrait
              dragonId={dragon.id}
              name={dragon.name}
              breed={dragon.breed}
              custom={dragon.custom}
              className="mx-4 aspect-[4/3] rounded-lg"
              sizes="500px"
            />
            <div className="px-4 pb-2">
              <DragonProfile
                dragon={dragon}
                highlightTroop={highlightTroop}
                starRank={starRank}
                reignLevel={reignLevel}
                ownedStars={ownedStars}
              />
            </div>
            {onAction && actionLabel ? (
              <SheetFooter>
                <Button
                  className="w-full"
                  onClick={onAction}
                  disabled={actionDisabled}
                >
                  {actionLabel}
                </Button>
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
