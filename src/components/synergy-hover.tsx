"use client";

import type { ReactNode } from "react";
import { AbilityText } from "@/components/ability-text";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SynergyBuff } from "@/lib/synergy-buffs";
import { cn } from "@/lib/utils";

export function synergyHoverText(buffs: SynergyBuff[]): string {
  return buffs
    .map((buff) => {
      const stats = buff.stats
        .map((row) => `${row.stat} ${row.amount}`)
        .join(" · ");
      return stats ? `${buff.summary} — ${stats}` : buff.summary;
    })
    .join("\n");
}

export function SynergyStatRows({
  stats,
  className,
}: {
  stats: SynergyBuff["stats"];
  className?: string;
}) {
  if (stats.length === 0) return null;
  return (
    <ul className={cn("space-y-0.5", className)}>
      {stats.map((row) => (
        <li
          key={`${row.stat}:${row.amount}`}
          className="flex items-baseline justify-between gap-3 text-[12px] leading-snug"
        >
          <AbilityText text={row.stat} />
          <span className="shrink-0 font-medium tabular-nums text-emerald-200">
            {row.amount}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SynergyBuffList({ buffs }: { buffs: SynergyBuff[] }) {
  if (buffs.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {buffs.map((buff) => (
        <div key={buff.id}>
          <p className="text-[11px] font-medium tracking-wide text-emerald-200 uppercase">
            {buff.ability}
          </p>
          <p className="text-[12px] leading-snug text-stone-200">
            <AbilityText text={buff.summary} />
          </p>
          <SynergyStatRows stats={buff.stats} className="mt-1" />
        </div>
      ))}
    </div>
  );
}

export function SynergyHover({
  buffs,
  children,
}: {
  buffs: SynergyBuff[];
  children: ReactNode;
}) {
  if (buffs.length === 0) return children;
  return (
    <Tooltip>
      <TooltipTrigger
        delay={180}
        closeOnClick={false}
        render={<span className="inline-flex max-w-full outline-none" />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="max-w-[18rem] flex-col items-stretch gap-0 rounded-xl bg-stone-950 px-3 py-2.5 text-left text-stone-100 ring-1 ring-emerald-400/35"
      >
        <SynergyBuffList buffs={buffs} />
      </TooltipContent>
    </Tooltip>
  );
}
