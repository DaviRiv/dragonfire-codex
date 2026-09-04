import { PortraitStars } from "@/components/portrait-stars";
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
  return (
    <PortraitStars
      value={value}
      onChange={onChange}
      size={size === "sm" ? "lg" : "sheet"}
      layout="row"
      className={cn(onChange ? "w-full" : undefined)}
    />
  );
}
