"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DragonIcon } from "@/components/dragon-icon";
import { EmptyState } from "@/components/empty-state";
import { MiniChip } from "@/components/chip";
import { StarStepper } from "@/components/star-rank";
import {
  TeamLineList,
  TeamNotesPanel,
} from "@/components/team-choice-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DRAGONS, getCatalogDragon } from "@/data/dragons";
import { ONLINE_DPS_CORE } from "@/data/meta";
import { rememberBuild } from "@/lib/build-session";
import { boardLineFromLineup } from "@/lib/boards";
import { choicesAgainstEnemy, enemyTroopGuess } from "@/lib/counter-choices";
import { analyzeEnemy, enemyLineComplete } from "@/lib/counter";
import { newId, nowIso } from "@/lib/dragons";
import {
  TROOP_TYPES,
  defaultCounterTroop,
  slotShort,
  troopMatchupCopy,
  troopShort,
  troopsThatBeat,
} from "@/lib/labels";
import { SLOT_IDS } from "@/lib/lineup";
import { usePit } from "@/lib/store";
import type { SlotId, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Search, Swords, X } from "lucide-react";
import { toast } from "sonner";

function clampStars(value: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 6;
  return Math.min(10, Math.max(1, n));
}

function readId(raw: string | null): string | null {
  return getCatalogDragon(raw ?? "")?.id ?? null;
}

type SeatState = { dragonId: string | null; stars: number };

