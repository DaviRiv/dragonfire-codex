"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonPickList } from "@/components/dragon-pick-list";
import { EmptyState } from "@/components/empty-state";
import { MiniChip } from "@/components/chip";
import {
  TeamLineList,
  TeamNotesPanel,
} from "@/components/team-choice-card";
import { getCatalogDragon } from "@/data/dragons";
import { preferredSlot } from "@/lib/ai/around";
import { choicesAroundSeats } from "@/lib/around-choices";
import { rememberBuild } from "@/lib/build-session";
import { starsForCounterPick } from "@/lib/counter-pick";
import { newId, nowIso } from "@/lib/dragons";
import { TROOP_TYPES, slotShort, troopShort } from "@/lib/labels";
import { SLOT_IDS } from "@/lib/lineup";
import { usePit } from "@/lib/store";
import type { SlotId, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { toast } from "sonner";

function clampStars(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value) || 6));
}

function readId(raw: string | null): string | null {
  return getCatalogDragon(raw ?? "")?.id ?? null;
}

type SeatState = { dragonId: string | null; stars: number };

function emptySeats(): Record<SlotId, SeatState> {
  return {
    left: { dragonId: null, stars: 6 },
    vanguard: { dragonId: null, stars: 6 },
    right: { dragonId: null, stars: 6 },
  };
}

