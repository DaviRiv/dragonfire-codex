"use client";

import type { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TONE_TEXT_CLASS, tokenizeAbilityText } from "@/lib/ability-text";
import {
  formatNeedGates,
  grantLabel,
  namedChips,
  resolveAbilityInsight,
  sourceLabel,
  statusMarkPolarity,
  unlockLabel,
  type AbilityGloss,
  type AbilityInsight,
  type AbilityScaleRow,
  type AbilitySourceRef,
  type StatusPolarity,
} from "@/lib/ability-insight";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Lock, Share2 } from "lucide-react";

const PERSIST_NOTE =
  "Habit upgrades, Breedmarks, and Rarity Cores persist between Reigns.";

export function StatusName({
  name,
  polarity,
  className,
}: {
  name: string;
  polarity: StatusPolarity;
  className?: string;
}) {
  const Icon =
    polarity === "debuff" ? ArrowDown : polarity === "spread" ? Share2 : ArrowUp;
  const color =
    polarity === "debuff"
      ? "text-df-debuff"
      : "text-df-buff";
  const label =
    polarity === "debuff"
      ? "Debuff"
      : polarity === "spread"
        ? "Spreading buff"
        : "Buff";
  return (
    <span
      className={cn("inline-flex items-baseline gap-0.5 font-medium", color, className)}
    >
      <Icon
        className="size-3.5 shrink-0 translate-y-px"
        strokeWidth={2.75}
        aria-hidden
      />
      <span className="sr-only">{label}: </span>
      <span>{name}</span>
    </span>
  );
}

function HoverableColoredText({
  text,
  dragonId,
}: {
  text: string;
  dragonId?: string;
}) {
  const parts = tokenizeAbilityText(text);
  return (
    <span>
      {parts.map((part, i) => {
        const polarity = statusMarkPolarity(part.value);
        const colored = polarity ? (
          <StatusName name={part.value} polarity={polarity} />
        ) : part.tone ? (
          <span className={TONE_TEXT_CLASS[part.tone]}>{part.value}</span>
        ) : (
          <span>{part.value}</span>
        );
        if (!part.tone && !polarity) return <span key={i}>{colored}</span>;
        const resolved = resolveAbilityInsight({ name: part.value, dragonId });
        if (!resolved) return <span key={i}>{colored}</span>;
        return (
          <AbilityHover key={i} name={part.value} dragonId={dragonId}>
            {colored}
          </AbilityHover>
        );
      })}
    </span>
  );
}

