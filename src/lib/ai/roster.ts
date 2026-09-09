import { metaTagFor } from "@/data/meta";
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

export function formatRosterLine(
  card: RosterCard,
  opts?: { compact?: boolean },
): string {
  const jobs = card.jobs.join("/");
  const on = card.otherTeam ? ` | on:${card.otherTeam}` : "";
  const theory = card.owned ? "" : " | not-owned";
  const meta = metaTagFor(card.id);
  if (opts?.compact) {
    return `${card.id} | ${card.name} | ${jobs} | ${card.stars}★ | aff:${card.aff} | needs:${card.needs} | gives:${card.gives}${on}${theory}${meta}`;
  }
  return `${card.id} | ${card.name} | ${card.breed} | ${jobs} | ${card.stars}★ | aff:${card.aff} | flank:${card.flank} | needs:${card.needs} | gives:${card.gives} | ${card.kit}${on}${theory}${meta}`;
}
