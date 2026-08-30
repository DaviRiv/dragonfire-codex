import { findDragon, filledSlots, powerScore } from "@/lib/dragons";
import { breedLabels, slotLabels, troopLabels } from "@/lib/labels";
import type {
  Dragon,
  Lineup,
  OwnedDragon,
  PitState,
  SlotId,
} from "@/lib/types";

export interface SynergyNote {
  tone: "good" | "warn" | "info";
  text: string;
}

export interface PlacedDragon {
  slot: SlotId;
  owned: OwnedDragon;
  dragon: Dragon;
}

export interface SynergyReport {
  score: number;
  maxScore: number;
  label: string;
  notes: SynergyNote[];
  placed: PlacedDragon[];
  affinityHits: number;
  breeds: string[];
}

function scoreLabel(score: number, max: number): string {
  const ratio = max === 0 ? 0 : score / max;
  if (ratio >= 0.8) return "Locked in";
  if (ratio >= 0.6) return "Strong";
  if (ratio >= 0.4) return "Workable";
  if (ratio > 0) return "Needs work";
  return "Empty";
}

export function placedDragons(
  lineup: Lineup,
  state: PitState,
): PlacedDragon[] {
  const result: PlacedDragon[] = [];
  (["left", "vanguard", "right"] as SlotId[]).forEach((slot) => {
    const ownedId = lineup.slots[slot];
    if (!ownedId) return;
    const owned = state.owned.find((o) => o.id === ownedId);
    if (!owned) return;
    const dragon = findDragon(owned.dragonId, state.customDragons);
    if (!dragon) return;
    result.push({ slot, owned, dragon });
  });
  return result;
}

export function analyzeLineup(lineup: Lineup, state: PitState): SynergyReport {
  const placed = placedDragons(lineup, state);
  const notes: SynergyNote[] = [];
  let score = 0;
  const maxScore = 100;
  const filled = filledSlots(lineup);

  if (filled < 3) {
    notes.push({
      tone: "warn",
      text: `${filled}/3 slots filled. A saved formation needs a dragon in every lane.`,
    });
  } else {
    score += 15;
  }

  const affinityHits = placed.filter((p) =>
    p.dragon.affinities.includes(lineup.troop),
  ).length;
  score += affinityHits * 18;
  if (placed.length > 0 && affinityHits === placed.length) {
    notes.push({
      tone: "good",
      text: `Every dragon has positive ${troopLabels[lineup.troop]} affinity.`,
    });
  } else if (placed.length > 0) {
    const misses = placed.filter(
      (p) => !p.dragon.affinities.includes(lineup.troop),
    );
    notes.push({
      tone: "warn",
      text: `${misses.map((m) => m.dragon.name).join(", ")} ${
        misses.length === 1 ? "has" : "have"
      } no ${troopLabels[lineup.troop]} affinity. Pair troops to a dragon’s positive affinities for the stat boost.`,
    });
  }

  const breeds = [...new Set(placed.map((p) => p.dragon.breed))];
  if (breeds.length === 3) {
    score += 10;
    notes.push({
      tone: "good",
      text: "Three breeds on the field — damage, disruption, and support are all represented.",
    });
  } else if (breeds.length === 2) {
    score += 5;
  } else if (breeds.length === 1 && placed.length === 3) {
    notes.push({
      tone: "info",
      text: `All three are ${breedLabels[placed[0].dragon.breed]}s. Fine for a specialist march, but you lose kit variety.`,
    });
  }

  for (const p of placed) {
    const wants = p.dragon.flankBonus;
    if (wants === "left" && p.slot === "left") {
      notes.push({
        tone: "info",
        text: `${p.dragon.name} buffs the Left Flank. On the left they mostly self-buff — try Vanguard or Right so a teammate gets it.`,
      });
    } else if (wants === "right" && p.slot === "right") {
      notes.push({
        tone: "info",
        text: `${p.dragon.name} buffs the Right Flank. Slot them Left or Vanguard so the right dragon receives the habit.`,
      });
    } else if (wants === "left" && p.slot !== "left") {
      score += 6;
      notes.push({
        tone: "good",
        text: `${p.dragon.name} in ${slotLabels[p.slot]} feeds the Left Flank habit.`,
      });
    } else if (wants === "right" && p.slot !== "right") {
      score += 6;
      notes.push({
        tone: "good",
        text: `${p.dragon.name} in ${slotLabels[p.slot]} feeds the Right Flank habit.`,
      });
    }

    if (p.dragon.tags.includes("Taunt") && p.slot === "vanguard") {
      score += 8;
      notes.push({
        tone: "good",
        text: `${p.dragon.name}’s taunt belongs in the Vanguard so they soak the row.`,
      });
    } else if (p.dragon.tags.includes("Taunt") && p.slot !== "vanguard") {
      notes.push({
        tone: "info",
        text: `${p.dragon.name} can taunt — Vanguard is usually the safer home.`,
      });
    }
  }

  const avgPower =
    placed.length === 0
      ? 0
      : placed.reduce((sum, p) => sum + powerScore(p.owned), 0) / placed.length;
  score += Math.min(16, Math.round(avgPower / 12));

  if (placed.some((p) => p.dragon.tags.includes("Recovery"))) {
    notes.push({
      tone: "info",
      text: "Recovery is in the lineup — good for PvE tiles and longer fights.",
    });
  }

  score = Math.max(0, Math.min(maxScore, score));

  return {
    score,
    maxScore,
    label: scoreLabel(score, maxScore),
    notes,
    placed,
    affinityHits,
    breeds: breeds.map((b) => breedLabels[b]),
  };
}

export function summarizeLineup(lineup: Lineup, state: PitState): string {
  const placed = placedDragons(lineup, state);
  const names = (["left", "vanguard", "right"] as SlotId[])
    .map((slot) => {
      const p = placed.find((x) => x.slot === slot);
      const letter = slot === "left" ? "L" : slot === "right" ? "R" : "V";
      if (!p) return `${letter}: empty`;
      return `${letter}: ${p.dragon.name} ★${p.owned.starRank} Lv${p.owned.reignLevel}`;
    })
    .join(" · ");
  return `${lineup.name} (${troopLabels[lineup.troop]}) — ${names}`;
}
