import { getCatalogDragon } from "@/data/dragons";
import { preferredSlot } from "@/lib/ai/around";
import { TROOP_TYPES } from "@/lib/labels";
import type { SlotId, TroopType } from "@/lib/types";

export type TeamBuilderSeed = {
  left?: string | null;
  vanguard?: string | null;
  right?: string | null;
  leftStars?: number;
  vanguardStars?: number;
  rightStars?: number;
  troop?: TroopType;
  legacyDragon?: string | null;
  legacyStars?: number;
};

function readId(raw: string | null): string | null {
  return getCatalogDragon(raw ?? "")?.id ?? null;
}

/** Parse `/team` or `/coach?build=1` query into initial seats. */
export function teamSeedFromSearch(
  search: Pick<URLSearchParams, "get">,
): TeamBuilderSeed | null {
  const left = readId(search.get("l"));
  const vanguard = readId(search.get("v"));
  const right = readId(search.get("r"));
  const legacy = readId(search.get("dragon"));
  if (!left && !vanguard && !right && !legacy) return null;

  const seed: TeamBuilderSeed = {};
  if (left) {
    seed.left = left;
    seed.leftStars = Number(search.get("ls") ?? 6);
  }
  if (vanguard) {
    seed.vanguard = vanguard;
    seed.vanguardStars = Number(search.get("vs") ?? 6);
  }
  if (right) {
    seed.right = right;
    seed.rightStars = Number(search.get("rs") ?? 6);
  }
  if (!left && !vanguard && !right && legacy) {
    const dragon = getCatalogDragon(legacy);
    const slot: SlotId = dragon ? preferredSlot(dragon) : "left";
    seed.legacyDragon = legacy;
    seed.legacyStars = Number(search.get("stars") ?? 6);
    if (slot === "left") seed.left = legacy;
    else if (slot === "vanguard") seed.vanguard = legacy;
    else seed.right = legacy;
  }
  const rawTroop = search.get("troop");
  if (rawTroop && TROOP_TYPES.includes(rawTroop as TroopType)) {
    seed.troop = rawTroop as TroopType;
  }
  return seed;
}

export function teamSeedToQuery(
  seed: TeamBuilderSeed,
  troop: TroopType,
): string {
  const params = new URLSearchParams();
  params.set("build", "1");
  if (seed.left) {
    params.set("l", seed.left);
    if (seed.leftStars != null) params.set("ls", String(seed.leftStars));
  }
  if (seed.vanguard) {
    params.set("v", seed.vanguard);
    if (seed.vanguardStars != null) params.set("vs", String(seed.vanguardStars));
  }
  if (seed.right) {
    params.set("r", seed.right);
    if (seed.rightStars != null) params.set("rs", String(seed.rightStars));
  }
  params.set("troop", troop);
  return params.toString();
}