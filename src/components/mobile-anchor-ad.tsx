"use client";

import { usePathname } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";

export function MobileAnchorAd() {
  const pathname = usePathname();
  if (pathname === "/team" || pathname.startsWith("/team/")) return null;
  return (
    <div className="fixed inset-x-0 z-30 lg:hidden bottom-[calc(3.5rem+env(safe-area-inset-bottom))]">
      <div className="border-t border-border/40 bg-background/90 px-2 py-1">
        <AdSlot slot="anchor" />
      </div>
    </div>
  );
}