export function AbilityRankTable({
  rows,
  className,
}: {
  rows: AbilityScaleRow[];
  className?: string;
}) {
  if (rows.length === 0) return null;
  const ranks = rows[0]?.values.length ?? 0;
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[16rem] border-collapse text-left text-[11px]">
        <thead>
          <tr className="text-muted-foreground">
            <th className="pr-2 pb-1 font-medium">Rank</th>
            {Array.from({ length: ranks }, (_, i) => (
              <th key={i} className="px-0.5 pb-1 text-center font-medium">
                <span className="relative inline-flex size-5 items-center justify-center text-[10px] text-amber-100">
                  <span
                    aria-hidden
                    className="absolute size-3.5 rotate-45 rounded-[2px] bg-zinc-800 ring-1 ring-amber-200/50"
                  />
                  <span className="relative tabular-nums">{i + 1}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="align-top">
              <th className="py-1 pr-2 font-medium leading-tight text-stone-200">
                {row.label}
              </th>
              {row.values.map((value, i) => (
                <td
                  key={`${row.label}-${i}`}
                  className="px-0.5 py-1 text-center tabular-nums text-df-buff"
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AbilityGlossList({
  glosses,
  className,
  dragonId,
}: {
  glosses: AbilityGloss[];
  className?: string;
  dragonId?: string;
}) {
  if (glosses.length === 0) return null;
  return (
    <div className={cn("space-y-1.5", className)}>
      {glosses.map((row) => (
        <p key={row.name} className="text-[13px] leading-relaxed text-stone-100">
          <AbilityHover name={row.name} dragonId={dragonId}>
            <StatusName name={row.name} polarity={row.polarity} />
          </AbilityHover>
          {unlockLabel(row.unlockStars) ? (
            <span className="text-muted-foreground">
              {" "}
              · {unlockLabel(row.unlockStars)}
            </span>
          ) : null}{" "}
          <HoverableColoredText text={row.body} dragonId={dragonId} />
        </p>
      ))}
    </div>
  );
}

export function AbilityInsightCard({
  insight,
  locked,
}: {
  insight: AbilityInsight;
  locked?: boolean;
}) {
  const source =
    insight.kind === "buff"
      ? [
          insight.dragonName || null,
          sourceLabel(insight.kind, insight.habit, insight.polarity),
          insight.spreadTo || null,
          unlockLabel(insight.unlockStars),
        ]
          .filter(Boolean)
          .join(" · ")
      : [
          insight.dragonName,
          sourceLabel(insight.kind, insight.habit),
          insight.unlockStars != null ? `${insight.unlockStars}★` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const otherGrants = (insight.grantedBy ?? []).filter(
    (grant) => grant.dragonId !== insight.dragonId,
  );
  const showGrantedBy =
    otherGrants.length > 0 && !insight.dragonId
      ? insight.grantedBy ?? []
      : [];

  const titleClass =
    insight.kind === "buff" && insight.polarity === "debuff"
      ? "text-df-debuff"
      : insight.kind === "buff"
        ? "text-df-buff"
        : "text-amber-200";

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <p
          className={cn(
            "font-heading flex items-center gap-1.5 text-[15px] tracking-[0.14em] uppercase",
            titleClass,
          )}
        >
          {locked ? <Lock className="size-3.5 shrink-0" aria-hidden /> : null}
          {insight.kind === "buff" && insight.polarity ? (
            <StatusName
              name={insight.title}
              polarity={insight.polarity}
              className="font-heading tracking-[0.14em] uppercase"
            />
          ) : (
            insight.title
          )}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{source}</p>
      </div>
      {showGrantedBy.length > 0 ? (
        <p className="text-[12px] leading-snug text-stone-300">
          Granted by {showGrantedBy.map(grantLabel).join("; ")}.
        </p>
      ) : null}
      {insight.neededBy ? (
        <p className="text-[12px] leading-snug text-stone-300">
          {insight.neededBy.dragonName} wants this on an ally from{" "}
          {formatNeedGates(insight.neededBy.gates)}.
        </p>
      ) : null}
      <p className="text-[13px] leading-relaxed text-stone-100">
        <HoverableColoredText
          text={insight.body}
          dragonId={insight.dragonId || undefined}
        />
      </p>
      {insight.scale.length > 0 ? (
        <AbilityRankTable rows={insight.scale} />
      ) : null}
      {insight.kind === "habit" ? (
        <p className="text-[11px] leading-snug text-sky-200/90">{PERSIST_NOTE}</p>
      ) : null}
    </div>
  );
}

export function AbilityHover({
  name,
  dragonId,
  source,
  insight,
  locked,
  children,
  className,
}: {
  name?: string;
  dragonId?: string;
  source?: AbilitySourceRef;
  insight?: AbilityInsight | null;
  locked?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const resolved = resolveAbilityInsight({ name, dragonId, source, insight });
  if (!resolved) return children;
  return (
    <Popover modal={false}>
      <PopoverTrigger
        delay={160}
        closeDelay={140}
        openOnHover
        nativeButton={false}
        render={
          <span
            className={cn(
              "cursor-pointer rounded-[2px] underline decoration-dotted decoration-df-status/55 underline-offset-2 outline-none hover:decoration-amber-300 focus-visible:ring-1 focus-visible:ring-amber-300/80",
              className,
            )}
          />
        }
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label={`${name || resolved.title} details`}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={8}
        align="start"
        initialFocus={false}
        finalFocus={false}
        className="z-[80] w-[min(24rem,calc(100vw-1.25rem))] max-h-[min(70dvh,32rem)] overflow-y-auto bg-zinc-950 p-3 text-stone-100 shadow-xl ring-1 ring-amber-200/25"
        positionerClassName="z-[80]"
      >
        <AbilityInsightCard insight={resolved} locked={locked} />
      </PopoverContent>
    </Popover>
  );
}

export function NamedAbilities({
  dragonId,
  source,
  locked,
  className,
}: {
  dragonId: string;
  source: AbilitySourceRef;
  locked?: boolean;
  className?: string;
}) {
  const insight = insightForSourceSafe(dragonId, source);
  const chips = insight ? namedChips(insight) : [];
  if (!insight || chips.length === 0) return null;
  return (
    <p className={cn("mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5", className)}>
      {chips.map((item) => {
        const resolved = resolveAbilityInsight({ name: item, dragonId, source });
        const polarity =
          resolved?.kind === "buff" ? resolved.polarity : undefined;
        return (
          <AbilityHover
            key={item}
            name={item}
            dragonId={dragonId}
            source={source}
            insight={insight}
            locked={locked}
          >
            {polarity ? (
              <StatusName name={item} polarity={polarity} />
            ) : (
              <span className={TONE_TEXT_CLASS.status}>{item}</span>
            )}
          </AbilityHover>
        );
      })}
    </p>
  );
}

function insightForSourceSafe(
  dragonId: string,
  source: AbilitySourceRef,
): AbilityInsight | undefined {
  return resolveAbilityInsight({ dragonId, source });
}
