"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DragonIcon } from "@/components/dragon-icon";
import { SectionLabel } from "@/components/section-label";
import { TroopIcon } from "@/components/troop-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  canAutoBuildPitTeam,
  filledPitTeamCount,
  lineupFromAutoRank,
  lineupFromCopilotRank,
  pitSetupReady,
  pitTeamGrid,
  rankAutoPitLine,
  rankCopilotPitLine,
  shiftTargetsFor,
  suggestCopilotAnchorForNextTeam,
} from "@/lib/army-builder";
import { placedInLineup, resolveSlot } from "@/lib/lineup";
import { modeShort, slotShort } from "@/lib/labels";
import { MAX_PIT_TEAMS } from "@/lib/pit-teams";
import { usePit } from "@/lib/store";
import type { PitState, SlotId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  onCopilotAnchor: (dragonId: string) => void;
  onOpenLineup?: (lineupId: string) => void;
};

export function ArmyAutoBuilder({ onCopilotAnchor, onOpenLineup }: Props) {
  const { state, addLineup, swapPitSeats } = usePit();
  const [shiftFrom, setShiftFrom] = useState<{
    lineupId: string;
    slot: SlotId;
    dragonId: string;
    name: string;
  } | null>(null);

  const grid = useMemo(() => pitTeamGrid(state), [state]);
  const filled = filledPitTeamCount(state);
  const ready = pitSetupReady(state);
  const canBuild = canAutoBuildPitTeam(state);

  function seatRanked(
    rank:
      | ReturnType<typeof rankAutoPitLine>
      | ReturnType<typeof rankCopilotPitLine>,
    mode: "auto" | "copilot",
  ) {
    if (!rank) {
      toast.error("Not enough unseated pit dragons for another full team.");
      return;
    }
    const slotIndex = pitTeamGrid(state).findIndex((s) => !s.lineup);
    const pitIndex =
      slotIndex >= 0 ? slotIndex : Math.min(filled, MAX_PIT_TEAMS - 1);
    const lineup =
      mode === "copilot"
        ? lineupFromCopilotRank(
            state,
            pitIndex,
            rank as NonNullable<ReturnType<typeof rankCopilotPitLine>>,
          )
        : lineupFromAutoRank(
            state,
            pitIndex,
            rank as NonNullable<ReturnType<typeof rankAutoPitLine>>,
          );
    addLineup(lineup);
    toast.success(`${lineup.name} seated — ${filled + 1}/${MAX_PIT_TEAMS} pit teams.`);
    if (mode === "copilot" && "anchorId" in rank && rank.anchorId) {
      onCopilotAnchor(rank.anchorId);
    }
    onOpenLineup?.(lineup.id);
  }

  function autoBuild() {
    seatRanked(rankAutoPitLine(state), "auto");
  }

  function copilotBuild() {
    const anchor = suggestCopilotAnchorForNextTeam(state);
    if (anchor) onCopilotAnchor(anchor);
    seatRanked(rankCopilotPitLine(state, { anchorId: anchor }), "copilot");
  }

  if (!ready) {
    return (
      <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 ring-1 ring-amber-400/20">
        <SectionLabel>Step 1 — Set up your pit</SectionLabel>
        <p className="mt-2 text-sm text-muted-foreground">
          Mark at least three owned dragons with stars in the pit. Then come
          back here to auto-build up to five marching teams with Copilot.
        </p>
        <Link
          href="/pit?return=/coach"
          className={buttonVariants({ size: "sm", className: "mt-3" })}
        >
          Open pit
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="army-builder-heading"
      className="rounded-2xl surface p-3 ring-1 ring-foreground/15"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <SectionLabel id="army-builder-heading">
            Pit march · {filled}/{MAX_PIT_TEAMS} teams
          </SectionLabel>
          <p className="mt-1 text-xs text-muted-foreground">
            Step 2 — fill five pit teams. Auto-builder uses unseated dragons;
            shift any dragon between marches without double-booking.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canBuild}
            onClick={autoBuild}
            data-army-auto
          >
            <Wand2 data-icon="inline-start" />
            Auto-build next
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canBuild}
            onClick={copilotBuild}
            data-army-copilot
          >
            <Sparkles data-icon="inline-start" />
            Copilot-build next
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {grid.map((slot) => (
          <MarchSlotCard
            key={slot.index}
            index={slot.index}
            lineup={slot.lineup}
            state={state}
            shiftFrom={shiftFrom}
            onShiftStart={setShiftFrom}
            onShiftTo={(to) => {
              if (!shiftFrom) return;
              swapPitSeats(
                { lineupId: shiftFrom.lineupId, slot: shiftFrom.slot },
                to,
              );
              toast.success(
                `${shiftFrom.name} → ${to.label.replace(" · ", " ")}`,
              );
              setShiftFrom(null);
            }}
            onCancelShift={() => setShiftFrom(null)}
            canAutoBuild={canBuild && !slot.lineup}
            onAutoBuild={autoBuild}
            onCopilotBuild={copilotBuild}
          />
        ))}
      </div>

      {shiftFrom ? (
        <p className="mt-2 text-xs text-amber-100">
          Shifting <strong>{shiftFrom.name}</strong> — tap a seat on another
          march (swaps if occupied).{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setShiftFrom(null)}
          >
            Cancel
          </button>
        </p>
      ) : null}
    </section>
  );
}

