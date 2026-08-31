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
import {
  emptyPit,
  findDragon,
  newId,
  normalizePitState,
  nowIso,
  slugify,
} from "@/lib/dragons";
import {
  clampReign,
  clampStar,
  clearDragonFromSlots,
  emptySlots,
  makePick,
} from "@/lib/lineup";
import type {
  Breed,
  Dragon,
  Lineup,
  LineupKind,
  LineupPick,
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
  createLineup: (name?: string, kind?: LineupKind) => Lineup;
  ensureLineup: (name?: string, kind?: LineupKind) => Lineup;
  updateLineup: (id: string, patch: Partial<Omit<Lineup, "id">>) => void;
  setSlot: (lineupId: string, slot: SlotId, dragonId: string | null) => void;
  slotDragon: (lineupId: string, slot: SlotId, dragonId: string) => void;
  slotDragons: (
    lineupId: string,
    picks: { slot: SlotId; dragonId: string }[],
    options?: { replace?: boolean },
  ) => void;
  updateSlotPick: (
    lineupId: string,
    slot: SlotId,
    patch: Partial<Pick<LineupPick, "starRank" | "reignLevel">>,
  ) => void;
  deleteLineup: (id: string) => void;
  createTeam: (name?: string) => TeamLike;
  updateTeam: (
    id: string,
    patch: Partial<Pick<TeamLike, "name" | "description" | "lineupIds">>,
  ) => void;
  deleteTeam: (id: string) => void;
  loadSample: () => void;
  resetPit: () => void;
  importState: (next: unknown) => void;
};

type TeamLike = PitState["teams"][number];

const PitContext = createContext<PitContextValue | null>(null);

let cachedRaw: string | null = null;
let cachedState: PitState = EMPTY;

