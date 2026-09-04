import { cn } from "@/lib/utils";

/** Five slots. Yellow = 1★, red = 2★. 1★ is one yellow; 10★ is five red. */
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

export type StarTone = "gold" | "red";
export type StarFill = "empty" | StarTone;
export type StarSize = keyof typeof sizeClass;

export function starSlots(value: number): StarFill[] {
  const n = Math.max(0, Math.min(STAR_MAX, Math.round(value) || 0));
  const red = Math.max(0, n - STAR_ROW);
  const gold = n <= STAR_ROW ? n : STAR_ROW - red;
  return Array.from({ length: STAR_ROW }, (_, i) => {
    if (i < red) return "red";
    if (i < red + gold) return "gold";
    return "empty";
  });
}

/** Tap a slot (1–5) on the single row to set Hub rank 1–10. */
export function rankAfterTap(current: number, slot: number): number {
  const cur = Math.max(0, Math.min(STAR_MAX, current));
  const i = Math.min(STAR_ROW, Math.max(1, slot));
  if (cur <= STAR_ROW) {
    if (cur === STAR_ROW && i === STAR_ROW) return STAR_ROW + 1;
    return i;
  }
  const red = cur - STAR_ROW;
  if (i < red) return STAR_ROW + i;
  if (i === red) return cur === STAR_ROW + 1 ? STAR_ROW : cur - 1;
  if (i === red + 1) return Math.min(STAR_MAX, cur + 1);
  return i;
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

export function StarBand({
  value,
  onChange,
  size = "md",
  layout = "row",
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: StarSize;
  layout?: "row" | "arc";
  className?: string;
}) {
  const slots = starSlots(value);

  return (
    <div
      className={cn(
        "flex items-end justify-center",
        layout === "arc" ? "-space-x-px" : "gap-px",
        className,
      )}
      aria-label={`${value} stars`}
    >
      {slots.map((fill, i) => {
        const slot = i + 1;
        const filled = fill !== "empty";
        const star = (
          <GameStar
            filled={filled}
            size={size}
            tone={fill === "red" ? "red" : "gold"}
            className={layout === "arc" ? cn(arcLift[i], arcTilt[i]) : undefined}
          />
        );
        if (!onChange) {
          return (
            <span key={slot} className="inline-flex">
              {star}
            </span>
          );
        }
        return (
          <button
            key={slot}
            type="button"
            aria-label={`${rankAfterTap(value, slot)} stars`}
            className={cn(
              "inline-flex items-center justify-center rounded-sm",
              size === "sheet" ? "min-h-11 min-w-11" : "p-0.5",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onChange(rankAfterTap(value, slot));
            }}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

export function PortraitStars({
  value,
  onChange,
  size = "md",
  layout = "row",
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: StarSize;
  layout?: "row" | "arc";
  className?: string;
}) {
  return (
    <StarBand
      value={value}
      onChange={onChange}
      size={size}
      layout={layout}
      className={className}
    />
  );
}
