import { troopLabels } from "@/lib/labels";
import type { TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Word-only troop chips — slate pills like Dragonfire-Hub overview cards. */
export const troopWordClass: Record<TroopType, string> = {
  cavalry:
    "border-slate-700/50 bg-slate-800/80 text-slate-300 uppercase tracking-wide",
  shieldbearers:
    "border-slate-700/50 bg-slate-800/80 text-slate-300 uppercase tracking-wide",
  archers:
    "border-slate-700/50 bg-slate-800/80 text-slate-300 uppercase tracking-wide",
  spearmen:
    "border-slate-700/50 bg-slate-800/80 text-slate-300 uppercase tracking-wide",
  siege:
    "border-slate-700/50 bg-slate-800/80 text-slate-300 uppercase tracking-wide",
};

export function TroopWordsInline({
  troops,
  className,
}: {
  troops: TroopType[];
  className?: string;
}) {
  if (troops.length === 0) return null;
  return (
    <span className={cn("text-muted-foreground", className)}>
      {troops.map((troop) => troopLabels[troop]).join(" · ")}
    </span>
  );
}