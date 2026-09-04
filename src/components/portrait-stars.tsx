import { cn } from "@/lib/utils";

/** In-game portraits show five slots. Hub ranks go to 10, so a second row appears after 5★. */
export const STAR_ROW = 5;
export const STAR_MAX = 10;

const sizeClass = {
  xs: "size-1.5",
  sm: "size-2",
  md: "size-2.5",
  lg: "size-[11px]",
  xl: "size-3",
  "2xl": "size-3.5",
  sheet: "size-6",
} as const;

const arcLift = ["translate-y-0.5", "translate-y-px", "translate-y-0", "translate-y-px", "translate-y-0.5"];
const arcTilt = ["-rotate-[16deg]", "-rotate-[8deg]", "rotate-0", "rotate-[8deg]", "rotate-[16deg]"];

export function GameStar({
  filled,
  size = "md",
  className,
}: {
  filled: boolean;
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        sizeClass[size],
        filled
          ? "text-amber-300 drop-shadow-[0_0_3px_rgba(251,191,36,0.85)]"
          : "text-neutral-700",
        className,
      )}
    >
      <path
        fill="currentColor"
        stroke={filled ? "#f5d76e" : "#3f3f46"}
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
  index,
}: {
  rank: number;
  filled: boolean;
  size: keyof typeof sizeClass;
  onChange?: (value: number) => void;
  arc?: boolean;
  index: number;
}) {
  const star = (
    <GameStar
      filled={filled}
      size={size}
      className={arc ? cn(arcLift[index], arcTilt[index]) : undefined}
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

function StarRow({
  offset,
  value,
  size,
  onChange,
  arc,
}: {
  offset: number;
  value: number;
  size: keyof typeof sizeClass;
  onChange?: (value: number) => void;
  arc?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-end justify-center",
        arc ? "-space-x-px" : "gap-px",
      )}
    >
      {Array.from({ length: STAR_ROW }, (_, i) => {
        const rank = offset + i + 1;
        return (
          <StarSlot
            key={rank}
            rank={rank}
            filled={rank <= value}
            size={size}
            onChange={onChange}
            arc={arc}
            index={i}
          />
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
  alwaysTwoRows = false,
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: keyof typeof sizeClass;
  layout?: "row" | "arc";
  alwaysTwoRows?: boolean;
  className?: string;
}) {
  const showSecond =
    alwaysTwoRows || value > STAR_ROW || Boolean(onChange && value >= STAR_ROW);

  return (
    <div
      className={cn("flex flex-col items-center", className)}
      aria-label={`${value} stars`}
    >
      <StarRow
        offset={0}
        value={value}
        size={size}
        onChange={onChange}
        arc={layout === "arc"}
      />
      {showSecond ? (
        <StarRow
          offset={STAR_ROW}
          value={value}
          size={size}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}
