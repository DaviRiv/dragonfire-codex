"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonPickList } from "@/components/dragon-pick-list";
import { EmptyState } from "@/components/empty-state";
import { MiniChip } from "@/components/chip";
import { TroopChip } from "@/components/troop-icon";
import {
  TeamLineList,
  TeamNotesPanel,
} from "@/components/team-choice-card";
import { getCatalogDragon } from "@/data/dragons";
import { CURRENT_META_LINES } from "@/data/meta";
import { rememberBuild } from "@/lib/build-session";
import { boardLineFromLineup } from "@/lib/boards";
import {
  choicesAgainstEnemy,
  defaultTroopsForEnemy,
} from "@/lib/counter-choices";
import { analyzeEnemy, enemyLineComplete } from "@/lib/counter";
import { newId, nowIso } from "@/lib/dragons";
import {
  TROOP_TYPES,
  defaultCounterTroop,
  slotShort,
  troopMatchupCopy,
  troopLabels,
  troopsThatBeat,
} from "@/lib/labels";
import {
  communityAnswerNote,
  communityCounterTroop,
  communityEnemyTroop,
} from "@/lib/line-book";
import { SLOT_IDS } from "@/lib/lineup";
import { starsForCounterPick } from "@/lib/counter-pick";
import { usePit } from "@/lib/store";
import type { SlotId, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Swords, X } from "lucide-react";
import { toast } from "sonner";

function clampStars(value: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 6;
  return Math.min(10, Math.max(1, n));
}

function readId(raw: string | null): string | null {
  return getCatalogDragon(raw ?? "")?.id ?? null;
}

function firstEmptySeat(seats: Record<SlotId, SeatState>): SlotId | null {
  return SLOT_IDS.find((slot) => !seats[slot].dragonId) ?? null;
}

type SeatState = { dragonId: string | null; stars: number };

