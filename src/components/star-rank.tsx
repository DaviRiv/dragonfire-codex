import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRank({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}) {
  const starSize = size === "sm" ? "size-3.5" : "size-4.5";
  return (
    <div
      className={cn(
        "flex items-center",
        onChange ? "w-full max-w-sm justify-between" : "gap-0.5",
      )}
      aria-label={`${value} stars`}
    >
      {Array.from({ length: 10 }, (_, i) => {
        const n = i + 1;
        const filled = n <= value;
        const star = (
          <Star
            className={cn(
              starSize,
              filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35",
            )}
          />
        );
        if (!onChange) {
          return (
            <span key={n} className="inline-flex">
              {star}
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-sm"
            onClick={() => onChange(n)}
            aria-label={`${n} stars`}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
