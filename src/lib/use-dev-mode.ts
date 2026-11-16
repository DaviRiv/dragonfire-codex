"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { applyDevQuery, readDevMode, subscribeDevMode } from "@/lib/dev-mode";

/** `null` until this browser’s flag is read. */
export function useDevMode(): boolean | null {
  const params = useSearchParams();
  const query = params.get("dev");
  const stored = useSyncExternalStore(
    subscribeDevMode,
    readDevMode,
    () => null,
  );

  // `?dev=1` / `?dev=0` is a persistent switch, not a one-page override.
  useEffect(() => {
    applyDevQuery(query);
  }, [query]);

  if (query === "1") return true;
  if (query === "0") return false;
  return stored;
}
