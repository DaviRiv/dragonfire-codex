"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import {
  Flame,
  MessagesSquare,
  Sparkles,
  Swords,
  Target,
  UserRound,
  Wrench,
} from "lucide-react";
import { BetaBadge } from "@/components/beta-badge";
import { BuildNumber } from "@/components/build-number";
import { buildNumberLabel, readPublicBuildInfo } from "@/lib/build-info";
import { useAuth } from "@/lib/auth";
import { useDevMode } from "@/lib/use-dev-mode";
import { cn } from "@/lib/utils";

const links = [
  { href: "/team", label: "Team", icon: Swords },
  { href: "/counter", label: "Counter", icon: Target },
  { href: "/coach", label: "Copilot", icon: Sparkles, beta: true, hub: true },
  { href: "/forums", label: "Forums", icon: MessagesSquare },
  { href: "/pit", label: "Pit", icon: Flame },
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
        "inline-flex max-w-36 min-h-10 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
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
  const build = readPublicBuildInfo();

  return (
    <>
      {/* Five nav links and an account control sit before the page on every
          route; a keyboard reader should not have to tab through them. */}
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-card focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:ring-1 focus-visible:ring-amber-400/50"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-amber-500/20 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:px-4">
          <Link
            href="/coach"
            aria-label={`Dragonfire Pit home — Copilot, ${buildNumberLabel(build)} ${build.sha}`}
            className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg lg:flex-none lg:max-w-[11rem]"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30">
              <Sparkles className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="font-heading block text-base leading-none tracking-[0.16em] sm:text-lg sm:tracking-[0.18em]">
                DRAGONFIRE
              </span>
              <span className="mt-0.5 block truncate text-[10px] tracking-[0.14em] text-amber-200/70 uppercase">
                <span className="hidden sm:inline">Copilot · Team · </span>
                <BuildNumber className="text-amber-200/55" />
              </span>
            </span>
          </Link>
          <nav
            aria-label="Main"
            className="hidden flex-1 items-center justify-center gap-0.5 lg:flex"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  isActive(pathname, link.href) && "bg-muted text-foreground",
                  "hub" in link &&
                    link.hub &&
                    "ring-1 ring-amber-400/25 bg-amber-500/10 text-amber-50 hover:bg-amber-500/15",
                  "hub" in link &&
                    link.hub &&
                    isActive(pathname, link.href) &&
                    "bg-amber-500/20 text-amber-50",
                )}
              >
                {link.label}
                {"beta" in link && link.beta ? <BetaBadge /> : null}
              </Link>
            ))}
          </nav>
          <div className="hidden flex-1 items-center justify-end gap-1 lg:flex">
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
          </div>
          <div className="flex flex-1 items-center justify-end gap-1 lg:hidden">
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
        <ul className="mx-auto grid max-w-6xl grid-cols-5">
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
                  <span
                    className={cn(
                      "relative flex items-center justify-center rounded-xl p-1",
                      "hub" in link &&
                        link.hub &&
                        "bg-amber-500/15 ring-1 ring-amber-400/30",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5",
                        "hub" in link && link.hub && "text-amber-100",
                      )}
                    />
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
