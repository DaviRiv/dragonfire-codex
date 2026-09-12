"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Flame,
  MessagesSquare,
  Sparkles,
  Swords,
  Target,
  UserRound,
  Wrench,
} from "lucide-react";
import { BetaBadge } from "@/components/beta-badge";
import { useAuth } from "@/lib/auth";
import { useDevMode } from "@/lib/use-dev-mode";
import { cn } from "@/lib/utils";

const links = [
  { href: "/team", label: "Team", icon: Swords },
  { href: "/counter", label: "Counter", icon: Target },
  { href: "/talk", label: "Talk", icon: MessagesSquare },
  { href: "/coach", label: "Copilot", icon: Sparkles, beta: true },
  { href: "/pit", label: "Pit", icon: Flame },
  { href: "/guide", label: "Guide", icon: BookOpen },
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

function DevLinks({ compact }: { compact?: boolean }) {
  const on = useDevMode();
  const pathname = usePathname();
  if (!on) return null;
  const active = isActive(pathname, "/dev");
  if (compact) {
    return (
      <Link
        href="/dev"
        aria-label="Dev catalog"
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
          active && "bg-muted text-amber-100",
        )}
      >
        <Wrench className="size-4" />
      </Link>
    );
  }
  return (
    <Link
      href="/dev"
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground",
      )}
    >
      Dev
    </Link>
  );
}

function AccountLink() {
  const pathname = usePathname();
  const { ready, user } = useAuth();
  const active = isActive(pathname, "/account");
  const label = !ready ? "Account" : user ? user.username : "Sign in";
  return (
    <Link
      href="/account"
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex max-w-36 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground",
      )}
    >
      <UserRound className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-amber-500/20 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-2 px-3 sm:h-14 sm:px-4">
          <Link href="/team" className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30">
              <Flame className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="font-heading block text-base leading-none tracking-[0.16em] sm:text-lg sm:tracking-[0.18em]">
                DRAGONFIRE
              </span>
              <span className="mt-0.5 hidden text-[10px] tracking-[0.18em] text-amber-200/70 uppercase sm:block">
                Pit · Team · Counter
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  isActive(pathname, link.href) && "bg-muted text-foreground",
                )}
              >
                {link.label}
                {"beta" in link && link.beta ? <BetaBadge /> : null}
              </Link>
            ))}
            <Link
              href="/lineups"
              aria-current={isSaved(pathname) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                isSaved(pathname) && "bg-muted text-foreground",
              )}
            >
              Saved
            </Link>
            <Suspense fallback={null}>
              <DevLinks />
            </Suspense>
            <AccountLink />
          </nav>
          <div className="flex items-center gap-1 lg:hidden">
            <Suspense fallback={null}>
              <DevLinks compact />
            </Suspense>
            <AccountLink />
          </div>
        </div>
      </header>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-500/20 bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-6xl grid-cols-6">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0 text-[9px] text-muted-foreground sm:text-[10px]",
                    active && "text-amber-100",
                  )}
                >
                  <span className="relative">
                    <Icon className="size-5" />
                    {"beta" in link && link.beta ? (
                      <span className="absolute -top-1 -right-5">
                        <BetaBadge className="h-3.5 px-1 text-[7px]" />
                      </span>
                    ) : null}
                  </span>
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
