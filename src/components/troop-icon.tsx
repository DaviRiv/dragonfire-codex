import type { ReactNode } from "react";
import { MiniChip } from "@/components/chip";
import { troopLabels } from "@/lib/labels";
import type { TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";

function ShieldMark() {
  return (
    <path
      fill="currentColor"
      d="M12 2.2 20.5 6v6.1c0 4.7-3.2 8.4-8.5 10.1C6.7 20.5 3.5 16.8 3.5 12.1V6L12 2.2Z"
    />
  );
}

function SpearMark() {
  return (
    <>
      <path
        fill="currentColor"
        d="M13.2 4.4 19.6 10.8 8.4 22 2 15.6 13.2 4.4Z"
      />
      <path fill="currentColor" d="M16.8 2 22 6.4l-2.6 3.2-5.2-5.2L16.8 2Z" />
    </>
  );
}

function BowMark() {
  return (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        d="M7 3.8c6.6 2.6 9.8 6 9.8 8.2s-3.2 5.6-9.8 8.2"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        d="M7 12h13M17.6 9.4 21 12l-3.4 2.6"
      />
    </>
  );
}

function HorseMark() {
  return (
    <path
      fill="currentColor"
      d="M8.2 20.5H18v-1.8c0-1.7-.9-2.7-2.6-3.5 1.7-.6 3.4-1.9 3.4-4.2 0-1.7-1.1-3-2.8-3.4-.3-1.6-1.6-3.1-3.5-3.1-1.7 0-2.9 1-3.4 2.4H8.4c-1.6 0-2.9 1.4-2.9 3.2 0 1.4.7 2.4 1.8 3-.9.5-2.1 1.5-2.1 3.1 0 .8.3 1.5.8 2.1-.9.4-1.8 1.3-1.8 2.6v1.6h3.2c.2 0 .4-.2.4-.4v-1.2c0-.7.4-1.2 1-.1.4.7 1.1 1.1 1.9 1.1Z"
    />
  );
}

function SiegeMark() {
  return (
    <path
      fill="currentColor"
      d="M5 20.5h14v-2.2H5v2.2Zm2.2-3.8h9.6V11L12 6.2 7.2 11v5.7ZM10.4 20.5V14h3.2v6.5M8.2 4.2h7.6v2.2h-2.2V8h-3.2V6.4H8.2V4.2Z"
    />
  );
}

const MARK: Record<TroopType, () => ReactNode> = {
  shieldbearers: ShieldMark,
  spearmen: SpearMark,
  archers: BowMark,
  cavalry: HorseMark,
  siege: SiegeMark,
};

export function TroopIcon({
  troop,
  className,
}: {
  troop: TroopType;
  className?: string;
}) {
  const label = troopLabels[troop];
  const Mark = MARK[troop];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4 shrink-0", className)}
      aria-label={label}
      role="img"
      data-troop-icon={troop}
    >
      <Mark />
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