function MarchSlotCard({
  index,
  lineup,
  state,
  shiftFrom,
  onShiftStart,
  onShiftTo,
  onCancelShift,
  canAutoBuild,
  onAutoBuild,
  onCopilotBuild,
}: {
  index: number;
  lineup: import("@/lib/types").Lineup | null;
  state: PitState;
  shiftFrom: {
    lineupId: string;
    slot: SlotId;
    dragonId: string;
    name: string;
  } | null;
  onShiftStart: (from: {
    lineupId: string;
    slot: SlotId;
    dragonId: string;
    name: string;
  }) => void;
  onShiftTo: (to: { lineupId: string; slot: SlotId; label: string }) => void;
  onCancelShift: () => void;
  canAutoBuild: boolean;
  onAutoBuild: () => void;
  onCopilotBuild: () => void;
}) {
  const placed = lineup ? placedInLineup(lineup, state) : [];
  const full = placed.length === 3;
  const targets =
    lineup && shiftFrom
      ? shiftTargetsFor(state, {
          lineupId: shiftFrom.lineupId,
          slot: shiftFrom.slot,
        })
      : [];

  if (!lineup) {
    return (
      <div className="flex min-h-36 flex-col justify-between rounded-xl border border-dashed border-amber-400/35 bg-black/20 p-2.5">
        <p className="text-[11px] font-medium text-amber-100/90">
          March {index + 1}
        </p>
        <p className="text-[10px] text-muted-foreground">Empty slot</p>
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-[11px]"
            disabled={!canAutoBuild}
            onClick={onAutoBuild}
          >
            Auto-build
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px]"
            disabled={!canAutoBuild}
            onClick={onCopilotBuild}
          >
            Copilot
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-36 flex-col gap-1.5 rounded-xl border p-2.5",
        full
          ? "border-amber-400/25 bg-amber-500/5"
          : "border-border/50 bg-black/25",
      )}
    >
      <div
        className="flex items-center justify-between gap-1"
        data-march-index={index}
      >
        <p className="truncate text-[11px] font-medium">{lineup.name}</p>
        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <TroopIcon troop={lineup.troop} className="size-3" />
          {modeShort[lineup.mode]}
        </span>
      </div>
      <ul className="flex flex-1 flex-col gap-1">
        {(["left", "vanguard", "right"] as SlotId[]).map((seat) => {
          const row = resolveSlot(lineup, state, seat);
          if (!row) {
            return (
              <li key={seat}>
                <span className="block rounded-md bg-muted/40 px-1.5 py-1 text-[10px] text-muted-foreground">
                  {slotShort[seat]} — empty
                </span>
              </li>
            );
          }
          const shifting =
            shiftFrom?.lineupId === lineup.id && shiftFrom.slot === seat;
          return (
            <li key={seat}>
              <button
                type="button"
                title={`Shift ${row.dragon.name}`}
                onClick={() => {
                  if (shiftFrom) {
                    if (
                      shiftFrom.lineupId === lineup.id &&
                      shiftFrom.slot === seat
                    ) {
                      onCancelShift();
                      return;
                    }
                    onShiftTo({
                      lineupId: lineup.id,
                      slot: seat,
                      label: `${lineup.name} · ${slotShort[seat]}`,
                    });
                    return;
                  }
                  onShiftStart({
                    lineupId: lineup.id,
                    slot: seat,
                    dragonId: row.dragon.id,
                    name: row.dragon.name,
                  });
                }}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[10px] ring-1 ring-transparent transition hover:bg-muted",
                  shifting && "ring-amber-400/50 bg-amber-500/15",
                  shiftFrom && !shifting && "hover:ring-amber-400/30",
                )}
              >
                <DragonIcon
                  dragonId={row.dragon.id}
                  name={row.dragon.name}
                  rarity={row.dragon.rarity}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-muted-foreground">{slotShort[seat]}</span>{" "}
                  {row.dragon.name}
                </span>
                <ArrowRightLeft className="size-3 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
      {shiftFrom && targets.length > 0 ? (
        <p className="text-[9px] text-muted-foreground">
          Tap a seat above to move or swap.
        </p>
      ) : null}
      <Link
        href={`/lineups/${lineup.id}`}
        className="text-[10px] text-amber-200 hover:underline"
      >
        Edit lineup
      </Link>
    </div>
  );
}