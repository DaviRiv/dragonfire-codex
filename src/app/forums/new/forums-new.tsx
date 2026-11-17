"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MiniChip } from "@/components/chip";
import { TalkLineChip } from "@/components/talk-line";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { accountHref } from "@/components/account-gate";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { BoardPublic } from "@/lib/boards";
import { POST_MAX, TITLE_MAX, postError, titleError } from "@/lib/talk";
import {
  FORUM_BOARDS,
  FORUM_SECTIONS,
  forumBoardMeta,
  isTalkCategory,
  type TalkCategory,
  type TalkLine,
  type TalkThreadDetail,
} from "@/lib/talk-types";
import { toast } from "sonner";

function lineFromBoard(board: BoardPublic): TalkLine {
  return {
    name: board.name,
    troop: board.troop,
    mode: board.mode,
    left: board.left,
    vanguard: board.vanguard,
    right: board.right,
  };
}

export function ForumsNewPage() {
  const { ready, user } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const boardId = search.get("board")?.trim() || "";
  const rawCategory = search.get("category");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<TalkCategory>(() =>
    isTalkCategory(rawCategory) ? rawCategory : "recruitment",
  );
  const [line, setLine] = useState<TalkLine | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!boardId) return;
    void apiJson<{ board: BoardPublic }>(`/api/boards/${boardId}`)
      .then((data) => {
        setLine(lineFromBoard(data.board));
        setTitle(`How does ${data.board.name} actually play?`);
        if (data.board.mode === "rally") setCategory("rally");
        else if (data.board.mode === "defense") setCategory("defense");
        else if (data.board.mode === "pve") setCategory("pve");
        else if (data.board.mode === "gathering") setCategory("gathering");
        else setCategory("pvp");
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "Could not load that line.",
        );
      });
  }, [boardId]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Opening Forums…</p>;
  }
  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href={accountHref("/forums/new")} className="text-amber-200 hover:underline">
          Sign in
        </Link>{" "}
        to post a thread.
      </p>
    );
  }

  const activeBoard = forumBoardMeta(category);

  async function submit() {
    const err = titleError(title) ?? postError(body);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      const data = await apiJson<{ thread: TalkThreadDetail }>("/api/forums", {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          category,
          boardId: boardId || null,
          line,
        }),
      });
      toast.success("Thread posted.");
      router.push(`/forums/${data.thread.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/forums" className="text-amber-200 hover:underline">
            Forums
          </Link>{" "}
          / New thread
        </p>
        <h1 className="font-heading mt-1 text-2xl tracking-wide sm:text-3xl">
          Post a thread
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeBoard.description}
        </p>
      </div>
      {line ? (
        <div className="rounded-xl surface px-3 py-2 ring-1 ring-foreground/10">
          <p className="text-label">Attached line</p>
          <TalkLineChip line={line} />
        </div>
      ) : null}
      <form
        className="space-y-4 rounded-xl surface p-4 ring-1 ring-foreground/15"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-2">
          <p className="text-label">Board</p>
          {FORUM_SECTIONS.map((section) => (
            <div key={section.id} className="space-y-1">
              <p className="text-xs text-muted-foreground">{section.title}</p>
              <div className="flex flex-wrap gap-1">
                {FORUM_BOARDS.filter((board) => board.section === section.id).map(
                  (board) => (
                    <MiniChip
                      key={board.id}
                      active={category === board.id}
                      onClick={() => setCategory(board.id)}
                    >
                      {board.label}
                    </MiniChip>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="forum-title">Thread title</Label>
          <Input
            id="forum-title"
            value={title}
            maxLength={TITLE_MAX}
            placeholder={activeBoard.titlePlaceholder}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="forum-body">Opening post</Label>
          <Textarea
            id="forum-body"
            value={body}
            maxLength={POST_MAX}
            rows={8}
            placeholder={activeBoard.bodyPlaceholder}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={busy}>
            Post thread
          </Button>
          <Link
            href="/forums"
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
