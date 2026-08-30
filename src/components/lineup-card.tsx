import Link from "next/link";
import { TroopBadge } from "@/components/affinity-badges";
import { DragonIcon } from "@/components/dragon-icon";
import { findDragon, filledSlots } from "@/lib/dragons";
import { modeLabels, slotShort } from "@/lib/labels";
import type { Lineup, PitState, SlotId } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
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
              className="flex flex-col items-center gap-1 rounded-lg bg-black/30 px-1 py-2 text-center"
            >
              <p className="text-[10px] tracking-widest text-muted-foreground">
                {slotShort[slot].toUpperCase()}
              </p>
              <DragonIcon
                dragonId={dragon?.id}
                name={dragon?.name}
                rarity={dragon?.rarity}
                custom={dragon?.custom}
                empty={!dragon}
                size="lg"
              />
              <p className="w-full truncate text-xs">
                {dragon?.name ?? "Empty"}
              </p>
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
          <Badge key={slot} variant="secondary" className="max-w-[40vw] gap-1.5 pr-2 pl-1 sm:max-w-none">
            <DragonIcon
              dragonId={dragon.id}
              name={dragon.name}
              rarity={dragon.rarity}
              custom={dragon.custom}
              size="sm"
            />
            <span className="truncate">{dragon.name}</span>
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
