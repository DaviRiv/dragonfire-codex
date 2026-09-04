import Image from "next/image";
import { Plus } from "lucide-react";
import { dragonImageSrc } from "@/components/dragon-portrait";
import { showRedStars, StarBand } from "@/components/portrait-stars";
import type { Breed, Rarity } from "@/lib/types";
import { cn } from "@/lib/utils";

const sizeClass = {
  xs: "size-8",
  sm: "size-9",
  md: "size-14",
  lg: "size-16",
  xl: "size-[4.75rem]",
  "2xl": "size-[5.75rem]",
  "3xl": "size-24 sm:size-32",
} as const;

const starSize = {
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "md",
  xl: "lg",
  "2xl": "xl",
  "3xl": "xl",
} as const;

const rarityRing: Record<Rarity, string> = {
  legendary:
    "ring-[3px] ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]",
  epic: "ring-[3px] ring-violet-400",
  rare: "ring-[3px] ring-sky-400",
};

type IconSize = keyof typeof sizeClass;

export function DragonIcon({
  dragonId,
  name,
  rarity,
  custom,
  empty,
  selected,
  size = "md",
  className,
  stars,
  onStarsChange,
  starsLayout = "arc",
  dimmed,
  onClick,
}: {
  dragonId?: string;
  name?: string;
  breed?: Breed;
  rarity?: Rarity;
  custom?: boolean;
  empty?: boolean;
  selected?: boolean;
  size?: IconSize;
  className?: string;
  /** Filled rank 0–10. Omit to hide the in-game star badge. */
  stars?: number;
  onStarsChange?: (value: number) => void;
  starsLayout?: "arc" | "row";
  dimmed?: boolean;
  onClick?: () => void;
}) {
  const rank = stars ?? 0;
  const showStars = stars != null && !empty;
  const red = showStars && showRedStars(rank, { interactive: Boolean(onStarsChange) });
  const faceClass = cn(
    "relative block size-full overflow-hidden rounded-full bg-black/50",
    empty
      ? "ring-2 ring-dashed ring-foreground/25"
      : rarity
        ? rarityRing[rarity]
        : "ring-2 ring-foreground/20",
    selected && "ring-offset-2 ring-offset-background ring-amber-200",
  );

  const face = (
    <>
      {empty || !dragonId ? (
        <Plus
          className={cn(
            "absolute inset-0 m-auto text-muted-foreground",
            size === "3xl" ? "size-10" : "size-5",
          )}
        />
      ) : (
        <Image
          src={dragonImageSrc(dragonId, custom)}
          alt={name ?? ""}
          fill
          sizes="256px"
          className={cn(
            "object-cover object-[center_30%]",
            dimmed && "grayscale contrast-75 opacity-70",
          )}
        />
      )}
    </>
  );

  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center",
        showStars && starsLayout === "row" && "gap-0.5",
        showStars && starsLayout === "arc" && "pb-1.5",
        red && starsLayout === "arc" && "pt-1.5",
        className,
      )}
    >
      {showStars && starsLayout === "row" && red ? (
        <StarBand
          tone="red"
          value={rank}
          onChange={onStarsChange}
          size={starSize[size]}
          layout="row"
        />
      ) : null}
      <div className={cn("relative", sizeClass[size])}>
        {onClick ? (
          <button type="button" onClick={onClick} className={cn(faceClass, "border-0 p-0 select-none")}>
            {face}
          </button>
        ) : (
          <div className={faceClass}>{face}</div>
        )}
        {showStars && starsLayout === "arc" && red ? (
          <StarBand
            tone="red"
            value={rank}
            onChange={onStarsChange}
            size={starSize[size]}
            layout="arc"
            className="pointer-events-none absolute inset-x-[-12%] top-[-3px] z-10 [&_button]:pointer-events-auto"
          />
        ) : null}
        {showStars && starsLayout === "arc" ? (
          <StarBand
            tone="gold"
            value={rank}
            onChange={onStarsChange}
            size={starSize[size]}
            layout="arc"
            className="pointer-events-none absolute inset-x-[-12%] bottom-[-3px] z-10 [&_button]:pointer-events-auto"
          />
        ) : null}
      </div>
      {showStars && starsLayout === "row" ? (
        <StarBand
          tone="gold"
          value={rank}
          onChange={onStarsChange}
          size={starSize[size]}
          layout="row"
        />
      ) : null}
    </div>
  );
}
