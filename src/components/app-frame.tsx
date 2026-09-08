"use client";

import { usePathname } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { cn } from "@/lib/utils";

function usesWideLayout(pathname: string): boolean {
  return (
    pathname === "/team" ||
    pathname.startsWith("/team/") ||
    pathname === "/lineups" ||
    pathname.startsWith("/lineups/")
  );
}

function isTeam(pathname: string): boolean {
  return pathname === "/team" || pathname.startsWith("/team/");
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = usesWideLayout(pathname);
  const team = isTeam(pathname);

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col px-3 sm:px-4",
        wide ? "max-w-[92rem]" : "max-w-7xl",
        team
          ? "h-[calc(100dvh-3rem-env(safe-area-inset-top))] min-h-0 overflow-hidden py-2 pb-[calc(4.25rem+env(safe-area-inset-bottom))] sm:h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] lg:pb-3"
          : "py-3 sm:py-6 pb-[calc(9.25rem+env(safe-area-inset-bottom))] lg:pb-8",
      )}
    >
      {team ? null : (
        <div className="mb-3">
          <AdSlot slot="billboard" />
        </div>
      )}
      <div
        className={cn(
          team && "flex min-h-0 flex-1 flex-col",
          !wide &&
            "xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-4",
        )}
      >
        <div className={cn("min-w-0", team && "flex min-h-0 flex-1 flex-col")}>
          {children}
        </div>
        {wide ? null : (
          <aside className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] mt-4 hidden space-y-4 xl:block">
            <AdSlot slot="sidebar" />
            <AdSlot slot="sidebar-lower" />
          </aside>
        )}
      </div>
    </div>
  );
}