export function TeamPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { state, addLineup } = usePit();
  const listRef = useRef<HTMLDivElement>(null);

  const [seats, setSeats] = useState<Record<SlotId, SeatState>>(() => {
    const next = emptySeats();
    const left = readId(search.get("l"));
    const vanguard = readId(search.get("v"));
    const right = readId(search.get("r"));
    if (left || vanguard || right) {
      if (left) {
        next.left = {
          dragonId: left,
          stars: clampStars(Number(search.get("ls") ?? 6)),
        };
      }
      if (vanguard) {
        next.vanguard = {
          dragonId: vanguard,
          stars: clampStars(Number(search.get("vs") ?? 6)),
        };
      }
      if (right) {
        next.right = {
          dragonId: right,
          stars: clampStars(Number(search.get("rs") ?? 6)),
        };
      }
      return next;
    }
    const legacy = readId(search.get("dragon"));
    if (legacy) {
      const dragon = getCatalogDragon(legacy);
      const slot = dragon ? preferredSlot(dragon) : "left";
      next[slot] = {
        dragonId: legacy,
        stars: clampStars(Number(search.get("stars") ?? 6)),
      };
    }
    return next;
  });
  const [troop, setTroop] = useState<TroopType>(() => {
    const raw = search.get("troop");
    if (raw && TROOP_TYPES.includes(raw as TroopType)) return raw as TroopType;
    const first =
      readId(search.get("l")) ??
      readId(search.get("v")) ??
      readId(search.get("r")) ??
      readId(search.get("dragon"));
    return getCatalogDragon(first ?? "")?.affinities[0] ?? "shieldbearers";
  });
  const [openSlot, setOpenSlot] = useState<SlotId | null>(() => {
    const seated =
      readId(search.get("l")) ||
      readId(search.get("v")) ||
      readId(search.get("r")) ||
      readId(search.get("dragon"));
    return seated ? null : "left";
  });
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [seatedId, setSeatedId] = useState<string | null>(null);

  const seatedCount = SLOT_IDS.filter((slot) => seats[slot].dragonId).length;
  const picking = openSlot != null;
  const ownedIds = useMemo(
    () => new Set(state.owned.map((row) => row.dragonId)),
    [state.owned],
  );
  const ownedStars = useMemo(
    () => new Map(state.owned.map((row) => [row.dragonId, row.starRank] as const)),
    [state.owned],
  );
  const takenBy = useMemo(() => {
    const map = new Map<string, SlotId>();
    for (const slot of SLOT_IDS) {
      if (slot === openSlot) continue;
      const id = seats[slot].dragonId;
      if (id) map.set(id, slot);
    }
    return map;
  }, [seats, openSlot]);
  const pinnedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const slot of SLOT_IDS) {
      const id = seats[slot].dragonId;
      if (id) ids.add(id);
    }
    return ids;
  }, [seats]);

  const choices = useMemo(() => {
    if (seatedCount === 0) return [];
    return choicesAroundSeats({
      seats: {
        left: seats.left.dragonId
          ? { dragonId: seats.left.dragonId, stars: seats.left.stars }
          : null,
        vanguard: seats.vanguard.dragonId
          ? { dragonId: seats.vanguard.dragonId, stars: seats.vanguard.stars }
          : null,
        right: seats.right.dragonId
          ? { dragonId: seats.right.dragonId, stars: seats.right.stars }
          : null,
      },
      troop,
      state,
    });
  }, [
    seatedCount,
    seats.left.dragonId,
    seats.left.stars,
    seats.vanguard.dragonId,
    seats.vanguard.stars,
    seats.right.dragonId,
    seats.right.stars,
    troop,
    state,
  ]);

  const active = choices.find((row) => row.id === activeId) ?? choices[0] ?? null;

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyMinHeight: body.style.minHeight,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.minHeight = "100%";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.minHeight = prev.bodyMinHeight;
    };
  }, []);

  useEffect(() => {
    if (!choices.length) {
      setActiveId(null);
      return;
    }
    if (!choices.some((row) => row.id === activeId)) {
      setActiveId(choices[0].id);
    }
  }, [choices, activeId]);

  function writeQuery(next: Record<SlotId, SeatState>, nextTroop: TroopType) {
    const params = new URLSearchParams();
    if (next.left.dragonId) {
      params.set("l", next.left.dragonId);
      params.set("ls", String(next.left.stars));
    }
    if (next.vanguard.dragonId) {
      params.set("v", next.vanguard.dragonId);
      params.set("vs", String(next.vanguard.stars));
    }
    if (next.right.dragonId) {
      params.set("r", next.right.dragonId);
      params.set("rs", String(next.right.stars));
    }
    params.set("troop", nextTroop);
    const qs = params.toString();
    router.replace(qs ? `/team?${qs}` : "/team", { scroll: false });
  }

  function commitSeats(next: Record<SlotId, SeatState>, nextTroop: TroopType) {
    setSeats(next);
    setTroop(nextTroop);
    setPickedId(null);
    setSeatedId(null);
    writeQuery(next, nextTroop);
  }

  function pickDragon(slot: SlotId, dragonId: string) {
    const next = {
      ...seats,
      [slot]: {
        dragonId,
        stars: starsForCounterPick(dragonId, ownedStars, seats[slot].stars),
      },
    };
    const seated = SLOT_IDS.filter((item) => next[item].dragonId).length;
    const nextTroop =
      seated === 1
        ? (getCatalogDragon(dragonId)?.affinities[0] ?? troop)
        : troop;
    commitSeats(next, nextTroop);
    setOpenSlot(null);
    setQuery("");
  }

  function setSeatStars(slot: SlotId, stars: number) {
    commitSeats(
      {
        ...seats,
        [slot]: { ...seats[slot], stars: clampStars(stars) },
      },
      troop,
    );
  }

  function clearSeat(slot: SlotId) {
    const next = {
      ...seats,
      [slot]: { ...seats[slot], dragonId: null },
    };
    const remaining = SLOT_IDS.map((item) => next[item].dragonId).filter(
      (id): id is string => Boolean(id),
    );
    const nextTroop =
      remaining.length === 0
        ? troop
        : (getCatalogDragon(remaining[0] ?? "")?.affinities[0] ?? troop);
    commitSeats(next, remaining.length === 0 ? nextTroop : troop);
    setOpenSlot(slot);
    setQuery("");
  }

  function toggleSlot(slot: SlotId) {
    if (openSlot === slot && seatedCount >= 1) {
      setOpenSlot(null);
      setQuery("");
      return;
    }
    setOpenSlot(slot);
    setQuery("");
  }

  function closePicker() {
    if (seatedCount < 1) return;
    setOpenSlot(null);
    setQuery("");
  }

  function useActive() {
    if (!active) return;
    const next: Record<SlotId, SeatState> = {
      left: {
        dragonId: active.line.left,
        stars:
          seats.left.dragonId === active.line.left
            ? seats.left.stars
            : starsForCounterPick(
                active.line.left,
                ownedStars,
                active.line.leftStars,
              ),
      },
      vanguard: {
        dragonId: active.line.vanguard,
        stars:
          seats.vanguard.dragonId === active.line.vanguard
            ? seats.vanguard.stars
            : starsForCounterPick(
                active.line.vanguard,
                ownedStars,
                active.line.vanguardStars,
              ),
      },
      right: {
        dragonId: active.line.right,
        stars:
          seats.right.dragonId === active.line.right
            ? seats.right.stars
            : starsForCounterPick(
                active.line.right,
                ownedStars,
                active.line.rightStars,
              ),
      },
    };
    commitSeats(next, active.line.troop);
    const ids = [active.line.left, active.line.vanguard, active.line.right];
    const owned = ids.every((id) =>
      state.owned.some((row) => row.dragonId === id),
    );
    const created = {
      ...active.lineup,
      id: newId("lineup"),
      kind: owned ? ("pit" as const) : ("theory" as const),
      ignoreLevel: !owned,
      craftStars: Math.max(
        ...SLOT_IDS.map((slot) =>
          seats[slot].dragonId ? seats[slot].stars : 1,
        ),
        active.line.leftStars,
        active.line.vanguardStars,
        active.line.rightStars,
      ),
      updatedAt: nowIso(),
    };
    addLineup(created);
    rememberBuild(created.kind, created.id);
    setPickedId(active.id);
    setSeatedId(created.id);
    toast.success(`Seated ${active.line.name}.`);
  }

  function onListKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!choices.length) return;
    const index = Math.max(
      0,
      choices.findIndex((row) => row.id === (active?.id ?? "")),
    );
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = choices[Math.min(choices.length - 1, index + 1)];
      if (next) setActiveId(next.id);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = choices[Math.max(0, index - 1)];
      if (next) setActiveId(next.id);
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      useActive();
    }
  }

  const compactChip = "min-h-7 px-2 py-0 text-[11px]";
  const followUp = openSlot
    ? SLOT_IDS.filter((item) => item !== openSlot && !seats[item].dragonId)
        .map((item) => slotShort[item])
        .join(", then ")
    : "";
  const seedName = SLOT_IDS.map((slot) => {
    const id = seats[slot].dragonId;
    return id ? getCatalogDragon(id)?.name ?? id : null;
  }).filter(Boolean);
  const listLabel =
    seedName.length === 0
      ? "Teams"
      : seedName.length === 1
        ? `Around ${seedName[0]}`
        : `Around ${seedName.join(" / ")}`;

  const pickerBar = (
    <section
      data-team-seed
      data-build-around={
        seats.left.dragonId ??
        seats.vanguard.dragonId ??
        seats.right.dragonId ??
        undefined
      }
      className="shrink-0 rounded-xl bg-card/60 px-2 py-1.5 ring-1 ring-foreground/10"
    >
      <div className="grid grid-cols-3 gap-1">
        {SLOT_IDS.map((slot) => {
          const seat = seats[slot];
          const dragon = seat.dragonId ? getCatalogDragon(seat.dragonId) : null;
          const open = openSlot === slot;
          return (
            <div
              key={slot}
              data-team-seat={slot}
              className={cn(
                "min-w-0 rounded-lg px-1 py-1 ring-1",
                open ? "bg-amber-500/15 ring-amber-300" : "ring-foreground/10",
              )}
            >
              <p className="text-label">{slotShort[slot]}</p>
              <div className="mt-0.5 flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  aria-pressed={open}
                  aria-label={
                    dragon
                      ? `Change ${slotShort[slot]}, ${dragon.name}`
                      : `Pick ${slotShort[slot]}`
                  }
                  className="flex min-w-0 flex-1 items-center gap-1 rounded-md text-left hover:bg-muted/60"
                  onClick={() => toggleSlot(slot)}
                >
                  <DragonIcon
                    dragonId={dragon?.id}
                    name={dragon?.name}
                    rarity={dragon?.rarity}
                    empty={!dragon}
                    size="sm"
                    selected={open}
                  />
                  <span
                    className={cn(
                      "min-w-0 truncate text-[12px] leading-tight",
                      dragon ? "text-amber-50" : "text-muted-foreground",
                    )}
                  >
                    {dragon?.name ?? "Pick"}
                  </span>
                </button>
                {dragon ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={`One less star on ${dragon.name}`}
                      className="flex size-6 items-center justify-center rounded text-[12px] ring-1 ring-foreground/20 hover:bg-muted"
                      onClick={() => setSeatStars(slot, seat.stars - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center text-[11px] tabular-nums text-amber-200">
                      ★{seat.stars}
                    </span>
                    <button
                      type="button"
                      aria-label={`One more star on ${dragon.name}`}
                      className="flex size-6 items-center justify-center rounded text-[12px] ring-1 ring-foreground/20 hover:bg-muted"
                      onClick={() => setSeatStars(slot, seat.stars + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      aria-label={`Clear ${slotShort[slot]}`}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => clearSeat(slot)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {seatedCount > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {TROOP_TYPES.map((item) => (
            <MiniChip
              key={item}
              className={compactChip}
              active={troop === item}
              onClick={() => {
                setTroop(item);
                setPickedId(null);
                writeQuery(seats, item);
              }}
            >
              {troopShort[item]}
            </MiniChip>
          ))}
        </div>
      ) : null}
    </section>
  );

  return (
    <div
      data-team-page
      className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden"
    >
      {pickerBar}

      {picking && openSlot ? (
        <DragonPickList
          data-team-pick={openSlot}
          focusKey={openSlot}
          title={`Pick ${slotShort[openSlot]}${
            seats[openSlot].dragonId ? " · change" : ""
          }${
            followUp
              ? ` · then ${followUp}`
              : seatedCount > 0
                ? ""
                : " · then teams"
          }`}
          searchId="team-pick-search"
          searchLabel={`Search dragons for ${slotShort[openSlot]}`}
          currentId={seats[openSlot].dragonId}
          query={query}
          takenBy={takenBy}
          ownedStars={ownedStars}
          canCancel={seatedCount >= 1}
          cancelLabel="Teams"
          onQuery={setQuery}
          onPick={(id) => pickDragon(openSlot, id)}
          onCancel={closePicker}
        />
      ) : seatedCount === 0 ? (
        <EmptyState
          className="min-h-0 flex-1 py-8"
          title="Pick a seat"
          description="Tap Left, Vanguard, or Right, then add a dragon. The list of complete threes updates as you lock seats."
        />
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(12rem,1fr)_minmax(7rem,28%)] gap-1.5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:grid-rows-[minmax(0,1fr)]">
          {choices.length === 0 ? (
            <EmptyState
              className="min-h-0 py-8 lg:col-start-1 lg:row-start-1"
              title="No line for those seats"
              description="Try another troop chip, or clear a seat."
            />
          ) : (
            <section
              ref={listRef}
              tabIndex={0}
              onKeyDown={onListKey}
              className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-card/70 ring-1 ring-foreground/10 outline-none focus-visible:ring-amber-300 lg:col-start-1 lg:row-start-1"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-foreground/10 px-2 py-1.5">
                <p className="text-label">
                  {listLabel} · {choices.length}
                </p>
              </div>
              <TeamLineList
                choices={choices}
                pinnedIds={pinnedIds}
                ownedIds={ownedIds}
                activeId={active?.id ?? null}
                seated={pickedId === active?.id}
                onHighlight={setActiveId}
                label="Teams around these seats"
              />
            </section>
          )}
          <div className="min-h-0 min-w-0 lg:col-start-2 lg:row-start-1">
            <TeamNotesPanel
              choice={active}
              seated={pickedId === active?.id}
              tweakHref={
                pickedId === active?.id && seatedId
                  ? `/lineups/${seatedId}`
                  : null
              }
              onUse={useActive}
            />
          </div>
        </div>
      )}
    </div>
  );
}
