import { Badge } from "@/components/ui/badge";
import { troopLabels } from "@/lib/labels";
import { troopWordClass } from "@/components/troop-words";
import { cn } from "@/lib/utils";
import type { TroopType } from "@/lib/types";

export function AffinityBadges({
  affinities,
  highlight,
  className,
}: {
  affinities: TroopType[];
  highlight?: TroopType;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {affinities.map((troop) => (
        <Badge
          key={troop}
          variant="outline"
          title={troopLabels[troop]}
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            troopWordClass[troop],
            highlight === troop && "ring-1 ring-amber-300/70",
          )}
        >
          {troopLabels[troop]}
        </Badge>
      ))}
    </div>
  );
}

export function TroopBadge({
  troop,
  className,
}: {
  troop: TroopType;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      title={troopLabels[troop]}
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        troopWordClass[troop],
        className,
      )}
    >
      {troopLabels[troop]}
    </Badge>
  );
}
