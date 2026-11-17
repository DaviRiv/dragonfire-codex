"use client";

import { usePathname } from "next/navigation";
import { BuildNumber } from "@/components/build-number";
import { isWorkspaceRoute } from "@/lib/routes";

export function SiteFooter() {
  const pathname = usePathname();
  if (isWorkspaceRoute(pathname)) return null;
  return (
    <footer className="hidden border-t border-border/60 px-4 py-6 text-center text-xs text-muted-foreground md:block">
      <BuildNumber className="mb-1 block tracking-[0.12em] text-amber-200/55 uppercase" />
      Fan-made. Not affiliated with HBO, Warner Bros., or Game of Thrones:
      Dragonfire. AdSense Auto Ads and configured ad units help support hosting.
    </footer>
  );
}
