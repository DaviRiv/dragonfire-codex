/**
 * First-visit intro: when to offer it.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-tutorial.ts
 */
import { shouldOfferIntro, TUTORIAL_STORAGE_KEY } from "@/lib/tutorial";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

assert(
  TUTORIAL_STORAGE_KEY === "dragonfire-pit.tutorial.v1",
  "tutorial key stays separate from the pit save",
);
assert(
  TUTORIAL_STORAGE_KEY.startsWith("dragonfire-pit.tutorial."),
  "do not reuse the pit collection key",
);

assert(
  shouldOfferIntro({ seen: false, ownedCount: 0, lineupCount: 0 }),
  "empty first visit should see the intro",
);
assert(
  !shouldOfferIntro({ seen: true, ownedCount: 0, lineupCount: 0 }),
  "skip / done must not show the intro again",
);
assert(
  !shouldOfferIntro({ seen: false, ownedCount: 3, lineupCount: 0 }),
  "an existing pit skips the intro",
);
assert(
  !shouldOfferIntro({ seen: false, ownedCount: 0, lineupCount: 1 }),
  "saved lineups skip the intro",
);

console.log("check-tutorial: ok");
