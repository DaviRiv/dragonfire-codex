"use client";

import { usePathname } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { cn } from "@/lib/utils";

function usesPickList(pathname: string): boolean {
  return (
    pathname === "/team" ||
    pathname.startsWith("/team/") ||
    pathname === "/lineups" ||
    pathname.startsWith("/lineups/")
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pickList = usesPickList(pathname);

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col px-3 py-3 sm:px-4 sm:py-6 pb-[calc(9.25rem+env(safe-area-inset-bottom))] lg:pb-8",
        pickList ? "max-w-[92rem]" : "max-w-7xl",
      )}
    >
      <div className="mb-3">
        <AdSlot slot="billboard" />
      </div>
      <div
        className={cn(
          !pickList &&
            "xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-4",
        )}
      >
        <div className="min-w-0">{children}</div>
        {pickList ? null : (
          <aside className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] mt-4 hidden space-y-4 xl:block">
            <AdSlot slot="sidebar" />
            <AdSlot slot="sidebar-lower" />
          </aside>
        )}
      </div>
    </div>
  );
}
