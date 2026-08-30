import { AffinityBadges } from "@/components/affinity-badges";
import { Badge } from "@/components/ui/badge";
import {
  breedLabels,
  breedRoles,
  marchLabels,
  rarityLabels,
  slotLabels,
  statLabels,
  statShort,
  STAT_KEYS,
} from "@/lib/labels";
import type { Dragon, DragonStats } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatLine({ stats }: { stats: DragonStats }) {
  return (
    <span className="flex flex-wrap gap-x-2.5 text-[11px] tabular-nums text-muted-foreground">
      {STAT_KEYS.map((key) => (
        <span key={key}>
          <span className="text-muted-foreground/70">{statShort[key]}</span>{" "}
          {stats[key]}
        </span>
      ))}
    </span>
  );
}

export function StatGrid({
  stats,
  compact,
  className,
}: {
  stats: DragonStats;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-2", className)}>
      {STAT_KEYS.map((key) => (
        <div key={key}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="tracking-wide text-muted-foreground">
              {compact ? statShort[key] : statLabels[key]}
            </span>
            <span className="font-medium tabular-nums">{stats[key]}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-300"
              style={{ width: `${Math.min(100, stats[key])}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DragonProfile({
  dragon,
  highlightTroop,
}: {
  dragon: Dragon;
  highlightTroop?: Dragon["affinities"][number];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="rounded-md font-normal">
          {rarityLabels[dragon.rarity]}
        </Badge>
        <Badge variant="outline" className="rounded-md font-normal">
          {breedLabels[dragon.breed]}
        </Badge>
        <Badge variant="outline" className="rounded-md font-normal">
          {marchLabels[dragon.marchSpeed]}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {breedRoles[dragon.breed]} Buffs the {slotLabels[dragon.flankBonus]}.
      </p>
      <AffinityBadges
        affinities={dragon.affinities}
        highlight={highlightTroop}
      />
      <div>
        <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">
          STATS
        </p>
        <StatGrid stats={dragon.stats} />
      </div>
      <AbilityBlock title="Habit" body={dragon.habit} />
      <AbilityBlock title="Command" body={dragon.command} />
      {dragon.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {dragon.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="rounded-md font-normal"
            >
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AbilityBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-sm">
      <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
        {title.toUpperCase()}
      </p>
      <p className="mt-1 leading-relaxed">{body}</p>
    </div>
  );
}
