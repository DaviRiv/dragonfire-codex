"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdSlot } from "@/components/ad-slot";
import { accountHref } from "@/components/account-gate";
import { MiniChip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { TalkLineChip } from "@/components/talk-line";
import { buttonVariants } from "@/components/ui/button";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  TALK_CATEGORIES,
  talkCategoryLabels,
  type TalkCategory,
  type TalkThreadSummary,
} from "@/lib/talk-types";
import { cn } from "@/lib/utils";
import { MessagesSquare } from "lucide-react";

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

export function TalkListPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<TalkCategory | "all">("all");
  const [threads, setThreads] = useState<TalkThreadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setThreads(null);
    setError(null);
    const query = category === "all" ? "" : `?category=${category}`;
    void apiJson<{ threads: TalkThreadSummary[] }>(`/api/talk${query}`)
      .then((data) => {
        if (!cancelled) setThreads(data.threads);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load Talk.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
            Talk
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            A message board for three-dragon lines. Read without an account.
            Register to start a thread or reply.
          </p>
        </div>
        {user ? (
          <Link href="/talk/new" className={cn(buttonVariants())}>
            <MessagesSquare />
            New thread
          </Link>
        ) : (
          <Link
            href={accountHref("/talk")}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Sign in to post
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        <MiniChip
          active={category === "all"}
          onClick={() => setCategory("all")}
        >
          All
        </MiniChip>
        {TALK_CATEGORIES.map((item) => (
          <MiniChip
            key={item}
            active={category === item}
            onClick={() => setCategory(item)}
          >
            {talkCategoryLabels[item]}
          </MiniChip>
        ))}
      </div>

      {error ? (
        <EmptyState title="Talk is quiet" description={error} />
      ) : threads == null ? (
        <p className="text-sm text-muted-foreground">Opening Talk…</p>
      ) : threads.length === 0 ? (
        <EmptyState
          title="No threads yet"
          description="Start one about a PvP core, a spear rally, or a soak when Vhagar is busy."
          action={
            user ? (
              <Link href="/talk/new" className={cn(buttonVariants())}>
                New thread
              </Link>
            ) : (
              <Link
                href={accountHref("/talk")}
                className={cn(buttonVariants())}
              >
                Register to post
              </Link>
            )
          }
        />
      ) : (
        <ul className="space-y-2">
          {threads.map((thread, index) => (
            <li key={thread.id}>
              {index === 2 ? (
                <div className="mb-2 flex justify-center">
                  <AdSlot slot="feed" />
                </div>
              ) : null}
              <Link
                href={`/talk/${thread.id}`}
                className="block rounded-2xl bg-card/70 px-3 py-3 ring-1 ring-foreground/10 hover:bg-muted/50 sm:px-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="rounded-full px-2 py-0.5 text-[11px] tracking-wide text-amber-100 ring-1 ring-amber-400/35">
                    {talkCategoryLabels[thread.category]}
                  </span>
                  <h2 className="font-heading min-w-0 flex-1 text-base tracking-wide">
                    {thread.title}
                  </h2>
                </div>
                {thread.line ? (
                  <div className="mt-1">
                    <TalkLineChip line={thread.line} />
                  </div>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {thread.author} · {thread.replyCount}{" "}
                  {thread.replyCount === 1 ? "reply" : "replies"} · last{" "}
                  {formatWhen(thread.lastReplyAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
