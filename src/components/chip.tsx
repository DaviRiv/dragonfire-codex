import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-12 shrink-0 items-center justify-center rounded-full px-3.5 text-sm ring-1 ring-foreground/15 select-none",
        active
          ? "bg-amber-500/25 text-amber-50 ring-amber-300"
          : "text-muted-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ChipRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>
  );
}

export function ChoiceButton({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center justify-center rounded-xl px-2 text-center text-sm font-medium leading-tight ring-1 select-none",
        active
          ? "bg-amber-500/30 text-amber-50 ring-amber-300"
          : "bg-card/60 text-foreground ring-foreground/15 hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function MiniChip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-2.5 text-xs ring-1 select-none",
        active
          ? "bg-amber-500/25 text-amber-50 ring-amber-300"
          : "text-muted-foreground ring-foreground/15 hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}
