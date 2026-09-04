"use client";

import { Check, Search } from "lucide-react";
import { AbilityText } from "@/components/ability-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultHabits,
  HABIT_SLOT_COUNT,
  HABIT_UNLOCK_STARS,
  habitPreview,
  sanitizeHabits,
} from "@/lib/habits";
import type { Dragon } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HabitSearchButton({
  name,
  count,
  onClick,
}: {
  name: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={
        count > 0
          ? `${name} habits, ${count} selected`
          : `Select ${name} habits`
      }
      className={cn(
        "relative inline-flex size-7 shrink-0 items-center justify-center rounded-full ring-1 select-none",
        count > 0
          ? "bg-amber-500/20 text-amber-100 ring-amber-300/50"
          : "text-muted-foreground ring-foreground/20 hover:bg-muted hover:text-foreground",
      )}
    >
      <Search className="size-3.5" aria-hidden />
      {count > 0 ? (
        <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[9px] font-semibold text-black">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function HabitPickerDialog({
  dragon,
  open,
  onOpenChange,
  starRank,
  selected,
  onChange,
}: {
  dragon: Dragon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starRank: number;
  selected: number[];
  onChange: (habits: number[]) => void;
}) {
  const habits = sanitizeHabits(selected);
  const unlocked = defaultHabits(starRank);

  function toggle(habit: number) {
    onChange(
      habits.includes(habit)
        ? habits.filter((item) => item !== habit)
        : sanitizeHabits([...habits, habit]),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wide">
            {dragon ? `${dragon.name}’s habits` : "Habits"}
          </DialogTitle>
          <DialogDescription>
            Stars unlock the slot (2 / 4 / 6 / 8 / 10). You still buy each
            habit. Check the ones this dragon actually has.
          </DialogDescription>
        </DialogHeader>
        {dragon ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange(unlocked)}
              >
                Unlocked by stars
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange([])}
              >
                None
              </Button>
            </div>
            <ul className="space-y-2">
              {HABIT_UNLOCK_STARS.map((stars, index) => {
                const habit = index + 1;
                const on = habits.includes(habit);
                const gated = starRank < stars;
                const body = habitPreview(dragon.id, index);
                return (
                  <li key={habit}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(habit)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-xl p-3 text-left ring-1 select-none",
                        on
                          ? "bg-amber-500/20 ring-amber-300/60"
                          : "bg-muted/40 ring-foreground/10 hover:bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md ring-1",
                          on
                            ? "bg-amber-400 text-black ring-amber-200"
                            : "ring-foreground/25",
                        )}
                        aria-hidden
                      >
                        {on ? <Check className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-1.5 text-[0.6875rem] font-medium tracking-[0.12em] uppercase">
                          <span>Habit {habit}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className={gated ? "text-red-300" : "text-muted-foreground"}>
                            {stars}★
                          </span>
                          {gated ? (
                            <span className="font-normal tracking-normal text-red-300 normal-case">
                              Needs {stars}★
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed">
                          <AbilityText text={body} />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {starRank <= 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Checking a habit marks them owned at that star gate. Checking
                a higher habit later keeps current stars and saves it as a
                goal until you star them.
              </p>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                {HABIT_SLOT_COUNT} slots. {habits.length} bought
                {unlocked.length
                  ? ` · ${unlocked.length} unlocked at ★${starRank}`
                  : ""}
                .
              </p>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
