"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { AccountGate } from "@/components/account-gate";
import { BetaBadge } from "@/components/beta-badge";
import { ChatGptExportBar } from "@/components/chatgpt-export";
import { CoachFormation } from "@/components/coach-formation";
import { MiniChip } from "@/components/chip";
import { Disclosure } from "@/components/disclosure";
import { MetaCard } from "@/components/meta-card";
import { TroopIcon } from "@/components/troop-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  contextLineup,
  useCoachChat,
} from "@/app/coach/use-coach-chat";
import { COACH_STARTERS, lineupFromAiLine } from "@/lib/ai/coach";
import type { ChatErrorKind, ChatTurn } from "@/lib/ai/conversation";
import { chatgptCoachExport, chatgptExportFilename } from "@/lib/ai/export";
import { makeSuggestRequest, type AiLine } from "@/lib/ai/prompt";
import { collectRoster } from "@/lib/ai/roster";
import { rememberBuild } from "@/lib/build-session";
import { newId, nowIso } from "@/lib/dragons";
import { modeLabels, troopLabels } from "@/lib/labels";
import { usePit } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ArrowDown, RotateCcw, Send, Square } from "lucide-react";
import { toast } from "sonner";

/** How close to the bottom still counts as "following along". */
const STICK_PX = 96;
const DRAFT_LIMIT = 2000;

