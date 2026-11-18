"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { CoachTeamBuilderButton } from "@/app/coach/coach-team-builder";
import { FocusPanel } from "@/app/coach/focus-panel";
import { ArmyAutoBuilder } from "@/components/army-auto-builder";
import { AccountGate } from "@/components/account-gate";
import { BetaBadge } from "@/components/beta-badge";
import { ChatGptExportBar } from "@/components/chatgpt-export";
import { CoachFormation } from "@/components/coach-formation";
import { Disclosure } from "@/components/disclosure";
import { MetaCard } from "@/components/meta-card";
import { SectionLabel } from "@/components/section-label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  contextLineup,
  useCoachChat,
} from "@/app/coach/use-coach-chat";
import { getCatalogDragon } from "@/data/dragons";
import { COACH_STARTERS, lineupFromAiLine } from "@/lib/ai/coach";
import type { ChatErrorKind, ChatTurn } from "@/lib/ai/conversation";
import { chatgptCoachExport, chatgptExportFilename } from "@/lib/ai/export";
import { makeSuggestRequest, type AiLine } from "@/lib/ai/prompt";
import { collectRoster, type AiPool } from "@/lib/ai/roster";
import { rememberBuild } from "@/lib/build-session";
import { newId, nowIso } from "@/lib/dragons";
import {
  focusConfigKey,
  focusSuggestions,
  type FocusConfig,
} from "@/lib/focus-suggest";
import { TROOP_TYPES, modeLabels, slotShort, troopLabels } from "@/lib/labels";
import { MAX_PIT_TEAMS, pitLineups, usedOnPitTeams } from "@/lib/pit-teams";
import { usePit } from "@/lib/store";
import { useOpenAiAvailable } from "@/lib/use-openai-available";
import type { TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ChevronDown,
  RotateCcw,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { toast } from "sonner";

/** How close to the bottom still counts as "following along". */
const STICK_PX = 96;
const DRAFT_LIMIT = 2000;

export function CoachPage() {
  const { ready, state, addLineup } = usePit();
  const chat = useCoachChat();
  const openAi = useOpenAiAvailable();
  const pool = chat.pool;
  const anchor = chat.anchor;

  const [draft, setDraft] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const [generatedConfig, setGeneratedConfig] = useState<FocusConfig | null>(
    null,
  );
  const [resultsOpen, setResultsOpen] = useState(true);
  const [generating, startGenerating] = useTransition();

  const resultsRef = useRef<HTMLElement>(null);
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

  const ownedStars = useMemo(
    () => new Map(state.owned.map((row) => [row.dragonId, row.starRank] as const)),
    [state.owned],
  );
  const usedTeams = useMemo(() => usedOnPitTeams(state), [state]);
  const savedPitCount = useMemo(() => pitLineups(state).length, [state]);
  const availablePitCount = useMemo(
    () => state.owned.filter((row) => !usedTeams.has(row.dragonId)).length,
    [state.owned, usedTeams],
  );

  const anchorDragon = anchor.dragonId
    ? getCatalogDragon(anchor.dragonId) ?? null
    : null;

  const activeTroop =
    anchor.troop === "auto"
      ? (anchorDragon?.affinities.find((troop) =>
          anchor.allowedTroops.includes(troop),
        ) ??
        anchor.allowedTroops[0] ??
        "shieldbearers")
      : anchor.troop;

  const focusConfig = useMemo<FocusConfig>(
    () => ({
      dragonId: anchor.dragonId,
      slot: anchor.dragonId ? anchor.slot : "auto",
      troops: anchor.allowedTroops,
    }),
    [anchor.dragonId, anchor.slot, anchor.allowedTroops],
  );
  // Tracks the live pit, so dragons seated from one suggestion drop out of the rest.
  const result = useMemo(
    () => (generatedConfig ? focusSuggestions(state, generatedConfig) : null),
    [generatedConfig, state],
  );
  const dirty =
    generatedConfig !== null &&
    focusConfigKey(generatedConfig) !== focusConfigKey(focusConfig);

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

  useLayoutEffect(() => {
    if (atBottomRef.current) scrollToEnd();
  }, [chat.turns, scrollToEnd]);

  function setFocusDragon(dragonId: string | null) {
    const dragon = dragonId ? getCatalogDragon(dragonId) : null;
    chat.setAnchor({ ...anchor, dragonId: dragon?.id ?? null, slot: "auto" });
  }

  function setFocusTroops(troops: TroopType[]) {
    if (troops.length === 0) return;
    chat.setAnchor({
      ...anchor,
      allowedTroops: troops,
      troop: troops.length === 1 ? troops[0] : "auto",
    });
  }

  function generate() {
    const config = focusConfig;
    startGenerating(() => {
      setGeneratedConfig(config);
      setResultsOpen(true);
    });
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }

  function submit(text: string, label?: string) {
    if (!chat.send(text, label)) return;
    setDraft("");
    setResultsOpen(false);
    atBottomRef.current = true;
    setAtBottom(true);
    requestAnimationFrame(() => {
      scrollToEnd("smooth");
      inputRef.current?.focus();
    });
  }

  function seat(line: AiLine, linePool: AiPool = pool) {
    const filled = lineupFromAiLine(line, state, linePool);
    if (!filled.slots.left || !filled.slots.vanguard || !filled.slots.right) {
      toast.error("Could not fill all three seats from that line.");
      return;
    }
    const atPitLimit = filled.kind === "pit" && savedPitCount >= MAX_PIT_TEAMS;
    const created = {
      ...filled,
      kind: atPitLimit ? ("theory" as const) : filled.kind,
      id: newId("lineup"),
      updatedAt: nowIso(),
    };
    addLineup(created);
    rememberBuild(created.kind, created.id);
    if (atPitLimit) {
      toast.success(
        `Already at ${MAX_PIT_TEAMS}/${MAX_PIT_TEAMS} pit teams — saved ${line.name} as a Theory line.`,
      );
      return;
    }
    toast.success(
      created.kind === "pit"
        ? `Seated ${line.name} (${savedPitCount + 1}/${MAX_PIT_TEAMS} pit teams).`
        : `Saved ${line.name} as a Theory line.`,
    );
  }

  const buildExport = useCallback(
    () =>
      chatgptCoachExport({
        request: makeSuggestRequest(
          { ...lineup, troop: activeTroop, mode: "pvp" },
          state,
          pool,
          roster,
        ),
        turns: chat.turns
          .filter((turn) => turn.status === "done")
          .map((turn) => ({ role: turn.role, text: turn.text })),
        draft,
      }),
    [activeTroop, chat.turns, draft, lineup, state, pool, roster],
  );

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Opening Copilot…</p>;
  }

  const overLimit = draft.length > DRAFT_LIMIT;
  const lastAnswer = [...chat.turns]
    .reverse()
    .find((turn) => turn.role === "assistant" && turn.status === "done");

  const dragonPrompts = anchorDragon
    ? [
        {
          send: `Build a team around ${anchorDragon.name}`,
          label: "Rank best team",
        },
        {
          send: `Give me another option around ${anchorDragon.name}`,
          label: "Another option",
        },
        anchorDragon.id !== "vhagar"
          ? {
              send: `Team around ${anchorDragon.name} without Vhagar`,
              label: "Without Vhagar",
            }
          : {
              send: `Team around Vhagar without Malachite`,
              label: "Without Malachite",
            },
      ]
    : COACH_STARTERS.map((starter) => ({ send: starter, label: starter }));

  const resultDragon = result?.config.dragonId
    ? getCatalogDragon(result.config.dragonId) ?? null
    : null;
  const resultTroops = result
    ? TROOP_TYPES.filter((troop) => result.config.troops.includes(troop))
    : [];
  const resultFacts = result
    ? [
        resultDragon
          ? result.config.slot === "auto"
            ? "Best seat"
            : `${slotShort[result.config.slot]} seat`
          : null,
        resultTroops.length === TROOP_TYPES.length
          ? "Any troop"
          : resultTroops.map((troop) => troopLabels[troop]).join(", "),
        result.pool === "pit" ? "From your free pit" : "From every dragon",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <AccountGate
      next="/coach"
      title="Copilot (beta) is for registered accounts"
      description="Create a free username on this server to rank three-dragon lines. This ranker is in beta. Forums stay readable without signing in."
    >
      <div className="mx-auto flex w-full min-h-0 max-w-[92rem] flex-1 flex-col gap-2 overflow-y-auto lg:overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/50 pb-2">
          <h1 className="font-heading inline-flex items-center gap-2 text-xl tracking-wide sm:text-2xl">
            Copilot
            <BetaBadge className="h-5 px-2 text-[10px]" />
            {openAi ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-sans text-[10px] font-medium tracking-wide text-emerald-200 ring-1 ring-emerald-400/35">
                ChatGPT
              </span>
            ) : null}
          </h1>
          <CopilotContextLine
            anchorName={anchorDragon?.name ?? null}
            last={lastAnswer}
          />
          <div className="ms-auto flex items-center gap-1">
            <CoachTeamBuilderButton />
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

        <ArmyAutoBuilder onCopilotAnchor={setFocusDragon} />

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[21rem_minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)]">
          <FocusPanel
            dragonId={anchor.dragonId}
            slot={anchor.slot}
            troops={anchor.allowedTroops}
            ownedStars={ownedStars}
            usedTeams={usedTeams}
            availablePitCount={availablePitCount}
            generating={generating}
            generated={generatedConfig !== null}
            dirty={dirty}
            onDragon={setFocusDragon}
            onSlot={(slot) => chat.setAnchor({ ...anchor, slot })}
            onTroops={setFocusTroops}
            onGenerate={generate}
            extra={
              <Disclosure
                title="Meta reference & ChatGPT export"
                className="bg-black/20"
              >
                <div className="space-y-2">
                  <MetaCard />
                  <ChatGptExportBar
                    build={buildExport}
                    filename={chatgptExportFilename("coach", pool)}
                    disabled={roster.length === 0}
                  />
                </div>
              </Disclosure>
            }
          />

          {/* Right pane: teams around selected dragon + Copilot chat */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <section
              ref={resultsRef}
              aria-labelledby="copilot-built-heading"
              aria-busy={generating || undefined}
              data-coach-results
              className="shrink-0 scroll-mt-3 rounded-2xl surface p-3 ring-1 ring-foreground/15"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <SectionLabel id="copilot-built-heading">
                    {!result
                      ? "Suggestions"
                      : resultDragon
                        ? `Teams around ${resultDragon.name}`
                        : "Best teams for you"}
                  </SectionLabel>
                  {result ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {resultFacts}
                    </p>
                  ) : null}
                </div>
                {result && result.lines.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    {resultDragon ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          submit(
                            `Explain the top team around ${resultDragon.name}`,
                            `Why this ${resultDragon.name} line works`,
                          )
                        }
                      >
                        <Sparkles data-icon="inline-start" />
                        Ask Copilot why
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-expanded={resultsOpen}
                      onClick={() => setResultsOpen((open) => !open)}
                    >
                      {resultsOpen ? "Hide" : "Show"}
                      <ChevronDown
                        data-icon="inline-end"
                        className={cn("transition", resultsOpen && "rotate-180")}
                      />
                    </Button>
                  </div>
                ) : null}
              </div>

              {dirty ? (
                <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-100 ring-1 ring-amber-400/30">
                  Your choices changed. Tap{" "}
                  <span className="font-medium">Update suggestions</span> to
                  refresh these teams.
                </p>
              ) : null}

              {!result ? (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-foreground/20 px-3 py-4">
                  <Sparkles
                    className="size-5 shrink-0 text-amber-300/80"
                    aria-hidden
                  />
                  <p className="text-sm text-muted-foreground">
                    Choose a focus dragon (optional) and troops, then tap{" "}
                    <span className="text-amber-100">Generate suggestions</span>
                    . Your top three teams show up here.
                  </p>
                </div>
              ) : !resultsOpen ? null : result.lines.length === 0 ? (
                <p className="mt-2 rounded-xl bg-black/25 px-3 py-2.5 text-sm text-muted-foreground">
                  No complete team matched
                  {resultDragon ? ` around ${resultDragon.name}` : ""}. Try
                  turning on more troops
                  {resultDragon && result.config.slot !== "auto"
                    ? " or switching the seat to Best"
                    : ""}
                  .
                </p>
              ) : (
                <>
                  {result.fellBack ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Your free pit could not fill a full team for these
                      choices, so these teams use every dragon.
                    </p>
                  ) : null}
                  <div
                    className={cn(
                      "mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3",
                      generating && "opacity-60",
                    )}
                  >
                    {result.lines.map((line, index) => (
                      <CoachFormation
                        key={`built-${index}-${line.left}-${line.vanguard}-${line.right}`}
                        line={line}
                        state={state}
                        pool={result.pool}
                        onSeat={(picked) => seat(picked, result.pool)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* Copilot chat transcript + composer */}
            <section
              aria-label="Copilot conversation"
              className="relative flex min-h-[16rem] flex-1 flex-col overflow-hidden rounded-2xl surface p-3 ring-1 ring-foreground/15"
            >
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
                  <Starters
                    prompts={dragonPrompts}
                    anchorName={anchorDragon?.name ?? null}
                    onPick={submit}
                  />
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
                  className="absolute inset-x-0 bottom-16 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-stone-900 px-3 py-1.5 text-xs text-amber-50 ring-1 ring-amber-400/40 shadow-lg"
                >
                  <ArrowDown className="size-3.5" />
                  Jump to latest
                </button>
              )}

              <p aria-live="polite" className="sr-only">
                {chat.busy ? "Copilot is working on your answer." : ""}
              </p>

              <form
                className="mt-2 flex shrink-0 items-end gap-2 border-t border-border/50 pt-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (overLimit) return;
                  submit(draft);
                }}
              >
                <div className="min-w-0 flex-1">
                  <label htmlFor="coach-input" className="sr-only">
                    Ask Copilot about a dragon team
                  </label>
                  <Textarea
                    id="coach-input"
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={
                      anchorDragon
                        ? `Ask about ${anchorDragon.name} (e.g. "without Malachite", or name another dragon)…`
                        : 'Try "Build me a team around Vhagar"…'
                    }
                    className="max-h-36 min-h-11 w-full"
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
            </section>
          </div>
        </div>
      </div>
    </AccountGate>
  );
}

