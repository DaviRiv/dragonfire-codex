import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Disclosure({
  title,
  badge,
  children,
  className,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      className={cn(
        "group rounded-2xl bg-card/70 ring-1 ring-foreground/10",
        className,
      )}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 select-none [&::-webkit-details-marker]:hidden">
        <span className="font-heading min-w-0 flex-1 truncate tracking-wide">
          {title}
        </span>
        {badge ? (
          <span className="shrink-0 text-xs text-muted-foreground">{badge}</span>
        ) : null}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/50 p-3">{children}</div>
    </details>
  );
}
