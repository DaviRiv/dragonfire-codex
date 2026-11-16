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
  TALK_CATEGORIES,
  talkCategoryLabels,
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

export function TalkNewPage() {
  const { ready, user } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const boardId = search.get("board")?.trim() || "";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<TalkCategory>("pvp");
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
    return <p className="text-sm text-muted-foreground">Opening Talk…</p>;
  }
  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href={accountHref("/talk/new")} className="text-amber-200 hover:underline">
          Sign in
        </Link>{" "}
        to start a thread.
      </p>
    );
  }

  async function submit() {
    const err = titleError(title) ?? postError(body);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      const data = await apiJson<{ thread: TalkThreadDetail }>("/api/talk", {
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
      router.push(`/talk/${data.thread.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
          New thread
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Name the line, the troop, and what you want people to argue about.
        </p>
      </div>
      {line ? (
        <div className="rounded-2xl surface px-3 py-2 ring-1 ring-foreground/10">
          <p className="text-label">Attached line</p>
          <TalkLineChip line={line} />
        </div>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-wrap gap-1">
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
        <div className="space-y-1.5">
          <Label htmlFor="talk-title">Title</Label>
          <Input
            id="talk-title"
            value={title}
            maxLength={TITLE_MAX}
            placeholder="e.g. Malachite / Vhagar / Venator on Shields — still the online core?"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="talk-body">First post</Label>
          <Textarea
            id="talk-body"
            value={body}
            maxLength={POST_MAX}
            rows={8}
            placeholder="Stars, troop, who died first, whether Burn on Vhagar was a trap…"
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy}>
          Post thread
        </Button>
      </form>
    </div>
  );
}
