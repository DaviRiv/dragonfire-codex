import type { ReactNode } from "react";
import {
  AbilityHover,
  AbilityRankTable,
  NamedAbilities,
} from "@/components/ability-insight";
import { AbilityTag, AbilityText } from "@/components/ability-text";
import { AffinityBadges } from "@/components/affinity-badges";
import { StarRequirement } from "@/components/star-requirement";
import { Badge } from "@/components/ui/badge";
import { STAT_BAR_CLASS, STAT_TEXT_CLASS } from "@/lib/ability-text";
import {
  insightForSource,
  type AbilitySourceRef,
} from "@/lib/ability-insight";
import { habitDisplayName } from "@/data/habit-names";
import { dragonKit, habitNumberForUnlockStars, habitRankOf } from "@/lib/habits";
import { provideUnlockStars } from "@/lib/abilities";
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
import { qualifiesForStars } from "@/lib/stars";
import { SynergyBuffList } from "@/components/synergy-hover";
import { coreStatMods, type SynergyBuff } from "@/lib/synergy-buffs";
import type { Dragon, DragonStats } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RankPips } from "@/components/rank-pips";

const STAT_BAR_MAX = 400;

function habitTitle(
  dragonId: string,
  unlockStars: number | undefined,
  ownedStars: number | null,
  bought: boolean,
) {
  if (unlockStars == null) return "Habit";
  const habitNum = habitNumberForUnlockStars(unlockStars);
  const official = habitDisplayName(dragonId, habitNum);
  return (
    <>
      <span className="text-muted-foreground">
        {habitNum ? `Habit ${habitNum}` : "Habit"}
      </span>
      {official ? (
        <>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <span>{official}</span>
        </>
      ) : null}
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <StarRequirement stars={unlockStars} ownedStars={ownedStars} />
      {!bought ? (
        <span className="font-normal tracking-normal text-amber-200/80 normal-case">
          not bought
        </span>
      ) : null}
    </>
  );
}

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
  ownedHabits,
  ownedHabitRanks,
  synergyBuffs = [],
  onHabitRankChange,
}: {
  dragon: Dragon;
  highlightTroop?: Dragon["affinities"][number];
  starRank?: number;
  reignLevel?: number;
  /** Pit rank used to warn on star gates. `null` means not owned. */
  ownedStars?: number | null;
  /** Habits marked bought in Hatchery. Omit to show the full kit. */
  ownedHabits?: number[];
  /** Upgrade rank 1–5 per habit slot. Omit to show rank 1 percents. */
  ownedHabitRanks?: number[];
  synergyBuffs?: SynergyBuff[];
  onHabitRankChange?: (habit: number, rank: number) => void;
}) {
  const kit = dragonKit(dragon, ownedHabitRanks);
  const heals = healingAbilities(dragon, ownedHabitRanks);
  const stats = scaledStats(dragon, starRank, reignLevel);
  const liveMods = coreStatMods(synergyBuffs);
  const troops = troopCount(dragon.rarity, starRank, reignLevel);
  const power = dragonPower(dragon.rarity, starRank, reignLevel);
  const qualifyStars = ownedStars === undefined ? starRank : ownedStars;
  const level = hubLevel(reignLevel);
  const vanguard = kit.extras.find((extra) => extra.title === "Vanguard");
  const habitExtras = kit.extras.filter((extra) => extra.unlockStars != null);
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
              <AbilityTag
                key={tag}
                tag={tag}
                dragonId={dragon.id}
                stars={provideUnlockStars(dragon, tag)}
              />
            ))}
        </div>
      ) : null}
      {vanguard ? (
        <AbilityBlock
          title={`Vanguard · buffs ${slotLabels[dragon.flankBonus]}`}
          body={vanguard.body}
          muted={qualifyStars == null || qualifyStars <= 0}
          dragonId={dragon.id}
          source={{ kind: "vanguard" }}
        />
      ) : null}
      {heals.length > 0 ? (
        <div className="space-y-2">
          <p className="text-label">Healing</p>
          {heals.map((heal) => {
            const bought =
              ownedHabits == null ||
              heal.habit == null ||
              ownedHabits.includes(heal.habit);
            const source: AbilitySourceRef =
              heal.habit != null
                ? { kind: "habit", habit: heal.habit }
                : { kind: "command" };
            return (
            <div
              key={heal.id}
              className={cn(
                "rounded-xl bg-emerald-950/35 p-3 text-[15px] leading-relaxed ring-1 ring-emerald-500/20",
                !bought && "opacity-55",
              )}
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
                <AbilityText
                  text={heal.text}
                  dragonId={dragon.id}
                  source={source}
                />
              </p>
            </div>
            );
          })}
        </div>
      ) : null}
      <AbilityBlock
        title={
          heals.some((heal) => heal.stars === null)
            ? "Command · Heal · always on"
            : "Command"
        }
        body={kit.command}
        muted={qualifyStars == null || qualifyStars <= 0}
        dragonId={dragon.id}
        source={{ kind: "command" }}
      />
      {habitExtras.map((extra) => {
        const habitNum = habitNumberForUnlockStars(extra.unlockStars);
        const bought =
          ownedHabits == null ||
          habitNum == null ||
          ownedHabits.includes(habitNum);
        const live =
          bought && qualifiesForStars(extra.unlockStars, qualifyStars);
        const rank =
          habitNum != null ? habitRankOf(ownedHabitRanks, habitNum) : 1;
        return (
          <AbilityBlock
            key={extra.title}
            muted={!live}
            title={habitTitle(
              dragon.id,
              extra.unlockStars,
              qualifyStars,
              bought,
            )}
            body={extra.body}
            ranks={extra.ranks}
            selectedRank={rank}
            onRankChange={
              habitNum != null && onHabitRankChange
                ? (next) => onHabitRankChange(habitNum, next)
                : undefined
            }
            dragonId={dragon.id}
            source={
              habitNum != null
                ? { kind: "habit", habit: habitNum }
                : undefined
            }
          />
        );
      })}
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
          multipliers.           Stars auto-select habits in Hatchery. Uncheck one on
          the search icon if you have not bought it. Rank diamonds pick the
          habit upgrade so kit percents match what you have. Tap or click a named
          buff for its card; hover works on a computer. Habit upgrade Power is
          not in the catalog.
        </p>
      </div>
    </div>
  );
}

