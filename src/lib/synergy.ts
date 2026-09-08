import { lineGaps, lineProfile } from "@/lib/comp";
import { liveOwnedHabits } from "@/lib/habits";
import { investmentScore, placedInLineup } from "@/lib/lineup";
import { breedLabels, slotLabels, troopLabels } from "@/lib/labels";
import { missingCompRoles, hasCompRole } from "@/lib/roles";
import type { Lineup, PitState, SlotId } from "@/lib/types";
import type { ResolvedSlot } from "@/lib/lineup";

export interface SynergyNote {
  tone: "good" | "warn" | "info";
  text: string;
}

export type PlacedDragon = ResolvedSlot;

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
  return placedInLineup(lineup, state);
}

export function analyzeLineup(lineup: Lineup, state: PitState): SynergyReport {
  const placed = placedDragons(lineup, state);
  const notes: SynergyNote[] = [];
  let score = 0;
  const maxScore = 100;
  const filled = placed.length;

  if (lineup.kind === "theory") {
    notes.push({
      tone: "info",
      text: `Theory line at ★${lineup.craftStars} target. Nothing here is added to your pit.`,
    });
  }

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
      tone: "warn",
      text: `All three are ${breedLabels[placed[0].dragon.breed]}s. Fine for a specialist march, but you lose kit variety.`,
    });
  }

  for (const p of placed) {
    const wants = p.dragon.flankBonus;
    if (wants === "left" && p.slot === "left") {
      notes.push({
        tone: "warn",
        text: `${p.dragon.name} buffs the Left Flank. On the left they mostly self-buff — try Vanguard or Right so a teammate gets it.`,
      });
    } else if (wants === "right" && p.slot === "right") {
      notes.push({
        tone: "warn",
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

    if (hasCompRole(p.dragon, "tanking") && p.slot === "vanguard") {
      score += 8;
      notes.push({
        tone: "good",
        text: `${p.dragon.name}’s taunt belongs in the Vanguard so they soak the row.`,
      });
    } else if (hasCompRole(p.dragon, "tanking") && p.slot !== "vanguard") {
      notes.push({
        tone: "warn",
        text: `${p.dragon.name} can taunt — Vanguard is usually the safer home.`,
      });
    }
  }

  if (filled >= 2) {
    const profile = lineProfile(
      placed.map((row) => ({
        dragon: row.dragon,
        atStars: row.starRank,
        habits: liveOwnedHabits(row.owned, lineup.kind),
      })),
    );
    for (const gap of lineGaps(profile)) {
      notes.push({
        tone: "warn",
        text: `${gap.gap}.`,
      });
    }
    const missing = missingCompRoles(placed.map((p) => p.dragon));
    if (missing.includes("control")) {
      notes.push({
        tone: "warn",
        text: "No crowd control. A Stun, Panic, Slow, Stagger, or Confusion kit (Kalspire) peels the other line.",
      });
    }
  }

  const avgPower =
    placed.length === 0
      ? 0
      : placed.reduce(
          (sum, p) =>
            sum +
            investmentScore(p.starRank, p.reignLevel, lineup.ignoreLevel),
          0,
        ) / placed.length;
  score += Math.min(16, Math.round(avgPower / 12));

  if (placed.some((p) => hasCompRole(p.dragon, "healing"))) {
    notes.push({
      tone: "good",
      text: "A healer is in the lineup — Recovery on allies helps longer fights.",
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
  const kind = lineup.kind === "theory" ? "theory" : "pit";
  const names = (["left", "vanguard", "right"] as SlotId[])
    .map((slot) => {
      const p = placed.find((x) => x.slot === slot);
      const letter = slot === "left" ? "L" : slot === "right" ? "R" : "V";
      if (!p) return `${letter}: empty`;
      const lvl =
        lineup.kind === "theory" || lineup.ignoreLevel
          ? `★${p.starRank}`
          : `★${p.starRank} R${p.reignLevel}`;
      return `${letter}: ${p.dragon.name} ${lvl}`;
    })
    .join(" · ");
  return `${lineup.name} [${kind}] (${troopLabels[lineup.troop]}) — ${names}`;
}
