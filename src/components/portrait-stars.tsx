import { cn } from "@/lib/utils";

/** Five gold slots (1–5). At 6★ those convert to red and refill left to right (6–10). */
export const STAR_ROW = 5;
export const STAR_MAX = 10;

const sizeClass = {
  xs: "size-2",
  sm: "size-2.5",
  md: "size-3",
  lg: "size-3.5",
  xl: "size-3.5",
  "2xl": "size-4",
  sheet: "size-6",
} as const;

const arcLift = ["translate-y-0.5", "translate-y-px", "translate-y-0", "translate-y-px", "translate-y-0.5"];
const arcTilt = ["-rotate-[16deg]", "-rotate-[8deg]", "rotate-0", "rotate-[8deg]", "rotate-[16deg]"];
const arcLiftTop = ["-translate-y-0.5", "-translate-y-px", "translate-y-0", "-translate-y-px", "-translate-y-0.5"];
const arcTiltTop = ["rotate-[16deg]", "rotate-[8deg]", "rotate-0", "-rotate-[8deg]", "-rotate-[16deg]"];

export type StarTone = "gold" | "red";
export type StarSize = keyof typeof sizeClass;

export function isAwakened(value: number): boolean {
  return value > STAR_ROW;
}

export function goldFilled(value: number): number {
  return isAwakened(value) ? 0 : Math.max(0, Math.min(STAR_ROW, value));
}

export function redFilled(value: number): number {
  return isAwakened(value) ? Math.max(0, Math.min(STAR_ROW, value - STAR_ROW)) : 0;
}

export function GameStar({
  filled,
  size = "md",
  tone = "gold",
  className,
}: {
  filled: boolean;
  size?: StarSize;
  tone?: StarTone;
  className?: string;
}) {
  const filledClass =
    tone === "red"
      ? "text-red-500 drop-shadow-[0_0_3px_rgba(239,68,68,0.9)]"
      : "text-amber-300 drop-shadow-[0_0_3px_rgba(251,191,36,0.85)]";
  const stroke = filled
    ? tone === "red"
      ? "#fca5a5"
      : "#f5d76e"
    : "#3f3f46";

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        sizeClass[size],
        filled ? filledClass : "text-neutral-700",
        className,
      )}
    >
      <path
        fill="currentColor"
        stroke={stroke}
        strokeWidth={filled ? 0.8 : 1}
        d="M12 2.4 14.7 9l7.3.6-5.6 4.6 1.7 7.1L12 17.8 5.9 21.3l1.7-7.1L2 9.6 9.3 9z"
      />
    </svg>
  );
}

function StarSlot({
  rank,
  filled,
  size,
  onChange,
  arc,
  arcTop,
  index,
  tone,
}: {
  rank: number;
  filled: boolean;
  size: StarSize;
  onChange?: (value: number) => void;
  arc?: boolean;
  arcTop?: boolean;
  index: number;
  tone: StarTone;
}) {
  const star = (
    <GameStar
      filled={filled}
      size={size}
      tone={tone}
      className={
        arc
          ? cn(arcTop ? arcLiftTop[index] : arcLift[index], arcTop ? arcTiltTop[index] : arcTilt[index])
          : undefined
      }
    />
  );
  if (!onChange) {
    return <span className="inline-flex">{star}</span>;
  }
  return (
    <button
      type="button"
      aria-label={`${rank} stars`}
      className={cn(
        "inline-flex items-center justify-center rounded-sm",
        size === "sheet" ? "min-h-11 min-w-11" : "p-0.5",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onChange(rank);
      }}
    >
      {star}
    </button>
  );
}

export function StarBand({
  value,
  onChange,
  size = "md",
  tone,
  layout = "row",
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: StarSize;
  tone: StarTone;
  layout?: "row" | "arc";
  className?: string;
}) {
  const offset = tone === "red" ? STAR_ROW : 0;
  const filledCount = tone === "red" ? redFilled(value) : goldFilled(value);
  const arcTop = tone === "red" && layout === "arc";

  return (
    <div
      className={cn(
        "flex items-end justify-center",
        layout === "arc" ? "-space-x-px" : "gap-px",
        className,
      )}
    >
      {Array.from({ length: STAR_ROW }, (_, i) => {
        const rank = offset + i + 1;
        return (
          <StarSlot
            key={rank}
            rank={rank}
            filled={i < filledCount}
            size={size}
            onChange={onChange}
            arc={layout === "arc"}
            arcTop={arcTop}
            index={i}
            tone={tone}
          />
        );
      })}
    </div>
  );
}

/** Gold under 1–5. At 6★ gold converts to red and refills above, left to right. */
export function PortraitStars({
  value,
  onChange,
  size = "md",
  layout = "row",
  alwaysTwoRows = false,
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: StarSize;
  layout?: "row" | "arc";
  alwaysTwoRows?: boolean;
  className?: string;
}) {
  const awakened = isAwakened(value);
  const showRed = alwaysTwoRows || awakened || Boolean(onChange && value >= STAR_ROW);
  const showGold = alwaysTwoRows || !awakened;

  return (
    <div
      className={cn("flex flex-col items-center gap-0.5", className)}
      aria-label={`${value} stars`}
    >
      {showRed ? (
        <StarBand
          tone="red"
          value={value}
          onChange={onChange}
          size={size}
          layout={layout}
        />
      ) : null}
      {showGold ? (
        <StarBand
          tone="gold"
          value={value}
          onChange={onChange}
          size={size}
          layout={layout}
        />
      ) : null}
    </div>
  );
}
