"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BuildPage } from "@/app/build-page";
import { BoardCard } from "@/components/board-card";
import { DragonIcon } from "@/components/dragon-icon";
import { EmptyState } from "@/components/empty-state";
import { MiniChip } from "@/components/chip";
import { StarStepper } from "@/components/star-rank";
import { TalkThreadCard } from "@/components/talk-thread-card";
import { BetaBadge } from "@/components/beta-badge";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { DRAGONS, getCatalogDragon } from "@/data/dragons";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { boardHasDragon, type BoardPublic } from "@/lib/boards";
import { MODES, TROOP_TYPES, modeShort, troopShort } from "@/lib/labels";
import type { LineupMode, TroopType } from "@/lib/types";
import type { TalkThreadSummary } from "@/lib/talk-types";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

type Pane = "recs" | "build";
type TroopFilter = TroopType | "all";
type ModeFilter = LineupMode | "all";

function clampStars(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value) || 6));
}

export function TeamPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useAuth();
  const initialDragon = getCatalogDragon(search.get("dragon") ?? "")?.id ?? null;
  const initialStars = clampStars(Number(search.get("stars") ?? 6));

  const [query, setQuery] = useState("");
  const [dragonId, setDragonId] = useState<string | null>(initialDragon);
  const [stars, setStars] = useState(initialStars);
  const [troop, setTroop] = useState<TroopFilter>("all");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [matchStars, setMatchStars] = useState(false);
  const [boards, setBoards] = useState<BoardPublic[]>([]);
  const [threads, setThreads] = useState<TalkThreadSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pane, setPane] = useState<Pane>(initialDragon ? "recs" : "build");

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
    setPane("recs");
    writeQuery(id, stars);
  }

  function changeStars(next: number) {
    const value = clampStars(next);
    setStars(value);
    writeQuery(dragonId, value);
  }

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

  async function onComment(boardId: string, text: string) {
    const data = await apiJson<{ board: BoardPublic }>(
      `/api/boards/${boardId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
    );
    replaceBoard(data.board);
  }

  const recs = (
    <section className="space-y-3">
      {!dragon ? (
        <EmptyState
          title="Pick a dragon to team-build"
          description="Community lines, star ratings, and Talk threads for that name land here. Copilot stays on its own page."
        />
      ) : busy && !loaded ? (
        <p className="text-sm text-muted-foreground">
          Loading recommendations for {dragon.name}…
        </p>
      ) : shownBoards.length === 0 && threads.length === 0 ? (
        <EmptyState
          title={`No reviews for ${dragon.name} yet`}
          description="Fill left, vanguard, and right, then post the line for review — or open Talk. Copilot is a separate beta chat if you want a ranked suggestion."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className={cn(buttonVariants())}
                onClick={() => setPane("build")}
              >
                Open the formation
              </button>
              <Link
                href="/talk/new"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Discuss in Talk
              </Link>
            </div>
          }
        />
      ) : (
        <>
          {shownBoards.length > 0 ? (
            <div className="space-y-3">
              <p className="text-label">
                Community lines · {shownBoards.length}
              </p>
              <div className="grid gap-3">
                {shownBoards.map((board) => (
                  <BoardCard
                    key={board.id}
                    board={board}
                    nextPath="/team"
                    onRate={onRate}
                    onComment={onComment}
                    onSeated={() => setPane("build")}
                  />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No lines match those filters"
              description="Clear troop, mode, or the star-rank chip to see every posted line with this dragon."
            />
          )}
          {threads.length > 0 ? (
            <div className="space-y-2">
              <p className="text-label">Talk · {threads.length}</p>
              <ul className="space-y-2">
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <TalkThreadCard thread={thread} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );

  const builder = (
    <section className="space-y-3">
      <p className="text-label">Your formation</p>
      <BuildPage
        pin={dragon ? { dragonId: dragon.id, stars } : null}
        onPublished={(board) => {
          replaceBoard(board);
          setPane("recs");
          setLoaded(true);
        }}
      />
    </section>
  );

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/15 via-card/80 to-black/40 px-4 py-5 ring-1 ring-amber-400/25 sm:px-6 sm:py-7">
        <p className="text-label">Dragonfire Pit · Team</p>
        <h1 className="font-heading mt-1 text-2xl tracking-wide sm:text-4xl">
          Team builder
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Pick the dragon you want to march. Rated community lines and Talk
          notes for that name show up beside your formation. Copilot is a
          separate beta chat — it does not run this page.
        </p>
        <Link
          href="/coach"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-amber-200 hover:underline"
        >
          <Sparkles className="size-4" />
          Open Copilot
          <BetaBadge />
        </Link>
      </section>

      <section className="rounded-2xl bg-card/60 p-3 ring-1 ring-foreground/10 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <p className="text-label">Dragon</p>
            <Input
              className="mt-1"
              placeholder="Search the hatchery…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              enterKeyHint="search"
            />
          </div>
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
        <div className="mt-3 grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {filtered.map((row) => {
            const selected = row.id === dragonId;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => pickDragon(row.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center ring-1 ring-transparent hover:bg-muted",
                  selected && "bg-amber-500/15 ring-amber-300/70",
                )}
              >
                <DragonIcon
                  dragonId={row.id}
                  name={row.name}
                  rarity={row.rarity}
                  selected={selected}
                  size="lg"
                  stars={selected ? stars : undefined}
                />
                <span className="line-clamp-1 w-full text-[11px] text-muted-foreground">
                  {row.name}
                </span>
              </button>
            );
          })}
        </div>
        {dragon ? (
          <div className="mt-3 space-y-2 border-t border-foreground/10 pt-3">
            <p className="text-sm text-foreground">
              Building around{" "}
              <span className="text-amber-100">{dragon.name}</span> at ★{stars}.
              Habits unlock at 2 / 4 / 6 / 8 / 10.
            </p>
            <div className="flex flex-wrap gap-1">
              <MiniChip
                active={troop === "all"}
                onClick={() => setTroop("all")}
              >
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
            </div>
            <div className="flex flex-wrap gap-1">
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
            </div>
            <MiniChip
              active={matchStars}
              onClick={() => setMatchStars((value) => !value)}
            >
              ★{stars} only
            </MiniChip>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Select a dragon to load community recommendations and reviews.
          </p>
        )}
      </section>

      <div className="flex gap-1 lg:hidden">
        <MiniChip active={pane === "recs"} onClick={() => setPane("recs")}>
          Reviews
        </MiniChip>
        <MiniChip active={pane === "build"} onClick={() => setPane("build")}>
          Formation
        </MiniChip>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
        <div className={cn(pane === "recs" ? "block" : "hidden", "lg:block")}>
          {recs}
        </div>
        <div className={cn(pane === "build" ? "block" : "hidden", "lg:block")}>
          {builder}
        </div>
      </div>
    </div>
  );
}
