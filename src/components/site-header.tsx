"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Egg, Flame, Sparkles, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Team", icon: Swords },
  { href: "/coach", label: "Copilot", icon: Sparkles },
  { href: "/pit", label: "Pit", icon: Flame },
  { href: "/hatchery", label: "Hatchery", icon: Egg },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function isSaved(pathname: string) {
  return (
    pathname === "/lineups" ||
    pathname.startsWith("/lineups/") ||
    pathname === "/teams" ||
    pathname.startsWith("/teams/")
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-3 sm:h-14 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30">
              <Flame className="size-4" />
            </span>
            <span className="font-heading text-base tracking-[0.16em] sm:text-lg sm:tracking-[0.18em]">
              DRAGONFIRE
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  isActive(pathname, link.href) && "bg-muted text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/lineups"
              className={cn(
                "rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                isSaved(pathname) && "bg-muted text-foreground",
              )}
            >
              Saved
            </Link>
          </nav>
        </div>
      </header>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-6xl grid-cols-4">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-xs text-muted-foreground",
                    active && "text-amber-100",
                  )}
                >
                  <Icon className="size-5" />
                  <span className="max-w-full truncate">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
