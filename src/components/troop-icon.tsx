import { MiniChip } from "@/components/chip";
import { troopLabels } from "@/lib/labels";
import type { TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";

const PATHS: Record<TroopType, string> = {
  cavalry:
    "M4.5 16.5c1.2-2.2 2.8-3.2 5-3.2 1.1 0 1.6.6 2.6.6 1.8 0 2.6-1.5 4.4-1.5 1.7 0 3 .9 3.5 2.4M9.2 13.2c-.2-1.6.4-3.4 1.8-4.4 1.2-.8 2.8-.7 3.5.6.4.7.3 1.4-.2 2M7.2 10.2c.3-1.8-.2-3.2-1.4-4.2",
  shieldbearers:
    "M12 3.4 19 7v5.2c0 4-2.7 7-7 8.4-4.3-1.4-7-4.4-7-8.4V7l7-3.6Z",
  archers:
    "M5 12c2.8-5 6.2-7.5 7-7.5S16.2 7 19 12c-2.8 5-6.2 7.5-7 7.5S7.8 17 5 12Zm7-7.5v15M12 12h7",
  spearmen: "M5 19 18.5 5.5M16.2 5.2l2.6.3.3 2.6M7.2 16.8l-2 .2.2-2",
  siege:
    "M6 19V9.5L12 5l6 4.5V19M6 19h12M9.5 19v-4.5h5V19M12 5v5.5",
};

export function TroopIcon({
  troop,
  className,
}: {
  troop: TroopType;
  className?: string;
}) {
  const label = troopLabels[troop];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4 shrink-0", className)}
      aria-label={label}
      role="img"
      data-troop-icon={troop}
    >
      <path
        d={PATHS[troop]}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TroopIcons({
  troops,
  className,
  iconClassName,
}: {
  troops: TroopType[];
  className?: string;
  iconClassName?: string;
}) {
  if (troops.length === 0) return null;
  return (
    <span className={cn("inline-flex items-center justify-center gap-0.5", className)}>
      {troops.map((troop) => (
        <TroopIcon key={troop} troop={troop} className={iconClassName} />
      ))}
    </span>
  );
}

export function TroopChip({
  troop,
  active,
  onClick,
  className,
  hint,
}: {
  troop: TroopType;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  hint?: string;
}) {
  const label = hint ? `${troopLabels[troop]} · ${hint}` : troopLabels[troop];
  return (
    <MiniChip
      active={active}
      onClick={onClick}
      className={cn("min-w-8 px-1.5", className)}
      aria-label={label}
      title={label}
    >
      <TroopIcon troop={troop} className="size-4" />
    </MiniChip>
  );
}
