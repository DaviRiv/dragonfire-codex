"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, CornerDownRight } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { accountHref } from "@/components/account-gate";
import { EmptyState } from "@/components/empty-state";
import { TalkLineChip } from "@/components/talk-line";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { POST_MAX } from "@/lib/talk";
import {
  forumBoardMeta,
  type TalkThreadDetail,
} from "@/lib/talk-types";
import { toast } from "sonner";

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

export function ForumsThreadPage({ id }: { id: string }) {
  const { user } = useAuth();
  const [thread, setThread] = useState<TalkThreadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(() => {
    let cancelled = false;
    void apiJson<{ thread: TalkThreadDetail }>(`/api/forums/${id}`)
      .then((data) => {
        if (cancelled) return;
        setThread(data.thread);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setThread(null);
        setError(err instanceof Error ? err.message : "Could not open thread.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(load, [load]);

  function quote(author: string, text: string) {
    const excerpt = text.trim().split("\n").slice(0, 3).join("\n> ");
    const addition = `> @${author} wrote:\n> ${excerpt}\n\n`;
    setDraft((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${addition}` : addition));
    replyRef.current?.focus();
    replyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function reply() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      const data = await apiJson<{ thread: TalkThreadDetail }>(
        `/api/forums/${id}/replies`,
        {
          method: "POST",
          body: JSON.stringify({ text: draft }),
        },
      );
      setThread(data.thread);
      setDraft("");
      toast.success("Reply posted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reply.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <EmptyState
        title="Thread missing"
        description={error}
        action={
          <Link href="/forums" className="text-amber-200 hover:underline">
            Back to Forums
          </Link>
        }
      />
    );
  }
  if (!thread) {
    return <p className="text-sm text-muted-foreground">Opening thread…</p>;
  }

  const board = forumBoardMeta(thread.category);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <nav
        aria-label="Forum breadcrumb"
        className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
      >
        <Link href="/forums" className="text-amber-200 hover:underline">
          Forums
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link
          href={`/forums?board=${thread.category}`}
          className="text-amber-200 hover:underline"
        >
          {board.label}
        </Link>
      </nav>

      <header className="space-y-1 border-b border-border/60 pb-3">
        <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
          {thread.title}
        </h1>
        <p className="text-xs text-muted-foreground">
          Started by <span className="text-amber-100">{thread.author}</span> ·{" "}
          {formatWhen(thread.createdAt)} · {thread.replyCount}{" "}
          {thread.replyCount === 1 ? "reply" : "replies"}
        </p>
      </header>

      <div className="space-y-3">
        <PostBit
          postNumber={1}
          author={thread.author}
          roleLabel="Thread starter"
          createdAt={thread.createdAt}
          body={thread.body}
          line={thread.line}
          canQuote={Boolean(user)}
          onQuote={() => quote(thread.author, thread.body)}
        />

        <AdSlot slot="feed" className="flex justify-center" />

        {thread.replies.map((replyRow, index) => (
          <PostBit
            key={replyRow.id}
            postNumber={index + 2}
            author={replyRow.username}
            roleLabel={replyRow.username === thread.author ? "OP" : "Member"}
            createdAt={replyRow.createdAt}
            body={replyRow.text}
            canQuote={Boolean(user)}
            onQuote={() => quote(replyRow.username, replyRow.text)}
          />
        ))}
      </div>

      {user ? (
        <form
          className="space-y-2 rounded-xl surface p-4 ring-1 ring-foreground/15"
          onSubmit={(event) => {
            event.preventDefault();
            void reply();
          }}
        >
          <p className="text-label">Post reply</p>
          <Textarea
            ref={replyRef}
            value={draft}
            maxLength={POST_MAX}
            rows={4}
            placeholder={
              thread.category === "recruitment" || thread.category === "lfa"
                ? "Reply with your kingdom, in-game handle, or Discord…"
                : "Write a reply…"
            }
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" disabled={busy || !draft.trim()}>
            Post reply
          </Button>
        </form>
      ) : (
        <p className="rounded-xl surface px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">
          <Link
            href={accountHref(`/forums/${id}`)}
            className="text-amber-200 hover:underline"
          >
            Sign in
          </Link>{" "}
          to reply or quote posts.
        </p>
      )}
    </div>
  );
}

function PostBit({
  postNumber,
  author,
  roleLabel,
  createdAt,
  body,
  line,
  canQuote,
  onQuote,
}: {
  postNumber: number;
  author: string;
  roleLabel: string;
  createdAt: string;
  body: string;
  line?: TalkThreadDetail["line"];
  canQuote: boolean;
  onQuote: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl surface ring-1 ring-foreground/15 sm:grid sm:grid-cols-[11rem_minmax(0,1fr)]">
      <div className="flex items-center gap-3 border-b border-border/50 bg-black/25 px-4 py-3 sm:flex-col sm:items-start sm:border-r sm:border-b-0">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-heading text-sm text-amber-200 ring-1 ring-amber-400/35"
        >
          {initialFor(author)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-amber-100">
            {author}
          </p>
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            {roleLabel}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-between p-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 text-xs text-muted-foreground">
            <span>{formatWhen(createdAt)}</span>
            <span className="text-num font-mono text-[11px]">#{postNumber}</span>
          </div>
          {line ? (
            <div className="rounded-lg bg-black/25 px-3 py-2 ring-1 ring-foreground/10">
              <TalkLineChip line={line} />
            </div>
          ) : null}
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/95">
            {body}
          </p>
        </div>
        {canQuote ? (
          <div className="mt-3 flex justify-end border-t border-border/30 pt-2">
            <button
              type="button"
              onClick={onQuote}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-amber-200"
            >
              <CornerDownRight className="size-3.5" />
              Quote
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
