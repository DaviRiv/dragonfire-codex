"use client";

import { useMemo, useState } from "react";
import { DRAGONS } from "@/data/dragons";
import { BoardCard } from "@/components/board-card";
import { accountHref } from "@/components/account-gate";
import { DragonIcon } from "@/components/dragon-icon";
import { EmptyState } from "@/components/empty-state";
import { MiniChip } from "@/components/chip";
import { StarStepper } from "@/components/star-rank";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { BoardPublic } from "@/lib/boards";
import { MODES, TROOP_TYPES, modeShort, troopShort } from "@/lib/labels";
import type { LineupMode, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function BoardsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [dragonId, setDragonId] = useState<string | null>(null);
  const [stars, setStars] = useState(6);
  const [troop, setTroop] = useState<TroopType>("shieldbearers");
  const [mode, setMode] = useState<LineupMode>("pvp");
  const [boards, setBoards] = useState<BoardPublic[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<"community" | "copilot" | null>(null);
  const [busy, setBusy] = useState<"off" | "copilot" | "community">("off");

  const dragon = DRAGONS.find((row) => row.id === dragonId) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DRAGONS;
    return DRAGONS.filter((row) =>
      `${row.name} ${row.epithet} ${row.breed}`.toLowerCase().includes(q),
    );
  }, [query]);

  function pickDragon(id: string) {
    const next = DRAGONS.find((row) => row.id === id);
    setDragonId(id);
    setSource(null);
    setBoards([]);
    setLoaded(false);
    if (next?.affinities[0]) setTroop(next.affinities[0]);
  }

  async function loadCommunity() {
    if (!dragon) return;
    setBusy("community");
    try {
      const data = await apiJson<{ boards: BoardPublic[] }>(
        `/api/boards?dragonId=${encodeURIComponent(dragon.id)}&stars=${stars}`,
      );
      setBoards(data.boards);
      setSource("community");
      setLoaded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load boards.");
    } finally {
      setBusy("off");
    }
  }

  async function askCopilot() {
    if (!dragon) return;
    if (!user) {
      toast.error("Register an account to use Copilot.");
      return;
    }
    setBusy("copilot");
    try {
      const data = await apiJson<{ boards: BoardPublic[] }>("/api/boards/suggest", {
        method: "POST",
        body: JSON.stringify({
          dragonId: dragon.id,
          stars,
          troop,
          mode,
        }),
      });
      setBoards(data.boards);
      setSource("copilot");
      setLoaded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copilot could not seat a line.");
    } finally {
      setBusy("off");
    }
  }

  function replaceBoard(next: BoardPublic) {
    setBoards((current) =>
      current.map((board) => (board.id === next.id ? next : board)),
    );
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

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/15 via-card/80 to-black/40 px-4 py-5 ring-1 ring-amber-400/25 sm:px-6 sm:py-7">
        <p className="text-label">Dragonfire Pit · Revision 2</p>
        <h1 className="font-heading mt-1 text-2xl tracking-wide sm:text-4xl">
          Boards
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Pick the dragon you want to march and the star rank you actually have.
          Copilot seats several three-dragon lines around that pick. Rate them
          and leave notes — a public board for what held up in the field.
        </p>
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
            <p className="text-label">Stars on that dragon</p>
            <div className="mt-1">
              <StarStepper
                value={stars}
                onDelta={(delta) =>
                  setStars((value) => Math.min(10, Math.max(1, value + delta)))
                }
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
              Using <span className="text-amber-100">{dragon.name}</span> at ★
              {stars}. Habits unlock at 2 / 4 / 6 / 8 / 10.
            </p>
            <div className="flex flex-wrap gap-1">
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
            <div className="flex flex-wrap gap-2">
              {user ? (
                <Button onClick={() => void askCopilot()} disabled={busy !== "off"}>
                  <Sparkles />
                  {busy === "copilot" ? "Seating lines…" : "Ask Copilot"}
                </Button>
              ) : (
                <Link
                  href={accountHref("/")}
                  className={cn(buttonVariants(), "inline-flex")}
                >
                  <Sparkles />
                  Register to use Copilot
                </Link>
              )}
              <Button
                variant="outline"
                disabled={busy !== "off" || !dragon}
                onClick={() => void loadCommunity()}
              >
                {busy === "community" ? "Loading…" : "Show reviews"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Select a dragon to start.
            {user
              ? " Ask Copilot to seat several lines around that pick, then rate what actually held."
              : " Copilot needs a registered account; anyone can read the reviews."}
          </p>
        )}
      </section>

      {!dragon ? (
        <EmptyState
          title="Pick a dragon for the board"
          description="This is the main table now: one name, one star rank, then several Copilot lines you can score like a Yelp page."
        />
      ) : !loaded ? (
        <EmptyState
          title={user ? "Ask Copilot for lines" : "Reviews stay public"}
          description={
            user
              ? `Copilot will seat multiple ${troopShort[troop]} ${modeShort[mode]} teams around ${dragon.name} at ★${stars}.`
              : "Register to generate new suggestions. You can still open existing reviews for this dragon."
          }
        />
      ) : boards.length === 0 ? (
        <EmptyState
          title="Nothing on the board yet"
          description={
            source === "copilot"
              ? "Copilot could not finish three seats for that troop and mode. Try another troop."
              : "Nobody has reviewed this star rank yet. Ask Copilot to put the first lines up."
          }
        />
      ) : (
        <section className="space-y-3">
          <p className="text-label">
            {source === "copilot" ? "Copilot lines" : "Community reviews"} ·{" "}
            {boards.length}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                nextPath="/"
                onRate={onRate}
                onComment={onComment}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
