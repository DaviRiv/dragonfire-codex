"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (
    pathname === "/team" ||
    pathname.startsWith("/team/") ||
    pathname === "/counter" ||
    pathname.startsWith("/counter/")
  ) {
    return null;
  }
  return (
    <footer className="hidden border-t border-border/60 px-4 py-6 text-center text-xs text-muted-foreground md:block">
      Fan-made. Not affiliated with HBO, Warner Bros., or Game of Thrones:
      Dragonfire. Ad slots follow a Wowhead-style layout (leaderboard, sidebar
      rectangles, mobile banner) via Google Publisher Tag or AdSense when
      configured; otherwise they show house ads for this tool.
    </footer>
  );
}