export function AbilityBlock({
  title,
  body,
  ranks,
  selectedRank,
  onRankChange,
  muted,
  dragonId,
  source,
}: {
  title: ReactNode;
  body: string;
  ranks?: string[];
  selectedRank?: number;
  onRankChange?: (rank: number) => void;
  muted?: boolean;
  dragonId?: string;
  source?: AbilitySourceRef;
}) {
  const insight =
    dragonId && source ? insightForSource(dragonId, source) : undefined;
  const heading =
    typeof title === "string" ? (
      <span className="text-muted-foreground">{title}</span>
    ) : (
      title
    );
  return (
    <div
      className={cn(
        "rounded-xl bg-muted/50 p-3 text-[15px] leading-relaxed",
        muted && "opacity-55",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] font-medium leading-[1.2] tracking-[0.12em] uppercase">
        {dragonId && source ? (
          <AbilityHover
            dragonId={dragonId}
            source={source}
            insight={insight}
            locked={muted}
            activeRank={selectedRank}
          >
            {heading}
          </AbilityHover>
        ) : (
          heading
        )}
      </div>
      {dragonId && source ? (
        <NamedAbilities
          dragonId={dragonId}
          source={source}
          locked={muted}
        />
      ) : null}
      <p className="mt-1 leading-relaxed">
        <AbilityText text={body} dragonId={dragonId} source={source} />
      </p>
      {onRankChange ? (
        <RankPips
          value={selectedRank ?? 1}
          onChange={onRankChange}
        />
      ) : null}
      {insight && insight.scale.length > 0 ? (
        <AbilityRankTable
          rows={insight.scale}
          className="mt-2"
          activeRank={selectedRank}
        />
      ) : null}
      {ranks && ranks.length > 1 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[13px] text-muted-foreground">
            Full rank text
          </summary>
          <ul className="mt-2 space-y-2">
            {ranks.slice(1).map((text, index) => (
              <li key={index} className="text-[13px] leading-relaxed">
                <span className="text-label">Rank {index + 2}</span>
                <span className="mt-0.5 block">
                  <AbilityText
                    text={text}
                    dragonId={dragonId}
                    source={source}
                  />
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
