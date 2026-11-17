"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Compass,
  Flame,
  MessageSquare,
  MessagesSquare,
  Shield,
  Sparkles,
  Swords,
  UserPlus,
  Users,
} from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { accountHref } from "@/components/account-gate";
import { MiniChip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SearchField } from "@/components/search-field";
import { SectionLabel } from "@/components/section-label";
import { CardListSkeleton } from "@/components/skeleton";
import { TalkLineChip } from "@/components/talk-line";
import { buttonVariants } from "@/components/ui/button";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  FORUM_BOARDS,
  FORUM_SECTIONS,
  forumBoardMeta,
  isTalkCategory,
  type TalkCategory,
  type TalkThreadSummary,
} from "@/lib/talk-types";
import { cn } from "@/lib/utils";

type SortMode = "latest" | "newest" | "replies";

const BOARD_ICON: Record<TalkCategory, typeof MessagesSquare> = {
  recruitment: Users,
  lfa: UserPlus,
  general: MessageSquare,
  pvp: Swords,
  rally: Flame,
  defense: Shield,
  pve: Compass,
  gathering: Sparkles,
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initialFor(name: string): string {
  const clean = name.trim();
  return clean ? clean[0].toUpperCase() : "?";
}

export function ForumsListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardParam = searchParams.get("board");
  const activeBoard: TalkCategory | "all" = isTalkCategory(boardParam)
    ? boardParam
    : "all";

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("latest");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    threads?: TalkThreadSummary[];
    error?: string;
  } | null>(null);

  const key = `all:${attempt}`;
  const current = result?.key === key ? result : null;
  const allThreads = current?.threads ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    let cancelled = false;
    void apiJson<{ threads: TalkThreadSummary[] }>("/api/forums")
      .then((data) => {
        if (!cancelled) setResult({ key, threads: data.threads });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({
            key,
            error: err instanceof Error ? err.message : "Could not load Forums.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  function openBoard(board: TalkCategory | "all") {
    if (board === "all") {
      router.replace("/forums", { scroll: false });
      return;
    }
    router.replace(`/forums?board=${board}`, { scroll: false });
  }

  const boardStats = useMemo(() => {
    const map = new Map<
      TalkCategory,
      { threads: number; posts: number; latest: TalkThreadSummary | null }
    >();
    for (const board of FORUM_BOARDS) {
      map.set(board.id, { threads: 0, posts: 0, latest: null });
    }
    for (const thread of allThreads ?? []) {
      const entry = map.get(thread.category);
      if (!entry) continue;
      entry.threads += 1;
      entry.posts += 1 + thread.replyCount;
      if (!entry.latest || thread.lastReplyAt > entry.latest.lastReplyAt) {
        entry.latest = thread;
      }
    }
    return map;
  }, [allThreads]);

  const filteredThreads = useMemo(() => {
    if (!allThreads) return null;
    const needle = query.trim().toLowerCase();
    const list = allThreads.filter((thread) => {
      if (activeBoard !== "all" && thread.category !== activeBoard) return false;
      if (!needle) return true;
      return (
        thread.title.toLowerCase().includes(needle) ||
        thread.author.toLowerCase().includes(needle) ||
        thread.lastReplyBy.toLowerCase().includes(needle) ||
        forumBoardMeta(thread.category).label.toLowerCase().includes(needle)
      );
    });
    return [...list].sort((a, b) => {
      if (sort === "replies") {
        return (
          b.replyCount - a.replyCount ||
          b.lastReplyAt.localeCompare(a.lastReplyAt)
        );
      }
      if (sort === "newest") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      return b.lastReplyAt.localeCompare(a.lastReplyAt);
    });
  }, [allThreads, activeBoard, query, sort]);

  const boardMeta =
    activeBoard === "all" ? null : forumBoardMeta(activeBoard);
  const newThreadHref =
    activeBoard === "all"
      ? "/forums/new"
      : `/forums/new?category=${activeBoard}`;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {boardMeta ? (
            <nav
              aria-label="Forum breadcrumb"
              className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"
            >
              <button
                type="button"
                onClick={() => openBoard("all")}
                className="text-amber-200 hover:underline"
              >
                Forums
              </button>
              <ChevronRight className="size-3.5" aria-hidden />
              <span>{boardMeta.label}</span>
            </nav>
          ) : null}
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
            {boardMeta ? boardMeta.label : "Dragonfire Forums"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {boardMeta
              ? boardMeta.description
              : "Recruit for your alliance, find a kingdom crew, and discuss formations, rallies, and Dragonfire strategy."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {boardMeta ? (
            <button
              type="button"
              onClick={() => openBoard("all")}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              All boards
            </button>
          ) : null}
          {user ? (
            <Link href={newThreadHref} className={cn(buttonVariants())}>
              <MessagesSquare />
              Post thread
            </Link>
          ) : (
            <Link
              href={accountHref(
                activeBoard === "all" ? "/forums" : `/forums?board=${activeBoard}`,
              )}
              className={cn(buttonVariants())}
            >
              Sign in to post
            </Link>
          )}
        </div>
      </header>

      {error ? (
        <ErrorState
          title="Forums did not load"
          detail={error}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      ) : null}

      {activeBoard === "all" && !error ? (
        <section aria-labelledby="forum-boards-heading" className="space-y-4">
          <h2 id="forum-boards-heading" className="sr-only">
            Forum boards
          </h2>
          {FORUM_SECTIONS.map((section) => {
            const boards = FORUM_BOARDS.filter(
              (board) => board.section === section.id,
            );
            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-xl surface ring-1 ring-foreground/15"
              >
                <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5">
                  <h3 className="font-heading text-sm tracking-wider text-amber-100 uppercase">
                    {section.title}
                  </h3>
                  <span className="hidden text-[11px] tracking-wider text-muted-foreground uppercase sm:block">
                    Threads · Posts · Latest
                  </span>
                </div>
                <ul className="divide-y divide-border/50">
                  {boards.map((board) => {
                    const Icon = BOARD_ICON[board.id];
                    const stat = boardStats.get(board.id);
                    const latest = stat?.latest ?? null;
                    return (
                      <li
                        key={board.id}
                        className="grid gap-2 px-4 py-3 transition hover:bg-muted/35 sm:grid-cols-[minmax(0,1fr)_8.5rem_14rem] sm:items-center sm:gap-4"
                      >
                        <button
                          type="button"
                          onClick={() => openBoard(board.id)}
                          className="flex min-w-0 items-start gap-3 text-left"
                        >
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-300 ring-1 ring-amber-400/25">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="font-heading block text-base tracking-wide text-amber-50 hover:text-amber-200">
                              {board.label}
                            </span>
                            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                              {board.description}
                            </span>
                          </span>
                        </button>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground sm:justify-center">
                          <span>
                            <strong className="text-num font-medium text-foreground">
                              {stat?.threads ?? 0}
                            </strong>{" "}
                            threads
                          </span>
                          <span>
                            <strong className="text-num font-medium text-foreground">
                              {stat?.posts ?? 0}
                            </strong>{" "}
                            posts
                          </span>
                        </div>
                        <div className="min-w-0 text-xs">
                          {latest ? (
                            <Link
                              href={`/forums/${latest.id}`}
                              className="block truncate font-medium text-amber-100 hover:underline"
                            >
                              {latest.title}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">
                              No threads yet
                            </span>
                          )}
                          {latest ? (
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {latest.lastReplyBy} ·{" "}
                              {formatWhen(latest.lastReplyAt)}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      ) : null}

      <section aria-labelledby="forum-threads-heading" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionLabel id="forum-threads-heading">
            {boardMeta ? `${boardMeta.label} threads` : "Recent threads"}
            {filteredThreads ? (
              <>
                {" · "}
                <span className="text-num">{filteredThreads.length}</span>
              </>
            ) : null}
          </SectionLabel>
          <div className="flex flex-wrap items-center gap-2">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Search threads"
              className="w-full sm:w-64"
              inputClassName="h-11 md:h-9"
            />
            <div className="flex items-center gap-1" role="group" aria-label="Sort threads">
              {(
                [
                  ["latest", "Latest reply"],
                  ["newest", "Newest"],
                  ["replies", "Most replies"],
                ] as const
              ).map(([mode, label]) => (
                <MiniChip
                  key={mode}
                  active={sort === mode}
                  onClick={() => setSort(mode)}
                >
                  {label}
                </MiniChip>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Board filter">
          <MiniChip
            active={activeBoard === "all"}
            onClick={() => openBoard("all")}
          >
            All boards
          </MiniChip>
          {FORUM_BOARDS.map((board) => (
            <MiniChip
              key={board.id}
              active={activeBoard === board.id}
              onClick={() => openBoard(board.id)}
            >
              {board.shortLabel}
            </MiniChip>
          ))}
        </div>

        {error ? null : filteredThreads == null ? (
          <CardListSkeleton rows={4} columns={1} label="Loading threads" />
        ) : filteredThreads.length === 0 ? (
          <EmptyState
            title={query.trim() ? "No matching threads" : "No threads in this board yet"}
            description={
              activeBoard === "recruitment"
                ? "Post your alliance name, kingdom, and requirements so players can join."
                : activeBoard === "lfa"
                  ? "Introduce your kingdom, main dragons, and schedule so alliances can recruit you."
                  : "Start the first thread for this board."
            }
            action={
              user ? (
                <Link href={newThreadHref} className={cn(buttonVariants())}>
                  Post thread
                </Link>
              ) : (
                <Link
                  href={accountHref(newThreadHref)}
                  className={cn(buttonVariants())}
                >
                  Register to post
                </Link>
              )
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl surface ring-1 ring-foreground/15">
            <div className="hidden grid-cols-[minmax(0,1fr)_6rem_13rem] gap-4 border-b border-border/60 bg-black/25 px-4 py-2 text-[11px] tracking-wider text-muted-foreground uppercase md:grid">
              <span>Topic</span>
              <span className="text-center">Replies</span>
              <span>Last post</span>
            </div>
            <ul className="divide-y divide-border/50">
              {filteredThreads.map((thread, index) => {
                const meta = forumBoardMeta(thread.category);
                return (
                  <li key={thread.id}>
                    {index === 3 ? (
                      <div className="border-b border-border/50 bg-black/15 px-3 py-2">
                        <AdSlot slot="feed" />
                      </div>
                    ) : null}
                    <Link
                      href={`/forums/${thread.id}`}
                      className="grid gap-2 px-4 py-3 transition hover:bg-muted/35 md:grid-cols-[minmax(0,1fr)_6rem_13rem] md:items-center md:gap-4"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          aria-hidden
                          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30"
                        >
                          {initialFor(thread.author)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-200 uppercase ring-1 ring-amber-400/30">
                              {meta.shortLabel}
                            </span>
                            <span className="font-heading min-w-0 text-[15px] tracking-wide text-foreground">
                              {thread.title}
                            </span>
                          </div>
                          {thread.line ? (
                            <div className="mt-1">
                              <TalkLineChip line={thread.line} />
                            </div>
                          ) : null}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Started by{" "}
                            <span className="text-amber-100/85">
                              {thread.author}
                            </span>{" "}
                            · {formatWhen(thread.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground md:justify-center">
                        <span className="text-num font-medium text-foreground">
                          {thread.replyCount}
                        </span>
                        <span className="md:hidden">
                          {thread.replyCount === 1 ? "reply" : "replies"}
                        </span>
                      </div>
                      <div className="min-w-0 text-xs text-muted-foreground">
                        <p className="truncate font-medium text-amber-100/85">
                          {thread.lastReplyBy}
                        </p>
                        <p className="truncate text-[11px]">
                          {formatWhen(thread.lastReplyAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
