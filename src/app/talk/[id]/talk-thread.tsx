"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  talkCategoryLabels,
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

export function TalkThreadPage({ id }: { id: string }) {
  const { user } = useAuth();
  const [thread, setThread] = useState<TalkThreadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiJson<{ thread: TalkThreadDetail }>(`/api/talk/${id}`);
      setThread(data.thread);
    } catch (err) {
      setThread(null);
      setError(err instanceof Error ? err.message : "Could not open thread.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reply() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      const data = await apiJson<{ thread: TalkThreadDetail }>(
        `/api/talk/${id}/replies`,
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
          <Link href="/talk" className="text-amber-200 hover:underline">
            Back to Talk
          </Link>
        }
      />
    );
  }
  if (!thread) {
    return <p className="text-sm text-muted-foreground">Opening thread…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link href="/talk" className="text-amber-200 hover:underline">
          Talk
        </Link>
        {" · "}
        {talkCategoryLabels[thread.category]}
      </p>
      <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
        {thread.title}
      </h1>
      {thread.line ? (
        <div className="rounded-2xl bg-card/70 px-3 py-2 ring-1 ring-foreground/10">
          <TalkLineChip line={thread.line} />
        </div>
      ) : null}
      <article className="rounded-2xl bg-card/70 px-3 py-3 ring-1 ring-foreground/10 sm:px-4">
        <p className="text-[11px] tracking-wide text-amber-100/80 uppercase">
          {thread.author}
          <span className="ml-2 font-sans font-normal tracking-normal text-muted-foreground normal-case">
            {formatWhen(thread.createdAt)}
          </span>
        </p>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
          {thread.body}
        </p>
      </article>
      <AdSlot slot="feed" className="flex justify-center" />
      <div className="space-y-2">
        <p className="text-label">
          Replies · {thread.replyCount}
        </p>
        {thread.replies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No replies yet. If you marched this line, say how it died.
          </p>
        ) : (
          thread.replies.map((replyRow) => (
            <article
              key={replyRow.id}
              className="rounded-2xl bg-black/25 px-3 py-3 ring-1 ring-foreground/10"
            >
              <p className="text-[11px] tracking-wide text-amber-100/80 uppercase">
                {replyRow.username}
                <span className="ml-2 font-sans font-normal tracking-normal text-muted-foreground normal-case">
                  {formatWhen(replyRow.createdAt)}
                </span>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed">
                {replyRow.text}
              </p>
            </article>
          ))
        )}
      </div>
      {user ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void reply();
          }}
        >
          <Textarea
            value={draft}
            maxLength={POST_MAX}
            rows={4}
            placeholder="Reply — stars you used, troop, and whether the soak actually held."
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" disabled={busy || !draft.trim()}>
            Post reply
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link
            href={accountHref(`/talk/${id}`)}
            className="text-amber-200 hover:underline"
          >
            Sign in
          </Link>{" "}
          to reply.
        </p>
      )}
    </div>
  );
}
