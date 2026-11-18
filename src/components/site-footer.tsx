"use client";

import { usePathname } from "next/navigation";
import { BuildNumber } from "@/components/build-number";
import { isWorkspaceRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

const buildClass =
  "font-mono text-[10px] tracking-wide text-amber-200/85 tabular-nums sm:text-[11px]";

export function SiteFooter() {
  const pathname = usePathname();
  const workspace = isWorkspaceRoute(pathname);

  if (workspace) {
    return (
      <footer
        aria-label="Build revision"
        className={cn(
          "z-30 flex justify-center px-2 pb-1",
          "pointer-events-none fixed inset-x-0 bottom-[calc(3.65rem+env(safe-area-inset-bottom))]",
          "lg:pointer-events-auto lg:static lg:border-t lg:border-border/60 lg:py-2",
        )}
      >
        <BuildNumber
          className={cn(
            buildClass,
            "rounded-full bg-background/95 px-2.5 py-0.5 ring-1 ring-amber-400/25 shadow-sm backdrop-blur-sm",
            "lg:rounded-none lg:bg-transparent lg:px-0 lg:py-0 lg:ring-0 lg:shadow-none",
          )}
        />
      </footer>
    );
  }

  return (
    <footer className="border-t border-border/60 px-4 py-4 text-center text-xs text-muted-foreground sm:py-6">
      <BuildNumber className={cn(buildClass, "mb-2 block uppercase sm:mb-1")} />
      Fan-made. Not affiliated with HBO, Warner Bros., or Game of Thrones:
      Dragonfire. AdSense Auto Ads and configured ad units help support hosting.
    </footer>
  );
}