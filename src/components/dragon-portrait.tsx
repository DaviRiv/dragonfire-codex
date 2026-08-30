import Image from "next/image";
import { DragonMark } from "@/components/dragon-mark";
import type { Breed } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATALOG_IDS = new Set([
  "caraxes",
  "kalspire",
  "malachite",
  "syrax",
  "venator",
  "crimson",
  "seasmoke",
  "vhagar",
  "vermithor",
  "sunfyre",
  "sheepstealer",
  "moondancer",
  "tessarion",
  "rhysarion",
  "zivern",
  "daemoros",
  "feskar",
  "shadowsong",
  "tashix",
  "vaeldra",
  "velar",
  "vermax",
  "tairax",
  "starshower",
  "antares",
  "bevlorin",
  "jagadrix",
  "shadowrend",
  "shimmer",
  "solstryker",
  "thunderstrike",
  "vesper",
  "dawnseeker",
  "arulix",
  "nyrena",
  "arrax",
]);

export function dragonImageSrc(dragonId: string, custom?: boolean): string {
  if (custom || !CATALOG_IDS.has(dragonId)) return "/dragons/custom.webp";
  return `/dragons/${dragonId}.webp`;
}

export function DragonPortrait({
  dragonId,
  name,
  breed,
  custom,
  className,
  sizes = "(max-width: 640px) 50vw, 240px",
  showMark = true,
}: {
  dragonId: string;
  name: string;
  breed: Breed;
  custom?: boolean;
  className?: string;
  sizes?: string;
  showMark?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-black/40", className)}>
      <Image
        src={dragonImageSrc(dragonId, custom)}
        alt={name}
        fill
        sizes={sizes}
        className="object-cover object-center"
      />
      <span className="sr-only">{name}</span>
      {showMark ? (
        <DragonMark
          breed={breed}
          className="pointer-events-none absolute right-1.5 bottom-1.5 size-5 opacity-70 drop-shadow"
        />
      ) : null}
    </div>
  );
}
