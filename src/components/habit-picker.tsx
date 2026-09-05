"use client";

import { Check, Search } from "lucide-react";
import { useEffect } from "react";
import { AbilityGlossList, AbilityHover, NamedAbilities } from "@/components/ability-insight";
import { AbilityTag, AbilityText } from "@/components/ability-text";
import { StarStepper } from "@/components/star-rank";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultHabits,
  kitProgress,
  sanitizeHabits,
  type KitHabitRow,
} from "@/lib/habits";
import { slotLabels } from "@/lib/labels";
import type { AbilitySourceRef } from "@/lib/ability-insight";
import { insightForSource } from "@/lib/ability-insight";
import { habitDisplayName } from "@/data/habit-names";
import type { Dragon } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HabitSearchButton({
  name,
  onClick,
}: {
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={`${name} kit`}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground ring-1 ring-foreground/20 select-none hover:bg-muted hover:text-foreground"
    >
      <Search className="size-3.5" aria-hidden />
    </button>
  );
}

function KitBlock({
  title,
  extra,
  body,
  live,
  dragonId,
  source,
}: {
  title: string;
  extra?: string;
  body: string;
  live?: boolean;
  dragonId: string;
  source: AbilitySourceRef;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-3 ring-1",
        live
          ? "bg-amber-500/20 ring-amber-300/60"
          : "bg-muted/40 ring-foreground/10",
      )}
    >
      <p className="text-label flex flex-wrap items-baseline gap-x-1.5">
        <AbilityHover dragonId={dragonId} source={source} locked={!live}>
          <span>{title}</span>
        </AbilityHover>
        {extra ? (
          <span className="font-normal tracking-normal text-muted-foreground normal-case">
            {extra}
          </span>
        ) : null}
      </p>
      <NamedAbilities
        dragonId={dragonId}
        source={source}
        locked={!live}
      />
      <p className="mt-1 text-[13px] leading-relaxed">
        <AbilityText text={body} dragonId={dragonId} source={source} />
      </p>
      <AbilityGlossList
        glosses={insightForSource(dragonId, source)?.glosses ?? []}
        dragonId={dragonId}
        className="mt-1.5"
      />
    </div>
  );
}

function HabitRow({
  row,
  dragonId,
  onToggle,
}: {
  row: KitHabitRow;
  dragonId: string;
  onToggle: (habit: number) => void;
}) {
  const source: AbilitySourceRef = { kind: "habit", habit: row.habit };
  const official = habitDisplayName(dragonId, row.habit);
  return (
    <div
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl p-3 ring-1",
        row.live
          ? "bg-amber-500/20 ring-amber-300/60"
          : "bg-muted/40 ring-foreground/10",
      )}
    >
      <button
        type="button"
        aria-pressed={row.selected}
        aria-label={
          row.selected
            ? `Habit ${row.habit} bought`
            : `Mark habit ${row.habit} bought`
        }
        onClick={() => onToggle(row.habit)}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md ring-1 select-none",
          row.live
            ? "bg-amber-400 text-black ring-amber-200"
            : "ring-foreground/25 hover:bg-muted",
        )}
      >
        {row.live ? <Check className="size-3.5" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <AbilityHover dragonId={dragonId} source={source} locked={!row.live}>
          <span className="flex flex-wrap items-baseline gap-x-1.5 text-[0.6875rem] font-medium tracking-[0.12em] uppercase">
            <span>Habit {row.habit}</span>
            {official ? (
              <>
                <span className="text-muted-foreground">·</span>
                <span>{official}</span>
              </>
            ) : null}
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{row.stars}★</span>
          </span>
        </AbilityHover>
        <NamedAbilities
          dragonId={dragonId}
          source={source}
          locked={!row.live}
        />
        <p className="mt-1 text-[13px] leading-relaxed">
          <AbilityText text={row.body} dragonId={dragonId} source={source} />
        </p>
        <AbilityGlossList
          glosses={insightForSource(dragonId, source)?.glosses ?? []}
          dragonId={dragonId}
          className="mt-1.5"
        />
      </div>
    </div>
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
  const hatched = starRank > 0;

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
            The list stays the same. Highlighted rows are live on this dragon.
            Hover or tap a named ability — Rallying Flame, New Moon, Taunt —
            for the full card and rank chances. Uncheck a habit if you have not
            bought it.
          </DialogDescription>
        </DialogHeader>
        {dragon && kit ? (
          <div className="space-y-2">
            {onStarChange ? (
              <div className="pb-1">
                <p className="text-label mb-1">Star rank</p>
                <StarStepper
                  value={starRank}
                  onDelta={(delta) => onStarChange(starRank + delta)}
                />
              </div>
            ) : null}

            {kit.liveEffects.length > 0 ? (
              <div className="flex flex-wrap gap-1 pb-1">
                {kit.liveEffects.map((effect) => (
                  <AbilityTag
                    key={effect.ability}
                    tag={effect.ability}
                    dragonId={dragon.id}
                  />
                ))}
              </div>
            ) : null}

            <KitBlock
              title="Vanguard"
              extra={`Buffs ${slotLabels[dragon.flankBonus]}`}
              live={hatched}
              dragonId={dragon.id}
              source={{ kind: "vanguard" }}
              body={
                kit.vanguard && kit.vanguard !== "Habits not recorded yet."
                  ? kit.vanguard
                  : "Vanguard skill not recorded yet."
              }
            />
            <KitBlock
              title="Command"
              live={hatched}
              dragonId={dragon.id}
              source={{ kind: "command" }}
              body={kit.command}
            />
            {kit.habits.map((row) => (
              <HabitRow
                key={row.habit}
                row={row}
                dragonId={dragon.id}
                onToggle={toggle}
              />
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
