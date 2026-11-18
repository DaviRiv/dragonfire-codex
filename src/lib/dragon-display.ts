import type { GameTone } from "@/lib/ability-text";
import type { Dragon } from "@/lib/types";

const DAMAGE_KINDS: {
  tag: string;
  label: string;
  tone: GameTone;
}[] = [
  { tag: "Fire Damage", label: "Fire", tone: "fire" },
  { tag: "Physical Damage", label: "Physical", tone: "physical" },
  { tag: "Tactical Damage", label: "Tactical", tone: "tactical" },
  { tag: "Recovery", label: "Recovery", tone: "recovery" },
];

export function dragonDamageKinds(dragon: Pick<Dragon, "tags">) {
  const tags = new Set(dragon.tags);
  return DAMAGE_KINDS.filter((row) => tags.has(row.tag));
}

/** Named effects this dragon can apply (Hub provides). */
export function dragonProvidedBuffs(
  dragon: Pick<Dragon, "provides">,
  max = 4,
): string[] {
  const items = dragon.provides?.map((row) => row.ability) ?? [];
  const unique: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || unique.includes(trimmed)) continue;
    unique.push(trimmed);
    if (unique.length >= max) break;
  }
  return unique;
}