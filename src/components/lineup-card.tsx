import Link from "next/link";
import { TroopBadge } from "@/components/affinity-badges";
import { DragonMark } from "@/components/dragon-mark";
import { Badge } from "@/components/ui/badge";
import { findDragon, filledSlots } from "@/lib/dragons";
import { modeLabels, slotLabels } from "@/lib/labels";
import type { Lineup, PitState, SlotId } from "@/lib/types";

export function LineupCard({
  lineup,
  state,
}: {
  lineup: Lineup;
  state: PitState;
}) {
  const filled = filledSlots(lineup);
  return (
    <Link
      href={`/lineups/${lineup.id}`}
      className="block rounded-2xl bg-card/80 p-4 ring-1 ring-foreground/10 transition hover:ring-amber-400/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-lg tracking-wide">{lineup.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {modeLabels[lineup.mode]} · {filled}/3 slotted
          </p>
        </div>
        <TroopBadge troop={lineup.troop} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {(["left", "vanguard", "right"] as SlotId[]).map((slot) => {
          const owned = state.owned.find((o) => o.id === lineup.slots[slot]);
          const dragon = owned
            ? findDragon(owned.dragonId, state.customDragons)
            : undefined;
          return (
            <div
              key={slot}
              className="rounded-lg bg-black/30 p-2 text-center ring-1 ring-foreground/8"
            >
              <p className="text-[10px] tracking-widest text-muted-foreground">
                {slotLabels[slot].split(" ")[0]}
              </p>
              {dragon && owned ? (
                <>
                  <DragonMark breed={dragon.breed} className="mx-auto mt-1 size-6" />
                  <p className="mt-1 truncate text-xs">{dragon.name}</p>
                  <p className="text-[10px] text-muted-foreground">★{owned.starRank}</p>
                </>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">Empty</p>
              )}
            </div>
          );
        })}
      </div>
      {lineup.notes ? (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{lineup.notes}</p>
      ) : null}
    </Link>
  );
}

export function MiniSlotRow({
  lineup,
  state,
}: {
  lineup: Lineup;
  state: PitState;
}) {
  return (
    <div className="flex items-center gap-2">
      {(["left", "vanguard", "right"] as SlotId[]).map((slot) => {
        const owned = state.owned.find((o) => o.id === lineup.slots[slot]);
        const dragon = owned
          ? findDragon(owned.dragonId, state.customDragons)
          : undefined;
        return dragon ? (
          <Badge key={slot} variant="secondary" className="gap-1">
            <DragonMark breed={dragon.breed} className="size-3" />
            {dragon.name}
          </Badge>
        ) : (
          <Badge key={slot} variant="outline">
            —
          </Badge>
        );
      })}
    </div>
  );
}
