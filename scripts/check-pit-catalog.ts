/**
 * Pit sort/filter helpers.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-pit-catalog.ts
 */
import { samplePit } from "@/data/sample";
import { allDragons } from "@/lib/dragons";
import {
  dragonMatchesDamage,
  sortPitDragons,
} from "@/lib/pit-catalog";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

const state = samplePit();
const ownedById = new Map(state.owned.map((row) => [row.dragonId, row] as const));
const catalog = allDragons(state.customDragons);

const fire = catalog.filter((d) => dragonMatchesDamage(d, "fire"));
assert(fire.length > 0 && fire.every((d) => d.tags.includes("Fire Damage")), "fire filter");

const sorted = sortPitDragons(catalog.slice(0, 20), ownedById, "strength", "desc");
assert(sorted.length === 20, "sort preserves count");
assert(sorted[0] && sorted[sorted.length - 1], "sort returns dragons");

console.log("check-pit-catalog: ok");