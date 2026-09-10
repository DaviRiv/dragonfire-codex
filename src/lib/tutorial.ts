export const TUTORIAL_STORAGE_KEY = "dragonfire-pit.tutorial.v1";

export function hasSeenTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTutorialSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
  } catch {
    /* private mode / blocked storage — overlay still closes */
  }
}

/** First visit with an empty pit. Returning saves skip the intro. */
export function shouldOfferIntro(opts: {
  seen: boolean;
  ownedCount: number;
  lineupCount: number;
}): boolean {
  if (opts.seen) return false;
  if (opts.ownedCount > 0 || opts.lineupCount > 0) return false;
  return true;
}
