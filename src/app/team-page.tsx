"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BuildPage } from "@/app/build-page";
import { BoardListItem } from "@/components/board-list-item";
import { DragonIcon } from "@/components/dragon-icon";
import { EmptyState } from "@/components/empty-state";
import { MiniChip } from "@/components/chip";
import { StarStepper } from "@/components/star-rank";
import { TalkThreadCard } from "@/components/talk-thread-card";
import { BetaBadge } from "@/components/beta-badge";
import { Input } from "@/components/ui/input";
import { DRAGONS, getCatalogDragon } from "@/data/dragons";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { boardHasDragon, type BoardPublic } from "@/lib/boards";
import { lineupFromAiLine } from "@/lib/ai/coach";
import { rememberBuild } from "@/lib/build-session";
import { newId, nowIso } from "@/lib/dragons";
import { MODES, TROOP_TYPES, modeShort, troopShort } from "@/lib/labels";
import { usePit } from "@/lib/store";
import type { LineupMode, TroopType } from "@/lib/types";
import type { TalkThreadSummary } from "@/lib/talk-types";
import { cn } from "@/lib/utils";
import { Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

type TroopFilter = TroopType | "all";
type ModeFilter = LineupMode | "all";

function clampStars(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value) || 6));
}

export function TeamPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useAuth();
  const { state, addLineup } = usePit();
  const pickerRef = useRef<HTMLDivElement>(null);
  const initialDragon = getCatalogDragon(search.get("dragon") ?? "")?.id ?? null;
  const initialStars = clampStars(Number(search.get("stars") ?? 6));

  const [query, setQuery] = useState("");
  const [openPicker, setOpenPicker] = useState(false);
  const [dragonId, setDragonId] = useState<string | null>(initialDragon);
  const [stars, setStars] = useState(initialStars);
  const [troop, setTroop] = useState<TroopFilter>("all");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [matchStars, setMatchStars] = useState(false);
  const [boards, setBoards] = useState<BoardPublic[]>([]);
  const [threads, setThreads] = useState<TalkThreadSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const dragon = dragonId ? (getCatalogDragon(dragonId) ?? null) : null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DRAGONS;
    return DRAGONS.filter((row) =>
      `${row.name} ${row.epithet} ${row.breed}`.toLowerCase().includes(q),
    );
  }, [query]);

  const shownBoards = useMemo(() => {
    if (!dragonId) return [];
    return boards.filter((board) => {
      if (!boardHasDragon(board, dragonId, matchStars ? stars : undefined)) {
        return false;
      }
      if (troop !== "all" && board.troop !== troop) return false;
      if (mode !== "all" && board.mode !== mode) return false;
      return true;
    });
  }, [boards, dragonId, matchStars, stars, troop, mode]);

  function writeQuery(nextDragon: string | null, nextStars: number) {
    const params = new URLSearchParams();
    if (nextDragon) params.set("dragon", nextDragon);
    params.set("stars", String(nextStars));
    const qs = params.toString();
    router.replace(qs ? `/team?${qs}` : "/team", { scroll: false });
  }

  function pickDragon(id: string) {
    setDragonId(id);
    setLoaded(false);
    setBoards([]);
    setThreads([]);
    setQuery("");
    setOpenPicker(false);
    writeQuery(id, stars);
  }

  function changeStars(next: number) {
    const value = clampStars(next);
    setStars(value);
    writeQuery(dragonId, value);
  }

  useEffect(() => {
    if (!openPicker) return;
    function onDoc(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpenPicker(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openPicker]);

  useEffect(() => {
    if (!dragonId) {
      setBoards([]);
      setThreads([]);
      setLoaded(false);
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    void Promise.all([
      apiJson<{ boards: BoardPublic[] }>(
        `/api/boards?dragonId=${encodeURIComponent(dragonId)}`,
      ),
      apiJson<{ threads: TalkThreadSummary[] }>(
        `/api/talk?dragonId=${encodeURIComponent(dragonId)}`,
      ),
    ])
      .then(([boardData, talkData]) => {
        if (cancelled) return;
        setBoards(boardData.boards);
        setThreads(talkData.threads);
        setLoaded(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load recommendations.",
        );
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dragonId, user?.id]);

  function replaceBoard(next: BoardPublic) {
    setBoards((current) => {
      const exists = current.some((board) => board.id === next.id);
      if (!exists) return [next, ...current];
      return current.map((board) => (board.id === next.id ? next : board));
    });
  }

  async function onRate(boardId: string, value: number) {
    const data = await apiJson<{ board: BoardPublic }>(
      `/api/boards/${boardId}/rate`,
      {
        method: "POST",
        body: JSON.stringify({ stars: value }),
      },
    );
    replaceBoard(data.board);
  }

  function seatBoard(board: BoardPublic) {
    const line = {
      name: board.name,
      troop: board.troop,
      mode: board.mode,
      left: board.left,
      vanguard: board.vanguard,
      right: board.right,
      why: board.why,
    };
    const owned = [board.left, board.vanguard, board.right].every((id) =>
      state.owned.some((row) => row.dragonId === id),
    );
    const filled = lineupFromAiLine(line, state, owned ? "pit" : "hatchery");
    const created = {
      ...filled,
      id: newId("lineup"),
      updatedAt: nowIso(),
    };
    addLineup(created);
    rememberBuild(created.kind, created.id);
    toast.success(`Seated ${board.name} on Team.`);
  }

  const reviews = (
    <section className="overflow-hidden rounded-2xl bg-card/70 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <p className="text-label">
          {dragon
            ? `Reviews · ${dragon.name}`
            : "Reviews"}
        </p>
        {shownBoards.length > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            {shownBoards.length} line{shownBoards.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      {!dragon ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">
          Pick a dragon above to load community lines and Talk for that name.
        </p>
      ) : busy && !loaded ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">
          Loading reviews for {dragon.name}…
        </p>
      ) : shownBoards.length === 0 && threads.length === 0 ? (
        <EmptyState
          title={`No reviews for ${dragon.name} yet`}
          description="Fill the three seats from the list on the right, then post the line."
          className="rounded-none border-0 py-8"
        />
      ) : (
        <>
          {shownBoards.length > 0 ? (
            <ul>
              {shownBoards.map((board) => (
                <BoardListItem
                  key={board.id}
                  board={board}
                  nextPath="/team"
                  onRate={onRate}
                  onSeat={seatBoard}
                />
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No lines match those filters.
            </p>
          )}
          {threads.length > 0 ? (
            <div className="space-y-2 border-t border-border/50 p-2">
              <p className="text-label px-1">Talk · {threads.length}</p>
              {threads.map((thread) => (
                <TalkThreadCard key={thread.id} thread={thread} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl tracking-wide sm:text-2xl">
            Team builder
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
            Formation on the left. Ranked pick list on the right. Copilot is a
            separate beta chat.
          </p>
        </div>
        <Link
          href="/coach"
          className="inline-flex items-center gap-1.5 text-sm text-amber-200 hover:underline"
        >
          <Sparkles className="size-4" />
          Open Copilot
          <BetaBadge />
        </Link>
      </div>

      <section
        ref={pickerRef}
        className="rounded-2xl bg-card/60 p-3 ring-1 ring-foreground/10"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <p className="text-label">Build around</p>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={
                  dragon ? `Change from ${dragon.name}…` : "Search a dragon…"
                }
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpenPicker(true);
                }}
                onFocus={() => setOpenPicker(true)}
                enterKeyHint="search"
              />
            </div>
            {openPicker ? (
              <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl bg-popover py-1 shadow-lg ring-1 ring-foreground/15">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    No hatchery match.
                  </li>
                ) : (
                  filtered.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => pickDragon(row.id)}
                        className={cn(
                          "flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-muted",
                          row.id === dragonId && "bg-amber-500/15",
                        )}
                      >
                        <DragonIcon
                          dragonId={row.id}
                          name={row.name}
                          rarity={row.rarity}
                          size="xs"
                        />
                        <span className="text-sm">{row.name}</span>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {row.epithet}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
          {dragon ? (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-2 py-1.5 ring-1 ring-amber-400/30">
              <DragonIcon
                dragonId={dragon.id}
                name={dragon.name}
                rarity={dragon.rarity}
                selected
                size="sm"
                stars={stars}
              />
              <div>
                <p className="text-sm text-amber-50">{dragon.name}</p>
                <p className="text-[11px] text-muted-foreground">★{stars}</p>
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-label">Stars you have</p>
            <div className="mt-1">
              <StarStepper
                value={stars}
                onDelta={(delta) => changeStars(stars + delta)}
              />
            </div>
          </div>
        </div>
        {dragon ? (
          <div className="mt-3 flex flex-wrap gap-1 border-t border-foreground/10 pt-3">
            <MiniChip active={troop === "all"} onClick={() => setTroop("all")}>
              All troops
            </MiniChip>
            {TROOP_TYPES.map((item) => (
              <MiniChip
                key={item}
                active={troop === item}
                onClick={() => setTroop(item)}
              >
                {troopShort[item]}
              </MiniChip>
            ))}
            <MiniChip active={mode === "all"} onClick={() => setMode("all")}>
              All modes
            </MiniChip>
            {MODES.map((item) => (
              <MiniChip
                key={item}
                active={mode === item}
                onClick={() => setMode(item)}
              >
                {modeShort[item]}
              </MiniChip>
            ))}
            <MiniChip
              active={matchStars}
              onClick={() => setMatchStars((value) => !value)}
            >
              ★{stars} only
            </MiniChip>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Optional. The list on the right ranks every hatchery dragon for the
            selected lane.
          </p>
        )}
      </section>

      <BuildPage
        pin={dragon ? { dragonId: dragon.id, stars } : null}
        belowFormation={reviews}
        onPublished={(board) => {
          replaceBoard(board);
          setLoaded(true);
        }}
      />
    </div>
  );
}
