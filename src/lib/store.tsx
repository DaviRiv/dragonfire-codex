"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { samplePit } from "@/data/sample";
import { emptyPit, findDragon, newId, nowIso, slugify } from "@/lib/dragons";
import type {
  Breed,
  Dragon,
  Lineup,
  OwnedDragon,
  PitState,
  Rarity,
  SlotId,
  TroopType,
} from "@/lib/types";

const STORAGE_KEY = "dragonfire-pit.v1";
const EMPTY = emptyPit();
const CHANGE_EVENT = "dragonfire-pit";

type PitContextValue = {
  ready: boolean;
  state: PitState;
  addFromCatalog: (
    dragonId: string,
    starRank?: number,
    reignLevel?: number,
  ) => OwnedDragon | null;
  addCustomDragon: (input: {
    name: string;
    epithet?: string;
    rarity: Rarity;
    breed: Breed;
    affinities: TroopType[];
    starRank: number;
    reignLevel: number;
  }) => OwnedDragon | null;
  updateOwned: (
    id: string,
    patch: Partial<Pick<OwnedDragon, "starRank" | "reignLevel" | "notes">>,
  ) => void;
  removeOwned: (id: string) => void;
  createLineup: (name?: string) => Lineup;
  updateLineup: (id: string, patch: Partial<Omit<Lineup, "id">>) => void;
  setSlot: (lineupId: string, slot: SlotId, ownedId: string | null) => void;
  deleteLineup: (id: string) => void;
  createTeam: (name?: string) => TeamLike;
  updateTeam: (
    id: string,
    patch: Partial<Pick<TeamLike, "name" | "description" | "lineupIds">>,
  ) => void;
  deleteTeam: (id: string) => void;
  loadSample: () => void;
  resetPit: () => void;
  importState: (next: PitState) => void;
};

type TeamLike = PitState["teams"][number];

const PitContext = createContext<PitContextValue | null>(null);

function isPitState(value: unknown): value is PitState {
  if (!value || typeof value !== "object") return false;
  const v = value as PitState;
  return (
    v.version === 1 &&
    Array.isArray(v.owned) &&
    Array.isArray(v.lineups) &&
    Array.isArray(v.teams) &&
    Array.isArray(v.customDragons)
  );
}

let cachedRaw: string | null = null;
let cachedState: PitState = EMPTY;

