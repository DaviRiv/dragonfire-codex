import { Badge } from "@/components/ui/badge";
import { TroopIcon } from "@/components/troop-icon";
import { troopLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TroopType } from "@/lib/types";

const troopTone: Record<TroopType, string> = {
  cavalry: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  shieldbearers: "border-slate-400/40 bg-slate-400/15 text-slate-200",
  archers: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  spearmen: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  siege: "border-violet-500/40 bg-violet-500/15 text-violet-200",
};

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
            "rounded-md px-1.5 py-0.5 font-normal",
            troopTone[troop],
            highlight === troop && "ring-1 ring-amber-300/70",
          )}
        >
          <TroopIcon troop={troop} className="size-3.5" />
          <span className="sr-only">{troopLabels[troop]}</span>
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
      className={cn("rounded-md px-1.5 py-0.5 font-normal", troopTone[troop], className)}
    >
      <TroopIcon troop={troop} className="size-3.5" />
      <span className="sr-only">{troopLabels[troop]}</span>
    </Badge>
  );
}
