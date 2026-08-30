import { DragonIcon } from "@/components/dragon-icon";
import type { DragonSuggestion } from "@/lib/suggest";
import { cn } from "@/lib/utils";

export function SuggestTile({
  suggestion,
  selected,
  onPick,
}: {
  suggestion: DragonSuggestion;
  selected?: boolean;
  onPick: () => void;
}) {
  const { dragon, owned, reasons } = suggestion;
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left select-none active:bg-amber-500/15",
        selected && "bg-amber-500/20",
      )}
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
        <span className="block truncate text-sm text-amber-200/90">
          {reasons[0]}
        </span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {selected ? "Slotted" : owned ? `★${owned.starRank}` : "Tap"}
      </span>
    </button>
  );
}
