"use client";

import { useState } from "react";
import Link from "next/link";
import { DragonIcon } from "@/components/dragon-icon";
import { StarVote } from "@/components/star-vote";
import { accountHref } from "@/components/account-gate";
import { talkNewHref } from "@/components/talk-line";
import { Button, buttonVariants } from "@/components/ui/button";
import { findDragon } from "@/lib/dragons";
import { modeShort, troopShort } from "@/lib/labels";
import type { BoardPublic } from "@/lib/boards";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

export function BoardListItem({
  board,
  nextPath = "/coach?build=1",
  onRate,
  onSeat,
}: {
  board: BoardPublic;
  nextPath?: string;
  onRate: (boardId: string, stars: number) => Promise<void>;
  onSeat: (board: BoardPublic) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const left = findDragon(board.left);
  const vanguard = findDragon(board.vanguard);
  const right = findDragon(board.right);

  return (
    <li className="border-b border-border/50 last:border-b-0">
      <div className="flex items-start gap-2 px-2 py-2">
        <button
          type="button"
          onClick={() => onSeat(board)}
          className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-muted/60"
        >
          <span className="flex shrink-0 items-center -space-x-2 pt-0.5">
            {[left, vanguard, right].map((dragon, index) =>
              dragon ? (
                <DragonIcon
                  key={`${dragon.id}-${index}`}
                  dragonId={dragon.id}
                  name={dragon.name}
                  rarity={dragon.rarity}
                  size="xs"
                />
              ) : null,
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-amber-50">
              {board.name}
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {troopShort[board.troop]} · {modeShort[board.mode]}
              {board.average != null
                ? ` · ${board.average.toFixed(1)}★ (${board.ratingCount})`
                : " · no ratings"}
            </span>
            <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted-foreground">
              {board.why}
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Hide review" : "Show review"}
          className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown
            className={cn("size-4 transition", open && "rotate-180")}
          />
        </button>
      </div>
      {open ? (
        <div className="space-y-2 border-t border-foreground/10 px-3 py-2">
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
            <Button size="sm" onClick={() => onSeat(board)}>
              Save team
            </Button>
            <Link
              href={talkNewHref(board.id)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Discuss in Forums
            </Link>
          </div>
          {board.comments.length > 0 ? (
            <ul className="space-y-1.5">
              {board.comments.slice(0, 3).map((comment) => (
                <li key={comment.id} className="text-[12px] leading-snug">
                  <span className="text-amber-100/80">{comment.username}</span>
                  <span className="text-muted-foreground"> · {comment.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-muted-foreground">No notes yet.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}
