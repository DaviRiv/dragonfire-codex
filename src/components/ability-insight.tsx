"use client";

import type { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TONE_TEXT_CLASS, tokenizeAbilityText } from "@/lib/ability-text";
import {
  namedChips,
  resolveAbilityInsight,
  sourceLabel,
  type AbilityInsight,
  type AbilityScaleRow,
  type AbilitySourceRef,
} from "@/lib/ability-insight";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

const PERSIST_NOTE =
  "Habit upgrades, Breedmarks, and Rarity Cores persist between Reigns.";

function ColoredText({ text }: { text: string }) {
  const parts = tokenizeAbilityText(text);
  return (
    <span>
      {parts.map((part, i) =>
        part.tone ? (
          <span key={i} className={TONE_TEXT_CLASS[part.tone]}>
            {part.value}
          </span>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
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

export function AbilityInsightCard({
  insight,
  locked,
}: {
  insight: AbilityInsight;
  locked?: boolean;
}) {
  const source = [
    insight.dragonName,
    sourceLabel(insight.kind, insight.habit),
    insight.unlockStars != null ? `${insight.unlockStars}★` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <p className="font-heading flex items-center gap-1.5 text-[15px] tracking-[0.14em] text-amber-200 uppercase">
          {locked ? <Lock className="size-3.5 shrink-0" aria-hidden /> : null}
          {insight.title}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{source}</p>
      </div>
      <p className="text-[13px] leading-relaxed text-stone-100">
        <ColoredText text={insight.body} />
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
              "cursor-help rounded-[2px] underline decoration-dotted decoration-df-status/55 underline-offset-2 outline-none hover:decoration-amber-300 focus-visible:ring-1 focus-visible:ring-amber-300/80",
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
      {chips.map((item) => (
        <AbilityHover
          key={item}
          name={item}
          dragonId={dragonId}
          source={source}
          insight={insight}
          locked={locked}
        >
          <span className={TONE_TEXT_CLASS.status}>{item}</span>
        </AbilityHover>
      ))}
    </p>
  );
}

function insightForSourceSafe(
  dragonId: string,
  source: AbilitySourceRef,
): AbilityInsight | undefined {
  return resolveAbilityInsight({ dragonId, source });
}
