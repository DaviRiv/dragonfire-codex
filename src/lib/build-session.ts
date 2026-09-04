import type { LineupKind } from "@/lib/types";

export const BUILD_KIND_KEY = "dragonfire-build-kind";
export const BUILD_LINEUP_KEY = "dragonfire-build-lineup";

export function rememberBuild(kind: LineupKind, lineupId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BUILD_KIND_KEY, kind);
  sessionStorage.setItem(BUILD_LINEUP_KEY, lineupId);
}

export function readBuildKind(): LineupKind {
  if (typeof window === "undefined") return "pit";
  return sessionStorage.getItem(BUILD_KIND_KEY) === "theory"
    ? "theory"
    : "pit";
}

export function readBuildLineupId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(BUILD_LINEUP_KEY);
}
