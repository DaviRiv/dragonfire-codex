import { cn } from "@/lib/utils";
import type { Breed } from "@/lib/types";

const colors: Record<Breed, string> = {
  champion: "text-slate-300",
  hunter: "text-orange-400",
  sentinel: "text-green-400",
  warrior: "text-red-400",
};

export function DragonMark({
  breed,
  className,
}: {
  breed: Breed;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("drop-shadow-[0_0_10px_currentColor]", colors[breed], className)}
      aria-hidden
    >
      {breed === "champion" ? (
        <path
          fill="currentColor"
          d="M32 4 40 20l18 2-13 12 4 18-17-9-17 9 4-18L6 22l18-2z"
        />
      ) : breed === "hunter" ? (
        <path
          fill="currentColor"
          d="M10 50 32 6l22 44-22-10zM32 8v28"
        />
      ) : breed === "sentinel" ? (
        <path
          fill="currentColor"
          d="M32 6c12 8 20 18 20 32 0 8-20 20-20 20S12 46 12 38C12 24 20 14 32 6z"
        />
      ) : (
        <path
          fill="currentColor"
          d="M8 40c8-18 14-28 24-34 10 6 16 16 24 34-8-4-16-6-24-6s-16 2-24 6zm8 8 16-8 16 8-16 8z"
        />
      )}
    </svg>
  );
}