export function CoachPage() {
  const { ready, state, loadSample, addLineup } = usePit();
  const chat = useCoachChat();
  const pool = chat.pool;

  const [draft, setDraft] = useState("");
  const [atBottom, setAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const atBottomRef = useRef(true);

  const lineup = useMemo(
    () => contextLineup(state.lineups, pool),
    [state.lineups, pool],
  );
  const roster = useMemo(
    () => collectRoster(state, lineup, pool),
    [state, lineup, pool],
  );

  useDevFailureSeam(chat.failNext);

  const scrollToEnd = useCallback((behavior: ScrollBehavior = "auto") => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  const onScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const near =
      node.scrollHeight - node.scrollTop - node.clientHeight <= STICK_PX;
    atBottomRef.current = near;
    setAtBottom(near);
  }, []);

  // Follow the conversation only while the player is already at the bottom, so
  // reading an older answer is never yanked away.
  useLayoutEffect(() => {
    if (atBottomRef.current) scrollToEnd();
  }, [chat.turns, scrollToEnd]);

  function submit(text: string) {
    if (!chat.send(text)) return;
    setDraft("");
    atBottomRef.current = true;
    setAtBottom(true);
    requestAnimationFrame(() => {
      scrollToEnd("smooth");
      inputRef.current?.focus();
    });
  }

  function seat(line: AiLine) {
    const filled = lineupFromAiLine(line, state, pool);
    if (!filled.slots.left || !filled.slots.vanguard || !filled.slots.right) {
      toast.error("Could not fill all three seats from that line.");
      return;
    }
    const created = { ...filled, id: newId("lineup"), updatedAt: nowIso() };
    addLineup(created);
    rememberBuild(created.kind, created.id);
    toast.success(`Seated ${line.name} on Team.`);
  }

  const buildExport = useCallback(
    () =>
      chatgptCoachExport({
        request: makeSuggestRequest(lineup, state, pool, roster),
        turns: chat.turns
          .filter((turn) => turn.status === "done")
          .map((turn) => ({ role: turn.role, text: turn.text })),
        draft,
      }),
    [chat.turns, draft, lineup, state, pool, roster],
  );

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Opening Copilot…</p>;
  }

  const thin = roster.length < 3;
  const overLimit = draft.length > DRAFT_LIMIT;
  const lastAnswer = [...chat.turns]
    .reverse()
    .find((turn) => turn.role === "assistant" && turn.status === "done");

  return (
    <AccountGate
      next="/coach"
      title="Copilot (beta) is for registered accounts"
      description="Create a free username on this server to rank three-dragon lines. This ranker is in beta. Team and Talk stay readable without signing in."
    >
      {/* A chat column reads better than the full workspace width. */}
      <div className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 flex-col gap-2">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-heading inline-flex items-center gap-2 text-xl tracking-wide sm:text-2xl">
            Copilot
            <BetaBadge className="h-5 px-2 text-[10px]" />
          </h1>
          <div className="flex flex-wrap items-center gap-1">
            <MiniChip
              active={pool === "pit"}
              onClick={() => chat.setPool("pit")}
              title="Rank using only dragons you own"
            >
              Owned · {state.owned.length}
            </MiniChip>
            <MiniChip
              active={pool === "hatchery"}
              onClick={() => chat.setPool("hatchery")}
              title="Rank using every dragon in the game"
            >
              All
            </MiniChip>
          </div>
          <div className="ms-auto flex items-center gap-1">
            {chat.turns.length > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  chat.reset();
                  setDraft("");
                  inputRef.current?.focus();
                }}
                data-coach-new
              >
                <RotateCcw data-icon="inline-start" />
                New chat
              </Button>
            ) : null}
          </div>
        </header>

        <CopilotContextLine
          pool={pool}
          rosterCount={roster.length}
          last={lastAnswer}
        />

        <Disclosure title="About this ranker, and the ChatGPT paste">
          <p className="text-[13px] leading-snug text-muted-foreground">
            A local ranker for three-dragon lines — same rules as Suggest, with
            no OpenAI call in the chat itself. Optional{" "}
            <strong className="font-medium text-foreground">Ask ChatGPT</strong>{" "}
            below uses a server key when configured. This is not the team
            builder.{" "}
            <Link href="/team" className="text-amber-200 hover:underline">
              Pick a dragon on Team
            </Link>{" "}
            to compare complete lines built around one name. Copilot remembers
            this conversation, so you can follow up with “what about cavalry?”
            or “give me another one”.
          </p>
          <div className="mt-2">
            <MetaCard />
          </div>
          <div className="mt-2">
            <ChatGptExportBar
              build={buildExport}
              filename={chatgptExportFilename("coach", pool)}
              disabled={roster.length === 0}
            />
          </div>
        </Disclosure>

        {thin ? (
          <div className="rounded-2xl surface px-3 py-2 ring-1 ring-amber-400/30">
            <p className="text-[13px] leading-snug">
              {pool === "pit"
                ? "Copilot needs at least three owned dragons before it can seat a line."
                : "The full dragon list did not load three names."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={loadSample}>
                Load sample pit
              </Button>
              <Link
                href="/pit"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                Mark what you own
              </Link>
              {pool === "pit" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => chat.setPool("hatchery")}
                >
                  Use All instead
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            data-coach-scroll
            role="log"
            tabIndex={0}
            aria-label="Conversation with Copilot"
            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pe-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {chat.turns.length === 0 ? (
              <Starters onPick={submit} />
            ) : (
              chat.turns.map((turn) => (
                <Turn
                  key={turn.id}
                  turn={turn}
                  state={state}
                  pool={pool}
                  onSeat={seat}
                  onRetry={chat.retry}
                />
              ))
            )}
          </div>

          {atBottom ? null : (
            <button
              type="button"
              onClick={() => scrollToEnd("smooth")}
              className="absolute inset-x-0 bottom-2 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-stone-900 px-3 py-1.5 text-xs text-amber-50 ring-1 ring-amber-400/40 shadow-lg"
            >
              <ArrowDown className="size-3.5" />
              Jump to latest
            </button>
          )}
        </div>

        {/* The transcript itself is a log region, so this only reports state. */}
        <p aria-live="polite" className="sr-only">
          {chat.busy ? "Copilot is working on your answer." : ""}
        </p>

        <form
          className="flex shrink-0 items-end gap-2 border-t border-border/50 pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (overLimit) return;
            submit(draft);
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="coach-input" className="sr-only">
              Ask Copilot about a formation
            </label>
            <Textarea
              id="coach-input"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask for a formation, or follow up…"
              className="max-h-40 min-h-12 w-full"
              rows={2}
              aria-describedby={overLimit ? "coach-input-limit" : undefined}
              aria-invalid={overLimit || undefined}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (overLimit) return;
                  submit(draft);
                }
              }}
            />
            {draft.length > DRAFT_LIMIT - 400 ? (
              <p
                id="coach-input-limit"
                className={cn(
                  "mt-1 text-xs",
                  overLimit ? "text-red-300" : "text-muted-foreground",
                )}
              >
                {draft.length} / {DRAFT_LIMIT} characters
                {overLimit ? " — trim it before sending." : ""}
              </p>
            ) : null}
          </div>
          {chat.busy ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => chat.cancel()}
              aria-label="Stop generating"
              data-coach-stop
            >
              <Square />
            </Button>
          ) : null}
          <Button
            type="submit"
            size="icon"
            disabled={draft.trim().length === 0 || overLimit}
            aria-label="Send"
            data-coach-send
          >
            <Send />
          </Button>
        </form>
      </div>
    </AccountGate>
  );
}