function parseRaw(raw: string | null): PitState {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    return normalizePitState(parsed) ?? EMPTY;
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

function blankLineup(name: string | undefined, kind: LineupKind): Lineup {
  return {
    id: newId("lineup"),
    name:
      name?.trim() ||
      (kind === "theory" ? "New theory" : "New lineup"),
    kind,
    mode: "pvp",
    troop: "shieldbearers",
    notes: "",
    slots: emptySlots(),
    ignoreLevel: false,
    craftStars: 10,
    updatedAt: nowIso(),
  };
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
        starRank: clampStar(starRank),
        reignLevel: clampReign(reignLevel),
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
        starRank: clampStar(input.starRank),
        reignLevel: clampReign(input.reignLevel),
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
                    ? clampStar(patch.starRank)
                    : o.starRank,
                reignLevel:
                  patch.reignLevel !== undefined
                    ? clampReign(patch.reignLevel)
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
        lineups: prev.lineups.map((lineup) => {
          if (!owned || lineup.kind !== "pit") return lineup;
          return {
            ...lineup,
            slots: clearDragonFromSlots(lineup.slots, owned.dragonId),
            updatedAt: nowIso(),
          };
        }),
      };
    });
    toast("Dragon released from the pit.");
  }, []);

  const createLineup = useCallback((name?: string, kind: LineupKind = "pit"): Lineup => {
    const lineup = blankLineup(name, kind);
    commit((prev) => ({ ...prev, lineups: [lineup, ...prev.lineups] }));
    return lineup;
  }, []);

  const ensureLineup = useCallback(
    (name?: string, kind: LineupKind = "pit"): Lineup => {
      const existing = getClientSnapshot().lineups.find((l) => l.kind === kind);
      if (existing) return existing;
      const lineup = blankLineup(name, kind);
      commit((prev) => {
        if (prev.lineups.some((l) => l.kind === kind)) return prev;
        return { ...prev, lineups: [lineup, ...prev.lineups] };
      });
      return (
        getClientSnapshot().lineups.find((l) => l.kind === kind) ?? lineup
      );
    },
    [],
  );

  const updateLineup = useCallback(
    (id: string, patch: Partial<Omit<Lineup, "id">>) => {
      commit((prev) => ({
        ...prev,
        lineups: prev.lineups.map((lineup) =>
          lineup.id === id
            ? {
                ...lineup,
                ...patch,
                craftStars:
                  patch.craftStars !== undefined
                    ? clampStar(patch.craftStars)
                    : lineup.craftStars,
                updatedAt: nowIso(),
              }
            : lineup,
        ),
      }));
    },
    [],
  );

  const setSlot = useCallback(
    (lineupId: string, slot: SlotId, dragonId: string | null) => {
      if (dragonId) {
        commit((prev) => applySlotDragon(prev, lineupId, slot, dragonId));
        return;
      }
      commit((prev) => ({
        ...prev,
        lineups: prev.lineups.map((lineup) => {
          if (lineup.id !== lineupId) return lineup;
          return {
            ...lineup,
            slots: { ...lineup.slots, [slot]: null },
            updatedAt: nowIso(),
          };
        }),
      }));
    },
    [],
  );

  const slotDragon = useCallback(
    (lineupId: string, slot: SlotId, dragonId: string) => {
      const current = getClientSnapshot();
      const lineup = current.lineups.find((l) => l.id === lineupId);
      const dragon = findDragon(dragonId, current.customDragons);
      if (lineup?.kind === "pit" && !current.owned.some((o) => o.dragonId === dragonId)) {
        toast.error(
          `${dragon?.name ?? "That dragon"} is not in your pit. Add them first, or switch to Theory.`,
        );
        return;
      }
      commit((prev) => applySlotDragon(prev, lineupId, slot, dragonId));
    },
    [],
  );

  const slotDragons = useCallback(
    (
      lineupId: string,
      picks: { slot: SlotId; dragonId: string }[],
      options?: { replace?: boolean },
    ) => {
      if (picks.length === 0 && !options?.replace) return;
      commit((prev) => {
        let next = prev;
        if (options?.replace) {
          next = {
            ...next,
            lineups: next.lineups.map((lineup) =>
              lineup.id === lineupId
                ? { ...lineup, slots: emptySlots(), updatedAt: nowIso() }
                : lineup,
            ),
          };
        }
        for (const pick of picks) {
          next = applySlotDragon(next, lineupId, pick.slot, pick.dragonId);
        }
        return next;
      });
    },
    [],
  );

  const updateSlotPick = useCallback(
    (
      lineupId: string,
      slot: SlotId,
      patch: Partial<Pick<LineupPick, "starRank" | "reignLevel">>,
    ) => {
      commit((prev) => ({
        ...prev,
        lineups: prev.lineups.map((lineup) => {
          if (lineup.id !== lineupId) return lineup;
          const current = lineup.slots[slot];
          if (!current) return lineup;
          return {
            ...lineup,
            slots: {
              ...lineup.slots,
              [slot]: makePick(
                current.dragonId,
                patch.starRank ?? current.starRank,
                patch.reignLevel ?? current.reignLevel,
              ),
            },
            updatedAt: nowIso(),
          };
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
    toast.success("Sample pit loaded — ten dragons, pit lines, and a theory line.");
  }, []);

  const resetPit = useCallback(() => {
    write(EMPTY);
    toast("Pit cleared.");
  }, []);

  const importState = useCallback((next: unknown) => {
    const normalized = normalizePitState(next);
    if (!normalized) {
      toast.error("That file is not a Dragonfire pit export.");
      return;
    }
    write(normalized);
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
      ensureLineup,
      updateLineup,
      setSlot,
      slotDragon,
      slotDragons,
      updateSlotPick,
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
      ensureLineup,
      updateLineup,
      setSlot,
      slotDragon,
      slotDragons,
      updateSlotPick,
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

function applySlotDragon(
  prev: PitState,
  lineupId: string,
  slot: SlotId,
  dragonId: string,
): PitState {
  const catalog = findDragon(dragonId, prev.customDragons);
  if (!catalog) return prev;
  const lineup = prev.lineups.find((l) => l.id === lineupId);
  if (!lineup) return prev;
  const owned = prev.owned.find((o) => o.dragonId === dragonId) ?? null;

  if (lineup.kind === "pit") {
    if (!owned) return prev;
  }

  const pick = makePick(
    dragonId,
    lineup.kind === "theory" ? lineup.craftStars : (owned?.starRank ?? 1),
    owned?.reignLevel ?? 1,
  );

  return {
    ...prev,
    lineups: prev.lineups.map((item) => {
      if (item.id !== lineupId) return item;
      let slots = clearDragonFromSlots(item.slots, dragonId);
      slots = { ...slots, [slot]: pick };
      return { ...item, slots, updatedAt: nowIso() };
    }),
  };
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

export function isPitState(value: unknown): value is PitState {
  return normalizePitState(value) !== null;
}