export function CounterPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { state, addLineup } = usePit();
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
    return defaultTroopsForEnemy([
      readId(search.get("l")),
      readId(search.get("v")),
      readId(search.get("r")),
    ]).theirs;
  });
  const [ourTroop, setOurTroop] = useState<TroopType>(() => {
    const raw = search.get("ours");
    if (raw && TROOP_TYPES.includes(raw as TroopType)) return raw as TroopType;
    return defaultTroopsForEnemy([
      readId(search.get("l")),
      readId(search.get("v")),
      readId(search.get("r")),
    ]).ours;
  });
  const [openSlot, setOpenSlot] = useState<SlotId | null>(() => {
    if (!readId(search.get("l"))) return "left";
    if (!readId(search.get("v"))) return "vanguard";
    if (!readId(search.get("r"))) return "right";
    return null;
  });
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [seatedId, setSeatedId] = useState<string | null>(null);

  const complete = enemyLineComplete({
    left: seats.left.dragonId,
    vanguard: seats.vanguard.dragonId,
    right: seats.right.dragonId,
  });
  const picking = openSlot != null;

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
  const ownedStars = useMemo(
    () => new Map(state.owned.map((row) => [row.dragonId, row.starRank] as const)),
    [state.owned],
  );
  const saved = state.lineups
    .map((lineup) => ({ lineup, board: boardLineFromLineup(lineup) }))
    .filter((row) => row.board);

  const takenBy = useMemo(() => {
    const map = new Map<string, SlotId>();
    for (const slot of SLOT_IDS) {
      if (slot === openSlot) continue;
      const id = seats[slot].dragonId;
      if (id) map.set(id, slot);
    }
    return map;
  }, [seats, openSlot]);

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

  function commitSeats(
    next: Record<SlotId, SeatState>,
    theirs: TroopType,
    ours: TroopType,
  ) {
    setSeats(next);
    setEnemyTroop(theirs);
    setOurTroop(ours);
    setPickedId(null);
    setSeatedId(null);
    writeQuery(next, theirs, ours);
    return next;
  }

  function troopsFor(next: Record<SlotId, SeatState>): {
    theirs: TroopType;
    ours: TroopType;
  } {
    const guessed = defaultTroopsForEnemy(
      [next.left.dragonId, next.vanguard.dragonId, next.right.dragonId],
      enemyTroop,
    );
    const completeSeats =
      Boolean(next.left.dragonId) &&
      Boolean(next.vanguard.dragonId) &&
      Boolean(next.right.dragonId);
    if (!completeSeats) {
      return { theirs: guessed.theirs, ours: ourTroop };
    }
    return guessed;
  }

  function setSeatStars(slot: SlotId, stars: number) {
    commitSeats(
      {
        ...seats,
        [slot]: { ...seats[slot], stars: clampStars(stars) },
      },
      enemyTroop,
      ourTroop,
    );
  }

  function pickEnemy(slot: SlotId, dragonId: string) {
    const next = {
      ...seats,
      [slot]: {
        dragonId,
        stars: starsForCounterPick(dragonId, ownedStars, seats[slot].stars),
      },
    };
    const { theirs, ours } = troopsFor(next);
    commitSeats(next, theirs, ours);
    setOpenSlot(firstEmptySeat(next));
    setQuery("");
  }

  function clearSeat(slot: SlotId) {
    const next = {
      ...seats,
      [slot]: { ...seats[slot], dragonId: null },
    };
    const { theirs, ours } = troopsFor(next);
    commitSeats(next, theirs, ours);
    setOpenSlot(slot);
    setQuery("");
  }

  function toggleSlot(slot: SlotId) {
    if (openSlot === slot && complete) {
      setOpenSlot(null);
      setQuery("");
      return;
    }
    setOpenSlot(slot);
    setQuery("");
  }

  function closePicker() {
    if (!complete) return;
    setOpenSlot(null);
    setQuery("");
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

  function loadBoard(
    left: string,
    vanguard: string,
    right: string,
    troop: TroopType,
    stars: { left: number; vanguard: number; right: number },
  ) {
    const next: Record<SlotId, SeatState> = {
      left: { dragonId: left, stars: clampStars(stars.left) },
      vanguard: { dragonId: vanguard, stars: clampStars(stars.vanguard) },
      right: { dragonId: right, stars: clampStars(stars.right) },
    };
    const theirs = communityEnemyTroop([left, vanguard, right]) ?? troop;
    const ours = communityCounterTroop([left, vanguard, right], theirs);
    setSeats(next);
    setEnemyTroop(theirs);
    setOurTroop(ours);
    setQuery("");
    setOpenSlot(null);
    setPickedId(null);
    setSeatedId(null);
    writeQuery(next, theirs, ours);
  }

  function loadCore(id: string) {
    const core = CURRENT_META_LINES.find((line) => line.id === id);
    if (!core) return;
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
  const compactChip = "min-h-7 px-2 py-0 text-[11px]";
  const pickFollowUp = openSlot
    ? SLOT_IDS.filter((item) => item !== openSlot && !seats[item].dragonId)
        .map((item) => slotShort[item])
        .join(", then ")
    : "";
  const enemyIds = enemy
    ? [enemy.left, enemy.vanguard, enemy.right]
    : [];
  const communityNote =
    enemy && complete
      ? communityAnswerNote(enemyIds, enemy.troop)
      : null;
  const intel = profile
    ? [
        profile.healers.length
          ? `Recovery ${profile.healers.map((row) => `${row.dragon.name} ★${row.stars}`).join(", ")}`
          : "No live Recovery",
        profile.tanks.length
          ? `Taunt ${profile.tanks.map((row) => row.dragon.name).join(", ")}`
          : null,
        profile.lockedHeal.length
          ? `Locked ${profile.lockedHeal.map((row) => `${row.name} ${row.stars}★`).join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const intelLine = [intel, communityNote].filter(Boolean).join(". ");

  const picker = (
    <section
      data-counter-enemy
      className="shrink-0 rounded-xl bg-card/60 px-2 py-1.5 ring-1 ring-foreground/10"
    >
      <div className="flex flex-wrap items-center gap-1">
        <MiniChip className={compactChip} onClick={() => loadCore("online-dps")}>
          DPS core
        </MiniChip>
        <MiniChip className={compactChip} onClick={() => loadCore("shield-moon")}>
          Moon line
        </MiniChip>
        <MiniChip className={compactChip} onClick={() => loadCore("spear-syrax")}>
          Spear core
        </MiniChip>
        <MiniChip className={compactChip} onClick={() => loadCore("cav-sea")}>
          Cav core
        </MiniChip>
        <span className="hidden sm:contents">
          {saved.slice(0, 3).map(({ lineup, board }) =>
            board ? (
              <MiniChip
                key={lineup.id}
                className={compactChip}
                onClick={() =>
                  loadBoard(
                    board.left,
                    board.vanguard,
                    board.right,
                    board.troop,
                    {
                      left: board.leftStars,
                      vanguard: board.vanguardStars,
                      right: board.rightStars,
                    },
                  )
                }
              >
                {lineup.name}
              </MiniChip>
            ) : null,
          )}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1">
        {SLOT_IDS.map((slot) => {
          const seat = seats[slot];
          const dragon = seat.dragonId ? getCatalogDragon(seat.dragonId) : null;
          const open = openSlot === slot;
          return (
            <div
              key={slot}
              data-enemy-seat={slot}
              className={cn(
                "min-w-0 rounded-lg px-1 py-1 ring-1",
                open
                  ? "bg-amber-500/15 ring-amber-300"
                  : "ring-foreground/10",
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
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
          Enemy
        </p>
        {TROOP_TYPES.map((item) => (
          <TroopChip
            key={`enemy-${item}`}
            troop={item}
            className={compactChip}
            active={enemyTroop === item}
            onClick={() => pickEnemyTroop(item)}
          />
        ))}
        {complete ? (
          <>
            <span className="mx-0.5 text-muted-foreground">|</span>
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              You
            </p>
            {TROOP_TYPES.map((item) => (
              <TroopChip
                key={`ours-${item}`}
                troop={item}
                className={compactChip}
                active={ourTroop === item}
                hint={item === recommended ? "tile winner" : undefined}
                onClick={() => pickOurTroop(item)}
              />
            ))}
          </>
        ) : null}
      </div>
      {complete && profile ? (
        <p
          className="mt-1 truncate text-[11px] text-muted-foreground"
          data-enemy-intel
          title={`${intelLine}. ${troopMatchupCopy(ourTroop, enemyTroop)}${
            beaters.length > 1 && ourTroop === recommended
              ? ` Also: ${beaters
                  .filter((item) => item !== recommended)
                  .map((item) => troopLabels[item])
                  .join(", ")}.`
              : ""
          }`}
        >
          {intelLine}. {troopMatchupCopy(ourTroop, enemyTroop)}
        </p>
      ) : null}
    </section>
  );

  return (
    <div
      data-counter-page
      className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h1 className="font-heading text-base tracking-wide">Counter</h1>
        <Link
          href="/team"
          className="inline-flex items-center gap-1 text-[13px] text-amber-200 hover:underline"
        >
          <Swords className="size-3.5" />
          Team
        </Link>
      </div>

      {picker}

      {picking && openSlot ? (
        <DragonPickList
          data-counter-pick={openSlot}
          focusKey={openSlot}
          title={`Pick enemy ${slotShort[openSlot]}${
            seats[openSlot].dragonId ? " · change" : ""
          }${
            pickFollowUp
              ? ` · then ${pickFollowUp}`
              : complete
                ? ""
                : " · then counters"
          }`}
          searchId="counter-pick-search"
          searchLabel={`Search dragons for enemy ${slotShort[openSlot]}`}
          currentId={seats[openSlot].dragonId}
          query={query}
          takenBy={takenBy}
          ownedStars={ownedStars}
          canCancel={complete}
          cancelLabel="Counters"
          onQuery={setQuery}
          onPick={(id) => pickEnemy(openSlot, id)}
          onCancel={closePicker}
        />
      ) : complete ? (
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(12rem,1fr)_minmax(7rem,28%)] gap-1.5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:grid-rows-[minmax(0,1fr)]">
          {choices.length === 0 ? (
            <EmptyState
              className="min-h-0 py-8 lg:col-start-1 lg:row-start-1"
              title="No counter line for that troop"
              description="Try another troop chip. The builder still wants a healer and a damage seat on your side."
            />
          ) : (
            <section
              ref={listRef}
              tabIndex={0}
              onKeyDown={onListKey}
              className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-card/70 ring-1 ring-foreground/10 outline-none focus-visible:ring-amber-300 lg:col-start-1 lg:row-start-1"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-foreground/10 px-2 py-1.5">
                <p className="text-label">Counters · {choices.length}</p>
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
          <div className="min-h-0 min-w-0 lg:col-start-2 lg:row-start-1">
            <TeamNotesPanel
              choice={active}
              seated={pickedId === active?.id}
              hint={communityNote ?? undefined}
              tweakHref={
                pickedId === active?.id && seatedId ? `/lineups/${seatedId}` : null
              }
              onUse={useActive}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
