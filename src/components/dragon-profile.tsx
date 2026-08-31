import { AbilityTag, AbilityText } from "@/components/ability-text";
import { AffinityBadges } from "@/components/affinity-badges";
import { Badge } from "@/components/ui/badge";
import { STAT_BAR_CLASS, STAT_TEXT_CLASS } from "@/lib/ability-text";
import { dragonKit } from "@/lib/habits";
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
import {
  dragonPower,
  formatPower,
  hubLevel,
  scaledStats,
  troopCount,
} from "@/lib/scale-stats";
import type { Dragon, DragonStats } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAT_BAR_MAX = 400;

export function StatLine({ stats }: { stats: DragonStats }) {
  return (
    <span className="flex flex-wrap gap-x-2.5 text-[11px] tabular-nums text-muted-foreground">
      {STAT_KEYS.map((key) => (
        <span key={key}>
          <span className={STAT_TEXT_CLASS[key]}>{statShort[key]}</span>{" "}
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
            <span className={cn("tracking-wide", STAT_TEXT_CLASS[key])}>
              {compact ? statShort[key] : statLabels[key]}
            </span>
            <span className="font-medium tabular-nums">{stats[key]}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", STAT_BAR_CLASS[key])}
              style={{
                width: `${Math.min(100, (stats[key] / STAT_BAR_MAX) * 100)}%`,
              }}
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
  starRank = 1,
  reignLevel = 1,
}: {
  dragon: Dragon;
  highlightTroop?: Dragon["affinities"][number];
  starRank?: number;
  reignLevel?: number;
}) {
  const kit = dragonKit(dragon);
  const stats = scaledStats(dragon, starRank, reignLevel);
  const troops = troopCount(dragon.rarity, starRank, reignLevel);
  const power = dragonPower(dragon.rarity, starRank, reignLevel);
  const level = hubLevel(reignLevel);
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
        <AbilityText
          text={`${breedRoles[dragon.breed]} Buffs the ${slotLabels[dragon.flankBonus]}.`}
        />
      </p>
      <AffinityBadges
        affinities={dragon.affinities}
        highlight={highlightTroop}
      />
      {dragon.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {dragon.tags.map((tag) => (
            <AbilityTag key={tag} tag={tag} />
          ))}
        </div>
      ) : null}
      <AbilityBlock title="Command" body={kit.command} />
      {kit.extras.map((extra) => (
        <AbilityBlock
          key={extra.title}
          title={extra.title}
          body={extra.body}
          ranks={extra.ranks}
        />
      ))}
      <div>
        <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">
          STATS · ★{starRank} · REIGN {reignLevel}
        </p>
        <StatGrid stats={stats} />
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <p className="text-muted-foreground">Troops</p>
          <p className="text-right tabular-nums">{troops.toLocaleString()}</p>
          <p className="text-muted-foreground">Power</p>
          <p className="text-right tabular-nums">{formatPower(power)}</p>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Stats use Dragonfire-Hub’s level table
          {level < reignLevel ? ` (capped at ${level})` : ""} plus star
          multipliers. Power is stars + reign; habit ranks and heirlooms are
          not included.
        </p>
      </div>
    </div>
  );
}

export function AbilityBlock({
  title,
  body,
  ranks,
}: {
  title: string;
  body: string;
  ranks?: string[];
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-sm">
      <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
        {title.toUpperCase()}
      </p>
      <p className="mt-1 leading-relaxed">
        <AbilityText text={body} />
      </p>
      {ranks && ranks.length > 1 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-muted-foreground">
            Ranks 2–5
          </summary>
          <ul className="mt-2 space-y-2">
            {ranks.slice(1).map((text, index) => (
              <li key={index} className="text-xs leading-relaxed">
                <span className="text-[10px] tracking-[0.16em] text-muted-foreground">
                  RANK {index + 2}
                </span>
                <span className="mt-0.5 block">
                  <AbilityText text={text} />
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
