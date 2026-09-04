"use client";

import { Check, Search } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { AbilityTag, AbilityText } from "@/components/ability-text";
import { StarStepper } from "@/components/star-rank";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { defaultHabits, kitProgress, sanitizeHabits, type KitHabitRow } from "@/lib/habits";
import { slotLabels } from "@/lib/labels";
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
        count > 0 ? `${name} kit, ${count} live habits` : `${name} kit`
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

function EffectRow({
  abilities,
  muted,
}: {
  abilities: string[];
  muted?: boolean;
}) {
  if (abilities.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", muted && "opacity-70")}>
      {abilities.map((ability) => (
        <AbilityTag key={ability} tag={ability} />
      ))}
    </div>
  );
}

function KitBlock({
  title,
  extra,
  body,
  muted,
  children,
}: {
  title: string;
  extra?: string;
  body?: string;
  muted?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-3 ring-1",
        muted
          ? "bg-muted/30 ring-foreground/10 opacity-80"
          : "bg-muted/50 ring-foreground/10",
      )}
    >
      <p className="text-label flex flex-wrap items-baseline gap-x-1.5">
        <span>{title}</span>
        {extra ? (
          <span className="font-normal tracking-normal text-muted-foreground normal-case">
            {extra}
          </span>
        ) : null}
      </p>
      {body ? (
        <p className="mt-1 text-[13px] leading-relaxed">
          <AbilityText text={body} />
        </p>
      ) : null}
      {children}
    </div>
  );
}

function HabitRow({
  row,
  onToggle,
  upcoming,
}: {
  row: KitHabitRow;
  onToggle: (habit: number) => void;
  upcoming?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={row.selected}
      onClick={() => onToggle(row.habit)}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl p-3 text-left ring-1 select-none",
        row.live
          ? "bg-amber-500/20 ring-amber-300/60"
          : upcoming
            ? "bg-muted/30 ring-foreground/10"
            : "bg-muted/40 ring-foreground/10 hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md ring-1",
          row.selected
            ? "bg-amber-400 text-black ring-amber-200"
            : "ring-foreground/25",
        )}
        aria-hidden
      >
        {row.selected ? <Check className="size-3.5" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-1.5 text-[0.6875rem] font-medium tracking-[0.12em] uppercase">
          <span>Habit {row.habit}</span>
          <span className="text-muted-foreground">·</span>
          <span className={upcoming ? "text-red-300" : "text-muted-foreground"}>
            {row.stars}★
          </span>
          {upcoming ? (
            <span className="font-normal tracking-normal text-red-300 normal-case">
              at {row.stars}★
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed">
          <AbilityText text={row.body} />
        </span>
      </span>
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
  onStarChange,
}: {
  dragon: Dragon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starRank: number;
  selected: number[];
  onChange: (habits: number[]) => void;
  onStarChange?: (starRank: number) => void;
}) {
  const kit = dragon ? kitProgress(dragon, starRank, selected) : null;
  const unbought = kit
    ? kit.habits.filter(
        (row) => kit.owned && starRank >= row.stars && !row.selected,
      )
    : [];

  useEffect(() => {
    if (!open || starRank <= 0) return;
    const unlocked = defaultHabits(starRank);
    if (unlocked.length === 0) return;
    const missing = unlocked.filter((habit) => !selected.includes(habit));
    if (missing.length === 0) return;
    onChange(sanitizeHabits([...selected, ...unlocked]));
    // Only when the dialog opens or stars change — not on every uncheck.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dragon?.id, starRank]);

  function toggle(habit: number) {
    const habits = sanitizeHabits(selected);
    onChange(
      habits.includes(habit)
        ? habits.filter((item) => item !== habit)
        : sanitizeHabits([...habits, habit]),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wide">
            {dragon
              ? starRank > 0
                ? `${dragon.name} · ★${starRank} kit`
                : `${dragon.name}’s kit`
              : "Kit"}
          </DialogTitle>
          <DialogDescription>
            Stars pick the habits that are open. Command and Vanguard are
            always on once they hatch. Uncheck a habit if you have not bought
            it yet.
          </DialogDescription>
        </DialogHeader>
        {dragon && kit ? (
          <div className="space-y-3">
            {onStarChange ? (
              <div>
                <p className="text-label mb-1">Star rank</p>
                <StarStepper
                  value={starRank}
                  onDelta={(delta) => onStarChange(starRank + delta)}
                />
              </div>
            ) : null}

            <KitBlock
              title="Vanguard"
              extra={`Buffs ${slotLabels[dragon.flankBonus]}`}
              body={
                kit.vanguard && kit.vanguard !== "Habits not recorded yet."
                  ? kit.vanguard
                  : "Vanguard skill not recorded yet."
              }
            />

            {kit.owned ? (
              <div className="space-y-2">
                <p className="text-label">Live at ★{starRank}</p>
                <EffectRow
                  abilities={kit.liveEffects.map((effect) => effect.ability)}
                />
                <KitBlock title="Command" body={kit.command} />
                {kit.liveHabits.length === 0 && unbought.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    {starRank < 2
                      ? "No habits yet. Star to 2★ for Habit 1."
                      : "No habits marked bought at this rank."}
                  </p>
                ) : null}
                {kit.liveHabits.map((row) => (
                  <HabitRow key={row.habit} row={row} onToggle={toggle} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-label">Always on once they hatch</p>
                <EffectRow
                  abilities={(dragon.provides ?? [])
                    .filter((gate) => gate.unlockStars == null)
                    .map((gate) => gate.ability)}
                />
                <KitBlock title="Command" body={kit.command} />
              </div>
            )}

            {unbought.length > 0 ? (
              <div className="space-y-2">
                <p className="text-label">Unlocked — not marked bought</p>
                {unbought.map((row) => (
                  <HabitRow key={row.habit} row={row} onToggle={toggle} />
                ))}
              </div>
            ) : null}

            {kit.nextUnlocks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-label">
                  {kit.owned ? "If you keep starring" : "If you star them"}
                </p>
                {kit.nextUnlocks.map((group) => (
                  <div key={group.stars} className="space-y-2">
                    <p className="text-[13px] text-red-300">
                      At {group.stars}★
                      {group.effects.length > 0
                        ? ` · ${group.effects.join(", ")}`
                        : ""}
                    </p>
                    <EffectRow abilities={group.effects} muted />
                    {group.habits.map((row) => (
                      <HabitRow
                        key={row.habit}
                        row={row}
                        onToggle={toggle}
                        upcoming
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : kit.owned ? (
              <p className="text-[13px] text-muted-foreground">
                All five habits are open at 10★.
              </p>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