function CopilotContextLine({
  pool,
  rosterCount,
  last,
}: {
  pool: "pit" | "hatchery";
  rosterCount: number;
  last?: ChatTurn;
}) {
  const meta = last?.meta;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>
        Reading {rosterCount}{" "}
        {pool === "pit" ? "owned dragons" : "dragons (full list)"}
      </span>
      {meta ? (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <TroopIcon troop={meta.troop} className="size-3.5" />
            {troopLabels[meta.troop]} · {modeLabels[meta.mode]}
          </span>
        </>
      ) : null}
      {meta?.skipped.length ? (
        <>
          <span aria-hidden>·</span>
          <span>Holding back {meta.skipped.join(", ")}</span>
        </>
      ) : null}
      <span aria-hidden>·</span>
      <Link href="/pit" className="text-amber-200 hover:underline">
        Edit pit
      </Link>
    </p>
  );
}

function Starters({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="rounded-2xl bg-card/40 px-3 py-4 ring-1 ring-foreground/10">
      <p className="text-sm text-muted-foreground">
        Ask anything about a three-dragon line. Try one of these, then follow up
        in your own words.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {COACH_STARTERS.map((starter) => (
          <button
            key={starter}
            type="button"
            className="rounded-xl px-3 py-2 text-left text-[13px] leading-snug ring-1 ring-foreground/15 hover:bg-muted"
            onClick={() => onPick(starter)}
          >
            {starter}
          </button>
        ))}
      </div>
    </div>
  );
}

function Turn({
  turn,
  state,
  pool,
  onSeat,
  onRetry,
}: {
  turn: ChatTurn;
  state: ReturnType<typeof usePit>["state"];
  pool: "pit" | "hatchery";
  onSeat: (line: AiLine) => void;
  onRetry: (requestId: string) => void;
}) {
  if (turn.role === "user") {
    return (
      <div
        data-turn="user"
        className="ms-auto w-fit max-w-[min(40rem,85%)] rounded-2xl bg-amber-500/20 px-3 py-2 text-[13px] leading-snug break-words whitespace-pre-wrap text-amber-50"
      >
        {turn.text}
      </div>
    );
  }

  if (turn.status === "pending") {
    return (
      <div
        data-turn="pending"
        className="flex w-fit items-center gap-2 rounded-2xl surface px-3 py-2 text-[13px] text-muted-foreground ring-1 ring-foreground/10"
      >
        <span className="flex gap-1" aria-hidden>
          <Dot delay="0ms" />
          <Dot delay="150ms" />
          <Dot delay="300ms" />
        </span>
        Reading your pit…
      </div>
    );
  }

  if (turn.status === "error" || turn.status === "cancelled") {
    const failed = turn.status === "error";
    return (
      <div
        data-turn={failed ? "error" : "cancelled"}
        className={cn(
          "w-fit max-w-[min(40rem,90%)] rounded-2xl px-3 py-2 text-[13px] leading-snug ring-1",
          failed
            ? "bg-red-500/10 text-red-100 ring-red-400/40"
            : "surface text-muted-foreground ring-foreground/10",
        )}
        role={failed ? "alert" : undefined}
      >
        <p className="break-words">
          {turn.error?.message ?? "Something went wrong. Try again."}
        </p>
        {turn.error?.retryable !== false ? (
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => onRetry(turn.requestId)}
            data-coach-retry
          >
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div data-turn="assistant" className="space-y-2">
      <div className="w-fit max-w-[min(44rem,95%)] rounded-2xl surface px-3 py-2 text-[13px] leading-snug break-words whitespace-pre-wrap ring-1 ring-foreground/10">
        {turn.text}
      </div>
      {turn.lines?.length ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {turn.lines.slice(0, 3).map((line, index) => (
            <CoachFormation
              key={`${turn.id}-${index}-${line.left}-${line.vanguard}-${line.right}`}
              line={line}
              state={state}
              pool={pool}
              onSeat={onSeat}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-1.5 animate-bounce rounded-full bg-amber-300/80 motion-reduce:animate-none"
      style={{ animationDelay: delay }}
    />
  );
}

/**
 * `?fail=timeout` makes the next answer fail once, so the error and retry path
 * can be exercised end to end. Development only — never wired in a build.
 */
const FAIL_KINDS: ChatErrorKind[] = [
  "network",
  "server",
  "timeout",
  "invalid",
  "rate-limit",
  "auth",
  "unknown",
];

function useDevFailureSeam(failNext: (kind: ChatErrorKind) => void) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const requested = new URLSearchParams(window.location.search).get("fail");
    const kind = FAIL_KINDS.find((item) => item === requested);
    if (kind) failNext(kind);
  }, [failNext]);
}
