import { DragonPortrait } from "@/components/dragon-portrait";
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
        "overflow-hidden rounded-xl bg-card/80 text-left ring-1 ring-foreground/10 transition hover:ring-amber-400/60",
        selected && "ring-2 ring-amber-300",
      )}
    >
      <DragonPortrait
        dragonId={dragon.id}
        name={dragon.name}
        breed={dragon.breed}
        custom={dragon.custom}
        showMark={false}
        className="aspect-square w-full"
        sizes="(max-width: 640px) 45vw, 160px"
      />
      <div className="p-1.5 sm:p-2">
        <p className="font-heading truncate text-sm tracking-wide sm:text-base">
          {dragon.name}
        </p>
        <p className="truncate text-[11px] text-amber-200/90">
          {reasons[0]}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {owned ? `★${owned.starRank} · ${reasons[1] ?? "Ready"}` : "Tap to slot"}
        </p>
      </div>
    </button>
  );
}
