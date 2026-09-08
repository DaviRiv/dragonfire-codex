"use client";

import { useState } from "react";
import Link from "next/link";
import { FormationBoard } from "@/components/formation-board";
import { StarVote } from "@/components/star-vote";
import { accountHref } from "@/components/account-gate";
import { talkNewHref } from "@/components/talk-line";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { pairingReport } from "@/lib/pairing";
import { lineupFromBoard, type BoardPublic } from "@/lib/boards";
import { COMMENT_MAX } from "@/lib/account";
import { useAuth } from "@/lib/auth";
import { usePit } from "@/lib/store";
import { rememberBuild } from "@/lib/build-session";
import { newId, nowIso } from "@/lib/dragons";
import { lineupFromAiLine } from "@/lib/ai/coach";
import { cn } from "@/lib/utils";
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

export function BoardCard({
  board,
  nextPath = "/team",
  onRate,
  onComment,
  onSeated,
}: {
  board: BoardPublic;
  nextPath?: string;
  onRate: (boardId: string, stars: number) => Promise<void>;
  onComment: (boardId: string, text: string) => Promise<void>;
  onSeated?: () => void;
}) {
  const { user } = useAuth();
  const { state, addLineup } = usePit();
  const [open, setOpen] = useState(board.comments.length > 0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const lineup = lineupFromBoard(board);
  const pairing = pairingReport(lineup, state);

  function seat() {
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
    onSeated?.();
  }

  async function submitComment() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await onComment(board.id, text);
      setDraft("");
      setOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormationBoard lineup={lineup} state={state} buffs={pairing.buffs} compact>
      <p className="text-[13px] leading-snug text-amber-50/90">{board.why}</p>
      <StarVote
        value={board.myRating}
        average={board.average}
        count={board.ratingCount}
        disabled={!user}
        signInHref={user ? undefined : accountHref(nextPath)}
        onChange={(stars) => {
          if (!user) return;
          void onRate(board.id, stars).catch((error: unknown) => {
            toast.error(
              error instanceof Error ? error.message : "Could not rate.",
            );
          });
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={seat}>
          Seat on Team
        </Button>
        <Link
          href={talkNewHref(board.id)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Discuss in Talk
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen((value) => !value)}
        >
          Notes{board.comments.length ? ` (${board.comments.length})` : ""}
        </Button>
      </div>
      {open ? (
        <div className="space-y-2 border-t border-foreground/10 pt-2">
          {board.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notes yet. Be the first to say how this line actually played.
            </p>
          ) : (
            <ul className="space-y-2">
              {board.comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-xl bg-black/25 px-3 py-2 ring-1 ring-foreground/10"
                >
                  <p className="text-[11px] tracking-wide text-amber-100/80 uppercase">
                    {comment.username}
                    <span className="ml-2 font-sans font-normal tracking-normal text-muted-foreground normal-case">
                      {formatWhen(comment.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 text-[13px] leading-snug">{comment.text}</p>
                </li>
              ))}
            </ul>
          )}
          {user ? (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                void submitComment();
              }}
            >
              <Textarea
                value={draft}
                maxLength={COMMENT_MAX}
                rows={3}
                placeholder="How did this line play? Troop losses, who died first, what you would change…"
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
                Post note
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link
                href={accountHref(nextPath)}
                className="text-amber-200 underline-offset-2 hover:underline"
              >
                Sign in
              </Link>{" "}
              to leave a note.
            </p>
          )}
        </div>
      ) : null}
    </FormationBoard>
  );
}
