import Link from "next/link";
import { TroopBadge } from "@/components/affinity-badges";
import { DragonPortrait } from "@/components/dragon-portrait";
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
              className="overflow-hidden rounded-lg bg-black/30 text-center ring-1 ring-foreground/8"
            >
              <p className="px-2 pt-1.5 text-[10px] tracking-widest text-muted-foreground">
                {slotLabels[slot].split(" ")[0]}
              </p>
              {dragon && owned ? (
                <>
                  <DragonPortrait
                    dragonId={dragon.id}
                    name={dragon.name}
                    breed={dragon.breed}
                    custom={dragon.custom}
                    className="mx-auto mt-1 aspect-square w-full"
                    sizes="120px"
                  />
                  <p className="truncate px-1 py-1.5 text-xs">{dragon.name}</p>
                </>
              ) : (
                <p className="px-2 py-8 text-xs text-muted-foreground">Empty</p>
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
          <Badge key={slot} variant="secondary" className="gap-1.5 pr-2 pl-1">
            <DragonPortrait
              dragonId={dragon.id}
              name={dragon.name}
              breed={dragon.breed}
              custom={dragon.custom}
              className="size-5 rounded-full"
              sizes="24px"
            />
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
