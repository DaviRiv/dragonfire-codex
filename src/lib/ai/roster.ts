import { allDragons, findDragon } from "@/lib/dragons";
import { placedInLineup } from "@/lib/lineup";
import { dragonRoles, roleShort } from "@/lib/roles";
import type {
  Dragon,
  GatedAbility,
  Lineup,
  LineupMode,
  PitState,
  TroopType,
} from "@/lib/types";

export type AiPool = "pit" | "hatchery";

export type RosterCard = {
  id: string;
  name: string;
  breed: string;
  jobs: string[];
  stars: number;
  reign: number;
  aff: string;
  flank: string;
  needs: string;
  gives: string;
  kit: string;
  owned: boolean;
  /** Other pit formation this dragon already sits on. */
  otherTeam?: string;
};

export type SuggestRequest = {
  pool: AiPool;
  skipUsed: boolean;
  troop: TroopType;
  mode: LineupMode;
  note?: string;
  lineupName: string;
  current: {
    left: string | null;
    vanguard: string | null;
    right: string | null;
  };
  roster: RosterCard[];
};

function gateList(gates?: GatedAbility[]): string {
  if (!gates?.length) return "none";
  return gates
    .map((gate) =>
      gate.unlockStars == null
        ? gate.ability
        : `${gate.ability}@${gate.unlockStars}★`,
    )
    .join("+");
}

function kitSummary(dragon: Dragon): string {
  const command = (dragon.commandShort || dragon.command).replace(/\s+/g, " ");
  const habit = (dragon.habitShort || "").replace(/\s+/g, " ");
  return [command, habit].filter(Boolean).join(" / ").slice(0, 180);
}

function otherPitTeamNames(
  state: PitState,
  exceptLineupId: string,
  dragonId: string,
): string | undefined {
  const names: string[] = [];
  for (const lineup of state.lineups) {
    if (lineup.id === exceptLineupId || lineup.kind !== "pit") continue;
    const seated = placedInLineup(lineup, state).some(
      (row) => row.dragon.id === dragonId,
    );
    if (seated) names.push(lineup.name);
  }
  return names.length ? names.join(",") : undefined;
}

export function dragonToCard(
  dragon: Dragon,
  stars: number,
  reign: number,
  extra?: { owned?: boolean; otherTeam?: string },
): RosterCard {
  return {
    id: dragon.id,
    name: dragon.name,
    breed: dragon.breed,
    jobs: dragonRoles(dragon).map((role) => roleShort[role]),
    stars,
    reign,
    aff: dragon.affinities.join("+") || "none",
    flank: dragon.flankBonus,
    needs: gateList(dragon.needs),
    gives: gateList(dragon.provides),
    kit: kitSummary(dragon),
    owned: extra?.owned ?? true,
    otherTeam: extra?.otherTeam,
  };
}

/** Pit = every owned dragon. Hatchery = full catalog. Never drop names for skip-used. */
export function collectRoster(
  state: PitState,
  lineup: Lineup,
  pool: AiPool,
): RosterCard[] {
  if (pool === "pit") {
    const cards: RosterCard[] = [];
    for (const owned of state.owned) {
      const dragon = findDragon(owned.dragonId, state.customDragons);
      if (!dragon) continue;
      cards.push(
        dragonToCard(dragon, owned.starRank, owned.reignLevel, {
          owned: true,
          otherTeam: otherPitTeamNames(state, lineup.id, dragon.id),
        }),
      );
    }
    return cards.sort(
      (a, b) => b.stars - a.stars || a.name.localeCompare(b.name),
    );
  }

  const ownedById = new Map(
    state.owned.map((owned) => [owned.dragonId, owned] as const),
  );
  const cards: RosterCard[] = [];
  for (const dragon of allDragons(state.customDragons)) {
    const owned = ownedById.get(dragon.id);
    cards.push(
      dragonToCard(
        dragon,
        owned?.starRank ?? lineup.craftStars,
        owned?.reignLevel ?? 0,
        { owned: Boolean(owned) },
      ),
    );
  }
  return cards.sort((a, b) => {
    if (a.owned !== b.owned) return a.owned ? -1 : 1;
    if (a.stars !== b.stars) return b.stars - a.stars;
    return a.name.localeCompare(b.name);
  });
}

export function formatRosterLine(card: RosterCard): string {
  const jobs = card.jobs.join("/");
  const on = card.otherTeam ? ` | on:${card.otherTeam}` : "";
  const theory = card.owned ? "" : " | not-owned";
  return `${card.id} | ${card.name} | ${card.breed} | ${jobs} | ${card.stars}★/R${card.reign} | aff:${card.aff} | flank:${card.flank} | needs:${card.needs} | gives:${card.gives} | ${card.kit}${on}${theory}`;
}

function asString(value: unknown, fallback = "", max = 200): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

export function parseRosterCards(raw: unknown): RosterCard[] {
  if (!Array.isArray(raw)) return [];
  const cards: RosterCard[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = asString(row.id, "", 48).trim().toLowerCase();
    if (!id) continue;
    const jobs = Array.isArray(row.jobs)
      ? row.jobs
          .filter((job): job is string => typeof job === "string")
          .slice(0, 6)
      : [];
    const otherTeam =
      typeof row.otherTeam === "string" && row.otherTeam.trim()
        ? row.otherTeam.trim().slice(0, 80)
        : undefined;
    cards.push({
      id,
      name: asString(row.name, id, 48),
      breed: asString(row.breed, "champion", 24),
      jobs,
      stars:
        typeof row.stars === "number"
          ? Math.min(10, Math.max(1, Math.round(row.stars)))
          : 1,
      reign:
        typeof row.reign === "number"
          ? Math.min(80, Math.max(0, Math.round(row.reign)))
          : 0,
      aff: asString(row.aff, "none", 80),
      flank: asString(row.flank, "left", 16),
      needs: asString(row.needs, "none", 160),
      gives: asString(row.gives, "none", 160),
      kit: asString(row.kit, "", 200),
      owned: row.owned !== false,
      otherTeam,
    });
  }
  return cards;
}
