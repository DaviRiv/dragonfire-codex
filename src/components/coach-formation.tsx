"use client";

import { DragonIcon } from "@/components/dragon-icon";
import { TroopIcon } from "@/components/troop-icon";
import { Button } from "@/components/ui/button";
import type { AiLine } from "@/lib/ai/prompt";
import type { AiPool } from "@/lib/ai/roster";
import { findDragon } from "@/lib/dragons";
import { modeLabels, slotShort, troopLabels } from "@/lib/labels";
import { SLOT_IDS } from "@/lib/lineup";
import { dragonRoles, roleChipClass, roleShort } from "@/lib/roles";
import type { PitState, Rarity, SlotId } from "@/lib/types";
import { cn } from "@/lib/utils";

/** What each seat is for, in the player's words. */
const SEAT_JOB: Record<SlotId, string> = {
  left: "Flank",
  vanguard: "Tank · soaks the hit",
  right: "Flank",
};

type Seat = {
  slot: SlotId;
  id: string;
  name: string;
  stars: number | null;
  owned: boolean;
  roles: string[];
  rarity?: Rarity;
  custom?: boolean;
  known: boolean;
};

function readSeat(slot: SlotId, id: string, state: PitState): Seat {
  const dragon = findDragon(id, state.customDragons);
  const owned = state.owned.find((row) => row.dragonId === id);
  if (!dragon) {
    // A line can only name a dragon this build does not know if the save is
    // old or hand-edited. Show the raw id rather than an empty card.
    return {
      slot,
      id,
      name: id,
      stars: null,
      owned: false,
      roles: [],
      known: false,
    };
  }
  return {
    slot,
    id,
    name: dragon.name,
    stars: owned?.starRank ?? null,
    owned: Boolean(owned),
    roles: dragonRoles(dragon).map((role) => roleShort[role]),
    rarity: dragon.rarity,
    custom: dragon.custom,
    known: true,
  };
}

const ROLE_CLASS: Record<string, string> = {
  Heal: roleChipClass.healing,
  Tank: roleChipClass.tanking,
  DPS: roleChipClass.damage,
  CC: roleChipClass.control,
};

/**
 * One ranked line, laid out the way the seats sit on the board: Left flank,
 * Vanguard, Right flank, then why it works.
 */
export function CoachFormation({
  line,
  state,
  pool,
  onSeat,
  className,
}: {
  line: AiLine;
  state: PitState;
  pool: AiPool;
  onSeat?: (line: AiLine) => void;
  className?: string;
}) {
  const ids: Record<SlotId, string> = {
    left: line.left,
    vanguard: line.vanguard,
    right: line.right,
  };
  const seats = SLOT_IDS.map((slot) => readSeat(slot, ids[slot], state));
  const unknown = seats.filter((seat) => !seat.known);
  const unowned = seats.filter((seat) => seat.known && !seat.owned);
  const blocked =
    unknown.length > 0 || (pool === "pit" && unowned.length > 0);
  const blockedWhy =
    unknown.length > 0
      ? `${unknown.map((seat) => seat.id).join(", ")} is not in this build's dragon list.`
      : unowned.length > 0
        ? `${unowned.map((seat) => seat.name).join(", ")} is not marked owned.`
        : null;

  return (
    <article
      data-coach-formation={line.name}
      className={cn(
        "rounded-2xl bg-gradient-to-b from-stone-900/80 to-black/50 p-3 ring-1 ring-amber-500/20",
        className,
      )}
    >
      <header className="mb-2 min-w-0">
        <h3 className="font-heading truncate text-base tracking-wide text-amber-50">
          {line.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-100/75">
          <TroopIcon troop={line.troop} className="size-3.5" />
          <span>
            {troopLabels[line.troop]} · {modeLabels[line.mode]}
          </span>
        </p>
      </header>

      <ol className="grid grid-cols-3 gap-1.5">
        {seats.map((seat) => (
          <li
            key={seat.slot}
            data-seat={seat.slot}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center",
              seat.slot === "vanguard"
                ? "bg-amber-500/10 ring-1 ring-amber-400/30"
                : "bg-black/25 ring-1 ring-foreground/10",
            )}
          >
            <span className="text-label text-amber-200/90">
              {slotShort[seat.slot].toUpperCase()}
            </span>
            <DragonIcon
              dragonId={seat.known ? seat.id : undefined}
              name={seat.name}
              rarity={seat.rarity}
              custom={seat.custom}
              empty={!seat.known}
              size="xl"
              dimmed={seat.known && !seat.owned}
            />
            <span className="max-w-full truncate text-sm font-medium">
              {seat.name}
              {seat.stars != null ? ` ★${seat.stars}` : ""}
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              {SEAT_JOB[seat.slot]}
            </span>
            {seat.roles.length > 0 ? (
              <span className="flex flex-wrap justify-center gap-0.5">
                {seat.roles.map((role) => (
                  <span
                    key={role}
                    className={cn(
                      "rounded-full px-1.5 py-px text-[10px] ring-1",
                      ROLE_CLASS[role] ?? "ring-foreground/20",
                    )}
                  >
                    {role}
                  </span>
                ))}
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {line.why?.trim() ? (
        <p className="mt-2 border-t border-amber-500/15 pt-2 text-[13px] leading-snug break-words text-amber-50/90">
          <span className="text-label mr-1 text-amber-200/90">Why</span>
          {line.why.trim()}
        </p>
      ) : null}

      {onSeat ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => onSeat(line)}
            disabled={blocked}
            data-seat-line={line.name}
          >
            Seat on Team
          </Button>
          {blockedWhy ? (
            <span className="text-xs text-muted-foreground">{blockedWhy}</span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