export function CounterPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { state, addLineup } = usePit();
  const pickerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [seats, setSeats] = useState<Record<SlotId, SeatState>>(() => ({
    left: {
      dragonId: readId(search.get("l")),
      stars: clampStars(Number(search.get("ls") ?? 6)),
    },
    vanguard: {
      dragonId: readId(search.get("v")),
      stars: clampStars(Number(search.get("vs") ?? 6)),
    },
    right: {
      dragonId: readId(search.get("r")),
      stars: clampStars(Number(search.get("rs") ?? 6)),
    },
  }));
  const [enemyTroop, setEnemyTroop] = useState<TroopType>(() => {
    const raw = search.get("troop");
    if (raw && TROOP_TYPES.includes(raw as TroopType)) return raw as TroopType;
    return (
      enemyTroopGuess([
        readId(search.get("l")),
        readId(search.get("v")),
        readId(search.get("r")),
      ]) ?? "shieldbearers"
    );
  });
  const [ourTroop, setOurTroop] = useState<TroopType>(() => {
    const raw = search.get("ours");
    if (raw && TROOP_TYPES.includes(raw as TroopType)) return raw as TroopType;
    const theirs = search.get("troop");
    const enemy =
      theirs && TROOP_TYPES.includes(theirs as TroopType)
        ? (theirs as TroopType)
        : (enemyTroopGuess([
            readId(search.get("l")),
            readId(search.get("v")),
            readId(search.get("r")),
          ]) ?? "shieldbearers");
    return defaultCounterTroop(enemy);
  });
  const [openSlot, setOpenSlot] = useState<SlotId | null>(null);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [seatedId, setSeatedId] = useState<string | null>(null);

  const complete = enemyLineComplete({
    left: seats.left.dragonId,
    vanguard: seats.vanguard.dragonId,
    right: seats.right.dragonId,
  });

  const enemy = useMemo(() => {
    const draft = {
      left: seats.left.dragonId,
      vanguard: seats.vanguard.dragonId,
      right: seats.right.dragonId,
    };
    if (!enemyLineComplete(draft)) return null;
    return {
      left: draft.left,
      vanguard: draft.vanguard,
      right: draft.right,
      leftStars: seats.left.stars,
      vanguardStars: seats.vanguard.stars,
      rightStars: seats.right.stars,
      troop: enemyTroop,
    };
  }, [
    seats.left.dragonId,
    seats.left.stars,
    seats.vanguard.dragonId,
    seats.vanguard.stars,
    seats.right.dragonId,
    seats.right.stars,
    enemyTroop,
  ]);

  const profile = useMemo(
    () => (enemy ? analyzeEnemy(enemy) : null),
    [enemy],
  );

  const choices = useMemo(() => {
    if (!enemy) return [];
    return choicesAgainstEnemy({
      enemy,
      troop: ourTroop,
      state,
      limit: 12,
    });
  }, [enemy, ourTroop, state]);

  const active = choices.find((row) => row.id === activeId) ?? choices[0] ?? null;
  const ownedIds = useMemo(
    () => new Set(state.owned.map((row) => row.dragonId)),
    [state.owned],
  );
  const saved = state.lineups
    .map((lineup) => ({ lineup, board: boardLineFromLineup(lineup) }))
    .filter((row) => row.board);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const taken = new Set(
      SLOT_IDS.map((slot) => seats[slot].dragonId).filter(Boolean),
    );
    const pool = DRAGONS.filter((row) => !taken.has(row.id) || row.id === (openSlot ? seats[openSlot].dragonId : null));
    if (!q) return pool;
    return pool.filter((row) =>
      `${row.name} ${row.epithet} ${row.breed}`.toLowerCase().includes(q),
    );
  }, [query, seats, openSlot]);

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

  useEffect(() => {
    if (!openSlot) return;
    function onDoc(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpenSlot(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openSlot]);

  function writeQuery(next: Record<SlotId, SeatState>, theirs: TroopType, ours: TroopType) {
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
    params.set("troop", theirs);
    params.set("ours", ours);
    const qs = params.toString();
    router.replace(qs ? `/counter?${qs}` : "/counter", { scroll: false });
  }

  function setSeat(slot: SlotId, patch: Partial<SeatState>) {
    const next = {
      ...seats,
      [slot]: { ...seats[slot], ...patch },
    };
    let theirs = enemyTroop;
    if (patch.dragonId !== undefined) {
      const guessed = enemyTroopGuess([
        next.left.dragonId,
        next.vanguard.dragonId,
        next.right.dragonId,
      ]);
      if (guessed) theirs = guessed;
    }
    const ours = defaultCounterTroop(theirs);
    setSeats(next);
    setEnemyTroop(theirs);
    setOurTroop(ours);
    setPickedId(null);
    setSeatedId(null);
    writeQuery(next, theirs, ours);
  }

  function pickEnemyTroop(troop: TroopType) {
    const ours = defaultCounterTroop(troop);
    setEnemyTroop(troop);
    setOurTroop(ours);
    setPickedId(null);
    writeQuery(seats, troop, ours);
  }

  function pickOurTroop(troop: TroopType) {
    setOurTroop(troop);
    setPickedId(null);
    writeQuery(seats, enemyTroop, troop);
  }

  function loadBoard(left: string, vanguard: string, right: string, troop: TroopType, stars: { left: number; vanguard: number; right: number }) {
    const next: Record<SlotId, SeatState> = {
      left: { dragonId: left, stars: clampStars(stars.left) },
      vanguard: { dragonId: vanguard, stars: clampStars(stars.vanguard) },
      right: { dragonId: right, stars: clampStars(stars.right) },
    };
    const ours = defaultCounterTroop(troop);
    setSeats(next);
    setEnemyTroop(troop);
    setOurTroop(ours);
    setQuery("");
    setOpenSlot(null);
    setPickedId(null);
    setSeatedId(null);
    writeQuery(next, troop, ours);
  }

  function loadCore() {
    const core = ONLINE_DPS_CORE;
    loadBoard(core.left.id, core.vanguard.id, core.right.id, core.troop, {
      left: 6,
      vanguard: 6,
      right: 6,
    });
  }

  function useActive() {
    if (!active) return;
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

  const beaters = troopsThatBeat(enemyTroop);
  const recommended = defaultCounterTroop(enemyTroop);

  const picker = (
    <section
      ref={pickerRef}
      data-counter-enemy
      className="shrink-0 rounded-2xl bg-card/60 p-2.5 ring-1 ring-foreground/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label">They march</p>
        <div className="flex flex-wrap gap-1">
          <MiniChip active={false} onClick={loadCore}>
            Online DPS core
          </MiniChip>
          {saved.slice(0, 4).map(({ lineup, board }) =>
            board ? (
              <MiniChip
                key={lineup.id}
                onClick={() =>
                  loadBoard(board.left, board.vanguard, board.right, board.troop, {
                    left: board.leftStars,
                    vanguard: board.vanguardStars,
                    right: board.rightStars,
                  })
                }
              >
                {lineup.name}
              </MiniChip>
            ) : null,
          )}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {SLOT_IDS.map((slot) => {
          const seat = seats[slot];
          const dragon = seat.dragonId ? getCatalogDragon(seat.dragonId) : null;
          const open = openSlot === slot;
          return (
            <div
              key={slot}
              data-enemy-seat={slot}
              className="relative rounded-xl bg-black/25 p-2 ring-1 ring-foreground/10"
            >
              <p className="text-label">{slotShort[slot]}</p>
              {dragon ? (
                <div className="mt-1 flex items-center gap-2">
                  <DragonIcon
                    dragonId={dragon.id}
                    name={dragon.name}
                    rarity={dragon.rarity}
                    size="sm"
                    stars={seat.stars}
                    selected
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-amber-50">{dragon.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {dragon.epithet}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Clear ${slotShort[slot]}`}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setSeat(slot, { dragonId: null })}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-10 pl-7 text-sm"
                    placeholder={`Search ${slotShort[slot].toLowerCase()}…`}
                    value={open ? query : ""}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setOpenSlot(slot);
                    }}
                    onFocus={() => {
                      setQuery("");
                      setOpenSlot(slot);
                    }}
                    enterKeyHint="search"
                  />
                </div>
              )}
              {open ? (
                <ul className="absolute z-30 mt-1 max-h-48 w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-popover py-1 shadow-lg ring-1 ring-foreground/15">
                  {filtered.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">
                      No hatchery match.
                    </li>
                  ) : (
                    filtered.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSeat(slot, { dragonId: row.id });
                            setQuery("");
                            setOpenSlot(null);
                          }}
                          className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-muted"
                        >
                          <DragonIcon
                            dragonId={row.id}
                            name={row.name}
                            rarity={row.rarity}
                            size="xs"
                          />
                          <span className="text-sm">{row.name}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
              {dragon ? (
                <div className="mt-1">
                  <StarStepper
                    value={seat.stars}
                    onDelta={(delta) =>
                      setSeat(slot, { stars: clampStars(seat.stars + delta) })
                    }
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-foreground/10 pt-2">
        <p className="mr-1 text-[11px] tracking-wide text-muted-foreground uppercase">
          Their troop
        </p>
        {TROOP_TYPES.map((item) => (
          <MiniChip
            key={item}
            active={enemyTroop === item}
            onClick={() => pickEnemyTroop(item)}
          >
            {troopShort[item]}
          </MiniChip>
        ))}
      </div>
      {complete && profile ? (
        <p className="mt-2 text-[12px] leading-snug text-muted-foreground" data-enemy-intel>
          {profile.healers.length
            ? `Live Recovery: ${profile.healers.map((row) => `${row.dragon.name} ★${row.stars}`).join(", ")}.`
            : "No live Recovery on this line."}
          {profile.tanks.length
            ? ` Taunt: ${profile.tanks.map((row) => row.dragon.name).join(", ")}.`
            : ""}
          {profile.lockedHeal.length
            ? ` Still locked: ${profile.lockedHeal
                .map((row) => `${row.name} Recovery at ${row.stars}★`)
                .join(", ")}.`
            : ""}
        </p>
      ) : null}
    </section>
  );

  return (
    <div
      data-counter-page
      className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-lg tracking-wide sm:text-xl">
          Team counter
        </h1>
        <Link
          href="/team"
          className="inline-flex items-center gap-1.5 text-sm text-amber-200 hover:underline"
        >
          <Swords className="size-4" />
          Build around one dragon
        </Link>
      </div>

      {!complete ? (
        <>
          {picker}
          <EmptyState
            className="min-h-0 flex-1 py-8 sm:py-10"
            title="Seat the three dragons you have to beat"
            description="Set each star rank. Troop advantage on tiles is Cavalry over Shields, Shields over Archers, Archers over Spears, Spears over Cavalry. Siege loses to every troop."
            action={
              <Button type="button" onClick={loadCore}>
                Load the online DPS core
              </Button>
            }
          />
        </>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_minmax(12.5rem,40%)] gap-2 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:grid-rows-[auto_minmax(0,1fr)]">
          <div className="min-w-0 space-y-2 lg:col-start-1 lg:row-start-1">
            {picker}
            <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-card/60 px-2.5 py-2 ring-1 ring-foreground/10">
              <p className="mr-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                You march
              </p>
              {TROOP_TYPES.map((item) => (
                <MiniChip
                  key={item}
                  active={ourTroop === item}
                  onClick={() => pickOurTroop(item)}
                >
                  {troopShort[item]}
                  {item === recommended ? " · beats" : ""}
                </MiniChip>
              ))}
              <p className="w-full pt-1 text-[11px] text-muted-foreground">
                {troopMatchupCopy(ourTroop, enemyTroop)}
                {beaters.length > 1 && ourTroop === recommended
                  ? ` Also beats them: ${beaters
                      .filter((item) => item !== recommended)
                      .map((item) => troopShort[item])
                      .join(", ")}.`
                  : ""}
              </p>
            </div>
          </div>
          {choices.length === 0 ? (
            <EmptyState
              className="min-h-0 py-8 lg:col-start-1 lg:row-start-2"
              title="No counter line for that troop"
              description="Try another troop chip. The builder still wants a healer and a damage seat on your side."
            />
          ) : (
            <section
              ref={listRef}
              tabIndex={0}
              onKeyDown={onListKey}
              className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-card/70 ring-1 ring-foreground/10 outline-none focus-visible:ring-amber-300 lg:col-start-1 lg:row-start-2"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-foreground/10 px-3 py-2">
                <p className="text-label">
                  Lines that counter · {choices.length}
                </p>
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  Highlight a line. Only this list scrolls.
                </p>
              </div>
              <TeamLineList
                choices={choices}
                ownedIds={ownedIds}
                activeId={active?.id ?? null}
                seated={pickedId === active?.id}
                onHighlight={setActiveId}
                label="Teams that counter this line"
              />
            </section>
          )}
          <div className="min-h-0 min-w-0 lg:col-start-2 lg:row-span-2">
            <TeamNotesPanel
              choice={active}
              seated={pickedId === active?.id}
              tweakHref={
                pickedId === active?.id && seatedId ? `/lineups/${seatedId}` : null
              }
              onUse={useActive}
              hint="Troop advantage is the tile triangle. Recovery answers use Stun, Overwhelm, or Prey when those kits are actually on the line. Dragons in your Hatchery keep their stars; everyone else is a goal."
            />
          </div>
        </div>
      )}
    </div>
  );
}
