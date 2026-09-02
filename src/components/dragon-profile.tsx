import type { ReactNode } from "react";
import { AbilityTag, AbilityText } from "@/components/ability-text";
import { AffinityBadges } from "@/components/affinity-badges";
import { StarRequirement } from "@/components/star-requirement";
import { Badge } from "@/components/ui/badge";
import { STAT_BAR_CLASS, STAT_TEXT_CLASS } from "@/lib/ability-text";
import { dragonKit } from "@/lib/habits";
import { healingAbilities } from "@/lib/healing";
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
import { SynergyBuffList } from "@/components/synergy-hover";
import { coreStatMods, type SynergyBuff } from "@/lib/synergy-buffs";
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
  mods,
}: {
  stats: DragonStats;
  compact?: boolean;
  className?: string;
  mods?: Partial<Record<(typeof STAT_KEYS)[number], string>>;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-2", className)}>
      {STAT_KEYS.map((key) => (
        <div key={key}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className={cn("tracking-wide", STAT_TEXT_CLASS[key])}>
              {compact ? statShort[key] : statLabels[key]}
            </span>
            <span className="font-medium tabular-nums">
              {stats[key]}
              {mods?.[key] ? (
                <span className="ml-1 font-normal text-emerald-300">
                  {mods[key]}
                </span>
              ) : null}
            </span>
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
  ownedStars,
  synergyBuffs = [],
}: {
  dragon: Dragon;
  highlightTroop?: Dragon["affinities"][number];
  starRank?: number;
  reignLevel?: number;
  /** Pit rank used to warn on star gates. `null` means not owned. */
  ownedStars?: number | null;
  synergyBuffs?: SynergyBuff[];
}) {
  const kit = dragonKit(dragon);
  const heals = healingAbilities(dragon);
  const stats = scaledStats(dragon, starRank, reignLevel);
  const liveMods = coreStatMods(synergyBuffs);
  const troops = troopCount(dragon.rarity, starRank, reignLevel);
  const power = dragonPower(dragon.rarity, starRank, reignLevel);
  const qualifyStars = ownedStars === undefined ? starRank : ownedStars;
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
      {heals.length > 0 ? (
        <div className="space-y-2">
          <p className="text-label">Healing</p>
          {heals.map((heal) => (
            <div
              key={heal.id}
              className="rounded-xl bg-emerald-950/35 p-3 text-[15px] leading-relaxed ring-1 ring-emerald-500/20"
            >
              <div className="flex flex-wrap items-center gap-x-1.5">
                {heal.stars == null ? (
                  <p className="text-label text-emerald-100">
                    Command · Heal · always on
                  </p>
                ) : (
                  <>
                    {heal.habit ? (
                      <span className="text-label text-emerald-100">
                        Habit {heal.habit}
                      </span>
                    ) : null}
                    <StarRequirement
                      stars={heal.stars}
                      ownedStars={qualifyStars}
                    />
                    <span className="text-label text-emerald-100">· Heal</span>
                  </>
                )}
              </div>
              <p className="mt-1 leading-relaxed">
                <AbilityText text={heal.text} />
              </p>
            </div>
          ))}
        </div>
      ) : null}
      <AbilityBlock
        title={
          heals.some((heal) => heal.stars === null)
            ? "Command · Heal · always on"
            : "Command"
        }
        body={kit.command}
      />
      {kit.extras.map((extra) => (
        <AbilityBlock
          key={extra.title}
          title={
            extra.unlockStars != null ? (
              <>
                <span className="text-muted-foreground">
                  {extra.title.replace(/ · \d+★$/, "")}
                </span>
                <span className="text-muted-foreground" aria-hidden>
                  ·
                </span>
                <StarRequirement
                  stars={extra.unlockStars}
                  ownedStars={qualifyStars}
                />
              </>
            ) : (
              extra.title
            )
          }
          body={extra.body}
          ranks={extra.ranks}
        />
      ))}
      <div>
        <p className="text-label mb-2">
          Stats · ★{starRank} · Reign {reignLevel}
        </p>
        <StatGrid stats={stats} mods={liveMods} />
        {synergyBuffs.length > 0 ? (
          <div className="mt-3 rounded-xl bg-emerald-950/40 p-3 ring-1 ring-emerald-500/25">
            <p className="text-label mb-1.5 text-emerald-200">Live synergy</p>
            <SynergyBuffList buffs={synergyBuffs} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Combat kit bonuses from this three — not added into Hub power.
            </p>
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <p className="text-muted-foreground">Troops</p>
          <p className="text-right tabular-nums">{troops.toLocaleString()}</p>
          <p className="text-muted-foreground">Hub power</p>
          <p className="text-right tabular-nums">{formatPower(power)}</p>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Hub power is stars + reign only — not the in-game Army Power number.
          Heirlooms, stronghold upgrades, and riders are left out; we are not
          going to reverse-engineer those. Stats use Dragonfire-Hub’s level
          table
          {level < reignLevel ? ` (capped at ${level})` : ""} plus star
          multipliers. Habit upgrade ranks are not in the pit yet.
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
  title: ReactNode;
  body: string;
  ranks?: string[];
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-[15px] leading-relaxed">
      <div className="flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] font-medium leading-[1.2] tracking-[0.12em] uppercase">
        {typeof title === "string" ? (
          <span className="text-muted-foreground">{title}</span>
        ) : (
          title
        )}
      </div>
      <p className="mt-1 leading-relaxed">
        <AbilityText text={body} />
      </p>
      {ranks && ranks.length > 1 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[13px] text-muted-foreground">
            Ranks 2–5
          </summary>
          <ul className="mt-2 space-y-2">
            {ranks.slice(1).map((text, index) => (
              <li key={index} className="text-[13px] leading-relaxed">
                <span className="text-label">Rank {index + 2}</span>
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
