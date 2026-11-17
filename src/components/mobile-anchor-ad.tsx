"use client";

import { usePathname } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { useAds } from "@/components/ads-config";
import { isWorkspaceRoute } from "@/lib/routes";

export function MobileAnchorAd() {
  const pathname = usePathname();
  const ads = useAds();
  if (isWorkspaceRoute(pathname)) return null;
  if (!ads.ready) return null;
  if (ads.mode === "adsense" && !ads.slot("anchor")) return null;
  return (
    <div className="fixed inset-x-0 z-30 lg:hidden bottom-[calc(3.5rem+env(safe-area-inset-bottom))]">
      <div className="border-t border-border/40 bg-background/90 px-2 py-1">
        <AdSlot slot="anchor" />
      </div>
    </div>
  );
}