function parseRaw(raw: string | null): PitState {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPitState(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getClientSnapshot(): PitState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  cachedState = parseRaw(raw);
  return cachedState;
}

function getServerSnapshot(): PitState {
  return EMPTY;
}

function subscribe(onStoreChange: () => void) {
  const onCustom = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeReady() {
  return () => {};
}

function write(next: PitState) {
  cachedState = next;
  cachedRaw = JSON.stringify(next);
  localStorage.setItem(STORAGE_KEY, cachedRaw);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function commit(updater: (prev: PitState) => PitState) {
  write(updater(getClientSnapshot()));
}

export function PitProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const state = ready ? stored : EMPTY;

  const addFromCatalog = useCallback(
    (dragonId: string, starRank = 1, reignLevel = 1): OwnedDragon | null => {
      const current = getClientSnapshot();
      const dragon = findDragon(dragonId, current.customDragons);
      if (!dragon) return null;
      if (current.owned.some((o) => o.dragonId === dragonId)) {
        toast.error(`${dragon.name} is already in your pit.`);
        return null;
      }
      const owned: OwnedDragon = {
        id: newId("own"),
        dragonId,
        starRank: clamp(starRank, 1, 10),
        reignLevel: clamp(reignLevel, 1, 80),
        notes: "",
      };
      commit((prev) => ({ ...prev, owned: [...prev.owned, owned] }));
      toast.success(`${dragon.name} added to your pit.`);
      return owned;
    },
    [],
  );

  const addCustomDragon = useCallback(
    (input: {
      name: string;
      epithet?: string;
      rarity: Rarity;
      breed: Breed;
      affinities: TroopType[];
      starRank: number;
      reignLevel: number;
    }): OwnedDragon | null => {
      const name = input.name.trim();
      if (!name) {
        toast.error("Give the dragon a name.");
        return null;
      }
      const current = getClientSnapshot();
      const idBase = slugify(name) || "custom";
      const id = `custom-${idBase}`;
      if (
        findDragon(id, current.customDragons) ||
        current.owned.some((o) => o.dragonId === id)
      ) {
        toast.error("That name is already in your pit.");
        return null;
      }
      if (input.affinities.length === 0) {
        toast.error("Pick at least one positive affinity.");
        return null;
      }
      const dragon: Dragon = {
        id,
        name,
        epithet: input.epithet?.trim() || "Unlisted",
        rarity: input.rarity,
        breed: input.breed,
        affinities: input.affinities,
        stats: { strength: 50, instinct: 50, intelligence: 50, initiative: 50 },
        marchSpeed: "average",
        habit: "Habits not recorded yet.",
        command: "Command not recorded yet.",
        tags: [],
        flankBonus: "left",
        custom: true,
      };
      const owned: OwnedDragon = {
        id: newId("own"),
        dragonId: id,
        starRank: clamp(input.starRank, 1, 10),
        reignLevel: clamp(input.reignLevel, 1, 80),
        notes: "",
      };
      commit((prev) => ({
        ...prev,
        customDragons: [...prev.customDragons, dragon],
        owned: [...prev.owned, owned],
      }));
      toast.success(`${name} added as a custom dragon.`);
      return owned;
    },
    [],
  );

  const updateOwned = useCallback(
    (
      id: string,
      patch: Partial<Pick<OwnedDragon, "starRank" | "reignLevel" | "notes">>,
    ) => {
      commit((prev) => ({
        ...prev,
        owned: prev.owned.map((o) =>
          o.id === id
            ? {
                ...o,
                ...patch,
                starRank:
                  patch.starRank !== undefined
                    ? clamp(patch.starRank, 1, 10)
                    : o.starRank,
                reignLevel:
                  patch.reignLevel !== undefined
                    ? clamp(patch.reignLevel, 1, 80)
                    : o.reignLevel,
              }
            : o,
        ),
      }));
    },
    [],
  );

  const removeOwned = useCallback((id: string) => {
    commit((prev) => {
      const owned = prev.owned.find((o) => o.id === id);
      return {
        ...prev,
        owned: prev.owned.filter((o) => o.id !== id),
        customDragons: prev.customDragons.filter((d) => {
          if (!owned) return true;
          return d.id !== owned.dragonId;
        }),
        lineups: prev.lineups.map((lineup) => ({
          ...lineup,
          slots: {
            left: lineup.slots.left === id ? null : lineup.slots.left,
            vanguard:
              lineup.slots.vanguard === id ? null : lineup.slots.vanguard,
            right: lineup.slots.right === id ? null : lineup.slots.right,
          },
        })),
      };
    });
    toast("Dragon released from the pit.");
  }, []);

  const createLineup = useCallback((name?: string): Lineup => {
    const lineup: Lineup = {
      id: newId("lineup"),
      name: name?.trim() || "New lineup",
      mode: "pvp",
      troop: "shieldbearers",
      notes: "",
      slots: { left: null, vanguard: null, right: null },
      updatedAt: nowIso(),
    };
    commit((prev) => ({ ...prev, lineups: [lineup, ...prev.lineups] }));
    return lineup;
  }, []);

  const updateLineup = useCallback(
    (id: string, patch: Partial<Omit<Lineup, "id">>) => {
      commit((prev) => ({
        ...prev,
        lineups: prev.lineups.map((lineup) =>
          lineup.id === id ? { ...lineup, ...patch, updatedAt: nowIso() } : lineup,
        ),
      }));
    },
    [],
  );

  const setSlot = useCallback(
    (lineupId: string, slot: SlotId, ownedId: string | null) => {
      commit((prev) => ({
        ...prev,
        lineups: prev.lineups.map((lineup) => {
          if (lineup.id !== lineupId) return lineup;
          const slots = { ...lineup.slots };
          if (ownedId) {
            (Object.keys(slots) as SlotId[]).forEach((key) => {
              if (slots[key] === ownedId) slots[key] = null;
            });
          }
          slots[slot] = ownedId;
          return { ...lineup, slots, updatedAt: nowIso() };
        }),
      }));
    },
    [],
  );

  const deleteLineup = useCallback((id: string) => {
    commit((prev) => ({
      ...prev,
      lineups: prev.lineups.filter((l) => l.id !== id),
      teams: prev.teams.map((team) => ({
        ...team,
        lineupIds: team.lineupIds.filter((lid) => lid !== id),
      })),
    }));
    toast("Lineup discarded.");
  }, []);

  const createTeam = useCallback((name?: string): TeamLike => {
    const team: TeamLike = {
      id: newId("team"),
      name: name?.trim() || "New team",
      description: "",
      lineupIds: [],
      updatedAt: nowIso(),
    };
    commit((prev) => ({ ...prev, teams: [team, ...prev.teams] }));
    return team;
  }, []);

  const updateTeam = useCallback(
    (
      id: string,
      patch: Partial<Pick<TeamLike, "name" | "description" | "lineupIds">>,
    ) => {
      commit((prev) => ({
        ...prev,
        teams: prev.teams.map((team) =>
          team.id === id ? { ...team, ...patch, updatedAt: nowIso() } : team,
        ),
      }));
    },
    [],
  );

  const deleteTeam = useCallback((id: string) => {
    commit((prev) => ({
      ...prev,
      teams: prev.teams.filter((t) => t.id !== id),
    }));
    toast("Team disbanded.");
  }, []);

  const loadSample = useCallback(() => {
    write(samplePit());
    toast.success("Sample pit loaded — ten dragons, four lineups, two teams.");
  }, []);

  const resetPit = useCallback(() => {
    write(EMPTY);
    toast("Pit cleared.");
  }, []);

  const importState = useCallback((next: PitState) => {
    if (!isPitState(next)) {
      toast.error("That file is not a Dragonfire pit export.");
      return;
    }
    write(next);
    toast.success("Pit imported.");
  }, []);

  const value = useMemo<PitContextValue>(
    () => ({
      ready,
      state,
      addFromCatalog,
      addCustomDragon,
      updateOwned,
      removeOwned,
      createLineup,
      updateLineup,
      setSlot,
      deleteLineup,
      createTeam,
      updateTeam,
      deleteTeam,
      loadSample,
      resetPit,
      importState,
    }),
    [
      ready,
      state,
      addFromCatalog,
      addCustomDragon,
      updateOwned,
      removeOwned,
      createLineup,
      updateLineup,
      setSlot,
      deleteLineup,
      createTeam,
      updateTeam,
      deleteTeam,
      loadSample,
      resetPit,
      importState,
    ],
  );

  return <PitContext.Provider value={value}>{children}</PitContext.Provider>;
}

export function usePit() {
  const ctx = useContext(PitContext);
  if (!ctx) throw new Error("usePit must be used inside PitProvider");
  return ctx;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function exportPit(state: PitState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dragonfire-pit.json";
  a.click();
  URL.revokeObjectURL(url);
}

export { isPitState };
