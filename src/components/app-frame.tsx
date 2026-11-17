"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { useAds } from "@/components/ads-config";
import type { AdSlotId } from "@/lib/ads";
import { isWideRoute, isWorkspaceRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

function hasActiveSlot(ads: ReturnType<typeof useAds>, ...slots: AdSlotId[]) {
  if (!ads.ready) return false;
  if (ads.mode === "house" || ads.mode === "gpt") return true;
  return Boolean(ads.adsenseClient && slots.some((slot) => ads.slot(slot)));
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ads = useAds();
  const wide = isWideRoute(pathname);
  const team = isWorkspaceRoute(pathname);
  const showBillboard = !team && hasActiveSlot(ads, "billboard");
  const showSidebar = !wide && hasActiveSlot(ads, "sidebar", "sidebar-lower");
  const hasAnchor = !team && hasActiveSlot(ads, "anchor");

  // Percentage heights need a document that is actually the viewport tall.
  // Without this the workspace pages grow the page instead of scrolling
  // inside themselves, and anything pinned to their bottom edge is lost.
  useEffect(() => {
    if (!team) return;
    const nodes = [document.documentElement, document.body];
    for (const node of nodes) node.classList.add("app-locked");
    return () => {
      for (const node of nodes) node.classList.remove("app-locked");
    };
  }, [team]);

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col px-3 sm:px-4",
        wide ? "max-w-[92rem]" : "max-w-7xl",
        team
          ? "h-full min-h-0 overflow-hidden py-2 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-3"
          : hasAnchor
            ? "py-3 sm:py-6 pb-[calc(9.25rem+env(safe-area-inset-bottom))] lg:pb-8"
            : "py-3 sm:py-6 pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-8",
      )}
    >
      {showBillboard ? (
        <div className="mb-3">
          <AdSlot slot="billboard" />
        </div>
      ) : null}
      <div
        className={cn(
          team && "flex min-h-0 flex-1 flex-col",
          showSidebar &&
            "xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-4",
        )}
      >
        {/* The page content is the main landmark; the ad rail beside it is not,
            which is what lets the skip link jump past the nav to real content. */}
        <main
          id="main-content"
          className={cn("min-w-0", team && "flex min-h-0 flex-1 flex-col")}
        >
          {children}
        </main>
        {showSidebar ? (
          <aside className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] mt-4 hidden space-y-4 xl:block">
            <AdSlot slot="sidebar" />
            <AdSlot slot="sidebar-lower" />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
