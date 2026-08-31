import Image from "next/image";
import { Plus } from "lucide-react";
import { dragonImageSrc } from "@/components/dragon-portrait";
import type { Breed, Rarity } from "@/lib/types";
import { cn } from "@/lib/utils";

const sizeClass = {
  xs: "size-8",
  sm: "size-9",
  md: "size-14",
  lg: "size-16",
  xl: "size-[4.75rem]",
  "2xl": "size-[5.75rem]",
  "3xl": "size-32",
} as const;

const rarityRing: Record<Rarity, string> = {
  legendary:
    "ring-[3px] ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]",
  epic: "ring-[3px] ring-violet-400",
  rare: "ring-[3px] ring-sky-400",
};

export function DragonIcon({
  dragonId,
  name,
  rarity,
  custom,
  empty,
  selected,
  size = "md",
  className,
}: {
  dragonId?: string;
  name?: string;
  breed?: Breed;
  rarity?: Rarity;
  custom?: boolean;
  empty?: boolean;
  selected?: boolean;
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/50",
        sizeClass[size],
        empty
          ? "ring-2 ring-dashed ring-foreground/25"
          : rarity
            ? rarityRing[rarity]
            : "ring-2 ring-foreground/20",
        selected && "ring-offset-2 ring-offset-background ring-amber-200",
        className,
      )}
    >
      {empty || !dragonId ? (
        <Plus className={cn("text-muted-foreground", size === "3xl" ? "size-10" : "size-5")} />
      ) : (
        <Image
          src={dragonImageSrc(dragonId, custom)}
          alt={name ?? ""}
          fill
          sizes="256px"
          className="object-cover object-[center_30%]"
        />
      )}
    </div>
  );
}
