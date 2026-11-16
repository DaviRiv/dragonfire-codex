"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdSlot } from "@/components/ad-slot";
import { accountHref } from "@/components/account-gate";
import { MiniChip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { CardListSkeleton } from "@/components/skeleton";
import { ChipRow } from "@/components/filter-bar";
import { SectionLabel } from "@/components/section-label";
import { TalkThreadCard } from "@/components/talk-thread-card";
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

export function TalkListPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<TalkCategory | "all">("all");
  // Bumped by Try again, so a failed load is recoverable without a reload.
  const [attempt, setAttempt] = useState(0);
  // Tagged with the request it answers, so switching category reads as loading
  // without a second render to clear the previous category's threads.
  const [result, setResult] = useState<{
    key: string;
    threads?: TalkThreadSummary[];
    error?: string;
  } | null>(null);

  const key = `${category}:${attempt}`;
  const current = result?.key === key ? result : null;
  const threads = current?.threads ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    let cancelled = false;
    const query = category === "all" ? "" : `?category=${category}`;
    void apiJson<{ threads: TalkThreadSummary[] }>(`/api/talk${query}`)
      .then((data) => {
        if (!cancelled) setResult({ key, threads: data.threads });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({
            key,
            error: err instanceof Error ? err.message : "Could not load Talk.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [category, key]);

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

      <ChipRow label="Category">
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
      </ChipRow>

      {error ? (
        <ErrorState
          title="Talk did not load"
          detail={error}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      ) : threads == null ? (
        <CardListSkeleton rows={3} columns={1} label="Loading threads" />
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
        <section aria-labelledby="talk-threads">
          <SectionLabel id="talk-threads" className="mb-2">
            {category === "all" ? "All threads" : talkCategoryLabels[category]}{" "}
            · <span className="text-num">{threads.length}</span>
          </SectionLabel>
          <ul className="space-y-2">
            {threads.map((thread, index) => (
              <li key={thread.id}>
                {index === 2 ? (
                  <div className="mb-2 flex justify-center">
                    <AdSlot slot="feed" />
                  </div>
                ) : null}
                <TalkThreadCard thread={thread} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
