import { AbilityText } from "@/components/ability-text";
import { DragonIcon } from "@/components/dragon-icon";
import { StatLine } from "@/components/dragon-profile";
import type { DragonSuggestion } from "@/lib/suggest";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

export function SuggestTile({
  suggestion,
  selected,
  onPick,
  onInspect,
  kind,
  ignoreLevel,
}: {
  suggestion: DragonSuggestion;
  selected?: boolean;
  onPick: () => void;
  onInspect: () => void;
  kind?: "pit" | "theory";
  ignoreLevel?: boolean;
}) {
  const { dragon, owned, reasons, starRank, reignLevel } = suggestion;
  const meta =
    kind === "theory"
      ? owned
        ? `Aim ★${starRank} · own ★${owned.starRank}`
        : `Aim ★${starRank}`
      : ignoreLevel
        ? `★${starRank}`
        : `★${starRank} · R${reignLevel}`;

  return (
    <div
      className={cn(
        "flex items-stretch",
        selected && "bg-amber-500/20",
      )}
    >
      <button
        type="button"
        onClick={onPick}
        className="flex min-h-[4.75rem] min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left select-none active:bg-amber-500/15"
      >
        <DragonIcon
          dragonId={dragon.id}
          name={dragon.name}
          rarity={dragon.rarity}
          custom={dragon.custom}
          selected={selected}
          size="lg"
        />
        <span className="min-w-0 flex-1">
          <span className="font-heading block truncate text-base tracking-wide">
            {dragon.name}
          </span>
          <span className="block truncate text-xs text-amber-200/90">
            {reasons[0]}
          </span>
          <StatLine stats={dragon.stats} />
          <AbilityText
            text={dragon.habit}
            className="mt-0.5 line-clamp-2 block text-xs leading-snug text-foreground/80"
          />
        </span>
        <span className="shrink-0 self-start pt-1 text-right text-xs text-muted-foreground">
          {selected ? "Slotted" : meta}
        </span>
      </button>
      <button
        type="button"
        onClick={onInspect}
        aria-label={`Stats and abilities for ${dragon.name}`}
        className="flex w-14 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <Info className="size-5" />
      </button>
    </div>
  );
}