function CopilotContextLine({
  anchorName,
  last,
}: {
  anchorName: string | null;
  last?: ChatTurn;
}) {
  const meta = last?.meta;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>
        {anchorName
          ? `Building around ${anchorName}`
          : "Pick a dragon or name one in chat"}
      </span>
      {meta ? (
        <>
          <span aria-hidden>·</span>
          <span>
            {troopLabels[meta.troop]}
            {meta.mode !== "pvp" ? ` · ${modeLabels[meta.mode]}` : ""}
          </span>
        </>
      ) : null}
      {meta?.skipped.length ? (
        <>
          <span aria-hidden>·</span>
          <span>Without {meta.skipped.join(", ")}</span>
        </>
      ) : null}
    </p>
  );
}

function Starters({
  prompts,
  anchorName,
  onPick,
}: {
  prompts: { send: string; label: string }[];
  anchorName: string | null;
  onPick: (send: string, label?: string) => void;
}) {
  return (
    <div className="rounded-xl bg-black/25 px-3 py-3 ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">
        {anchorName
          ? `Ask Copilot about ${anchorName} — it picks troop and seats for you. Name dragons to leave out in the box below.`
          : "Ask Copilot anything about teams, or tap a shortcut:"}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {prompts.map((starter) => (
          <button
            key={starter.send}
            type="button"
            className="rounded-lg bg-card/60 px-2.5 py-1.5 text-left text-[12px] leading-snug ring-1 ring-foreground/15 hover:bg-muted"
            onClick={() => onPick(starter.send, starter.label)}
          >
            {starter.label}
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
        Building around your dragon…
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
    <div data-turn="assistant" className="space-y-2.5">
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
      <div className="w-fit max-w-[min(52rem,100%)] rounded-2xl bg-black/30 px-3.5 py-2.5 text-[13px] leading-relaxed break-words whitespace-pre-wrap ring-1 ring-foreground/10">
        {turn.text}
      </div>
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
