"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccountGate } from "@/components/account-gate";
import { BetaBadge } from "@/components/beta-badge";
import { ChatGptExportBar } from "@/components/chatgpt-export";
import { CoachFormation } from "@/components/coach-formation";
import { MiniChip } from "@/components/chip";
import { Disclosure } from "@/components/disclosure";
import { DragonIcon } from "@/components/dragon-icon";
import { MetaCard } from "@/components/meta-card";
import { SearchField } from "@/components/search-field";
import { SectionLabel } from "@/components/section-label";
import { TroopChip, TroopIcon } from "@/components/troop-icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  contextLineup,
  useCoachChat,
} from "@/app/coach/use-coach-chat";
import { DRAGONS, getCatalogDragon } from "@/data/dragons";
import { COACH_STARTERS, coachLines, lineupFromAiLine } from "@/lib/ai/coach";
import type { ChatErrorKind, ChatTurn } from "@/lib/ai/conversation";
import { chatgptCoachExport, chatgptExportFilename } from "@/lib/ai/export";
import { makeSuggestRequest, type AiLine } from "@/lib/ai/prompt";
import { collectRoster } from "@/lib/ai/roster";
import { rememberBuild } from "@/lib/build-session";
import { filterDragonPicks } from "@/lib/counter-pick";
import { newId, nowIso } from "@/lib/dragons";
import {
  MODES,
  TROOP_TYPES,
  modeLabels,
  modeShort,
  slotShort,
  troopLabels,
} from "@/lib/labels";
import { SLOT_IDS } from "@/lib/lineup";
import { dragonRoles, roleChipClass, roleShort } from "@/lib/roles";
import { usePit } from "@/lib/store";
import { useOpenAiAvailable } from "@/lib/use-openai-available";
import type { SlotId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowDown, RotateCcw, Send, Sparkles, Square, X } from "lucide-react";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragonQuery, setDragonQuery] = useState("");
  const [showBuiltInChat, setShowBuiltInChat] = useState(false);

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

  const anchorDragon = anchor.dragonId
    ? getCatalogDragon(anchor.dragonId) ?? null
    : null;

  const activeTroop =
    anchor.troop === "auto"
      ? (anchorDragon?.affinities[0] ?? "shieldbearers")
      : anchor.troop;

  const builtLines = useMemo(() => {
    if (!anchorDragon) return [];
    const request = makeSuggestRequest(
      { ...lineup, troop: activeTroop, mode: anchor.mode },
      state,
      pool,
      roster,
    );
    return coachLines({
      request,
      state,
      lineup,
      troop: activeTroop,
      mode: anchor.mode,
      skip: [],
      anchorId: anchorDragon.id,
      anchorSlot: anchor.slot === "auto" ? null : anchor.slot,
      lockTroop: anchor.troop !== "auto",
    }).slice(0, 3);
  }, [
    activeTroop,
    anchor.mode,
    anchor.slot,
    anchor.troop,
    anchorDragon,
    lineup,
    pool,
    roster,
    state,
  ]);

  const pickerDragons = useMemo(
    () =>
      filterDragonPicks(DRAGONS, {
        query: dragonQuery,
        ownedIds: ownedStars.keys(),
      }),
    [dragonQuery, ownedStars],
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

  useLayoutEffect(() => {
    if (atBottomRef.current) scrollToEnd();
  }, [chat.turns, scrollToEnd]);

  function selectDragon(dragonId: string) {
    const dragon = getCatalogDragon(dragonId);
    if (!dragon) return;
    chat.setAnchor({
      dragonId: dragon.id,
      slot: "auto",
      troop: "auto",
      mode: anchor.mode,
    });
    setPickerOpen(false);
    setDragonQuery("");
    if (chat.turns.length > 0) setShowBuiltInChat(true);
  }

  function clearDragon() {
    chat.setAnchor({
      ...anchor,
      dragonId: null,
      slot: "auto",
      troop: "auto",
    });
    setPickerOpen(true);
  }

  function submit(text: string) {
    if (!chat.send(text)) return;
    setDraft("");
    setShowBuiltInChat(false);
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
        request: makeSuggestRequest(
          { ...lineup, troop: activeTroop, mode: anchor.mode },
          state,
          pool,
          roster,
        ),
        turns: chat.turns
          .filter((turn) => turn.status === "done")
          .map((turn) => ({ role: turn.role, text: turn.text })),
        draft,
      }),
    [activeTroop, anchor.mode, chat.turns, draft, lineup, state, pool, roster],
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
        `Best team around ${anchorDragon.name}`,
        `Give me another option around ${anchorDragon.name}`,
        `Build a rally team around ${anchorDragon.name}`,
        anchorDragon.id !== "vhagar"
          ? `Team around ${anchorDragon.name} without Vhagar`
          : `Team around Vhagar without Malachite`,
      ]
    : [...COACH_STARTERS];

  const showPicker = !anchorDragon || pickerOpen;

  return (
    <AccountGate
      next="/coach"
      title="Copilot (beta) is for registered accounts"
      description="Create a free username on this server to rank three-dragon lines. This ranker is in beta. Team and Forums stay readable without signing in."
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

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[21rem_minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)]">
          {/* Left pane: dragon selector + optional filters */}
          <aside
            aria-label="Pick a dragon"
            className="flex min-h-0 flex-col gap-3 rounded-2xl surface p-3 ring-1 ring-foreground/15 lg:overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <SectionLabel>Build around a dragon</SectionLabel>
              {anchorDragon ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPickerOpen((open) => !open)}
                  >
                    {pickerOpen ? "Done" : "Change"}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Clear selected dragon"
                    onClick={clearDragon}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>

            {anchorDragon && !pickerOpen ? (
              <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 p-2.5 ring-1 ring-amber-400/35">
                <DragonIcon
                  dragonId={anchorDragon.id}
                  name={anchorDragon.name}
                  rarity={anchorDragon.rarity}
                  size="lg"
                  selected
                />
                <div className="min-w-0 flex-1">
                  <p className="font-heading truncate text-base tracking-wide text-amber-50">
                    {anchorDragon.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {anchorDragon.affinities
                      .map((item) => troopLabels[item])
                      .join(" · ")}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dragonRoles(anchorDragon).map((role) => (
                      <span
                        key={role}
                        className={cn(
                          "rounded-full px-1.5 py-px text-[10px] ring-1",
                          roleChipClass[role],
                        )}
                      >
                        {roleShort[role]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {showPicker ? (
              <div className="flex min-h-0 flex-col gap-2">
                <SearchField
                  value={dragonQuery}
                  onChange={setDragonQuery}
                  label="Search dragon to build around"
                  inputClassName="h-11 md:h-9"
                />
                <ul className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto overscroll-contain rounded-xl bg-black/25 p-1.5 ring-1 ring-foreground/10 sm:grid-cols-4 lg:grid-cols-3">
                  {pickerDragons.map((dragon) => {
                    const selected = dragon.id === anchorDragon?.id;
                    const role = dragonRoles(dragon)[0];
                    return (
                      <li key={dragon.id}>
                        <button
                          type="button"
                          onClick={() => selectDragon(dragon.id)}
                          data-coach-pick={dragon.id}
                          className={cn(
                            "flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-center transition",
                            selected
                              ? "bg-amber-500/20 ring-1 ring-amber-300"
                              : "hover:bg-muted",
                          )}
                        >
                          <DragonIcon
                            dragonId={dragon.id}
                            name={dragon.name}
                            rarity={dragon.rarity}
                            size="sm"
                            selected={selected}
                          />
                          <span className="w-full truncate text-[11px]">
                            {dragon.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {role ? roleShort[role] : dragon.rarity}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="space-y-2.5 border-t border-border/50 pt-2.5">
              <div className="space-y-1">
                <SectionLabel>Seat</SectionLabel>
                <div className="flex flex-wrap gap-1">
                  <MiniChip
                    active={anchor.slot === "auto"}
                    onClick={() => chat.setAnchor({ ...anchor, slot: "auto" })}
                  >
                    Best seat
                  </MiniChip>
                  {SLOT_IDS.map((slot: SlotId) => (
                    <MiniChip
                      key={slot}
                      active={anchor.slot === slot}
                      onClick={() => chat.setAnchor({ ...anchor, slot })}
                    >
                      {slotShort[slot]}
                    </MiniChip>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <SectionLabel>Troop &amp; mode</SectionLabel>
                <div className="flex flex-wrap gap-1">
                  <MiniChip
                    active={anchor.troop === "auto"}
                    onClick={() => chat.setAnchor({ ...anchor, troop: "auto" })}
                  >
                    Any troop
                  </MiniChip>
                  {TROOP_TYPES.map((troop) => (
                    <TroopChip
                      key={troop}
                      troop={troop}
                      active={anchor.troop === troop}
                      className="min-h-8 px-2 py-0 text-[11px]"
                      onClick={() => chat.setAnchor({ ...anchor, troop })}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {MODES.map((mode) => (
                    <MiniChip
                      key={mode}
                      active={anchor.mode === mode}
                      onClick={() => chat.setAnchor({ ...anchor, mode })}
                    >
                      {modeShort[mode]}
                    </MiniChip>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <SectionLabel>Pool</SectionLabel>
                <div className="flex flex-wrap gap-1">
                  <MiniChip
                    active={pool === "hatchery"}
                    onClick={() => chat.setPool("hatchery")}
                  >
                    All dragons
                  </MiniChip>
                  <MiniChip
                    active={pool === "pit"}
                    onClick={() => chat.setPool("pit")}
                  >
                    Owned only · {state.owned.length}
                  </MiniChip>
                </div>
              </div>
            </div>

            <Disclosure title="Meta reference & ChatGPT export">
              <div className="space-y-2">
                <MetaCard />
                <ChatGptExportBar
                  build={buildExport}
                  filename={chatgptExportFilename("coach", pool)}
                  disabled={roster.length === 0}
                />
              </div>
            </Disclosure>
          </aside>

          {/* Right pane: teams around selected dragon + Copilot chat */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <section
              aria-labelledby="copilot-built-heading"
              className="shrink-0 rounded-2xl surface p-3 ring-1 ring-foreground/15"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionLabel id="copilot-built-heading">
                  {anchorDragon
                    ? `Teams built around ${anchorDragon.name}${anchor.troop !== "auto" ? ` · ${troopLabels[anchor.troop]}` : ""} · ${modeShort[anchor.mode]}`
                    : "Select a dragon on the left — or ask Copilot below"}
                </SectionLabel>
                <div className="flex items-center gap-1.5">
                  {anchorDragon && chat.turns.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowBuiltInChat((open) => !open)}
                    >
                      {showBuiltInChat ? "Hide top 3" : "Show top 3"}
                    </Button>
                  ) : null}
                  {anchorDragon && builtLines.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        submit(
                          `Explain the top ${modeShort[anchor.mode]} team around ${anchorDragon.name}`,
                        )
                      }
                    >
                      <Sparkles data-icon="inline-start" />
                      Ask Copilot why
                    </Button>
                  ) : null}
                </div>
              </div>

              {chat.turns.length > 0 && !showBuiltInChat ? null : !anchorDragon ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick any dragon on the left, or type something like{" "}
                  <span className="text-amber-100">
                    “build me a team around Vhagar”
                  </span>{" "}
                  below. Every suggested team will include that dragon.
                </p>
              ) : builtLines.length === 0 ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-2.5 text-sm text-muted-foreground">
                  <span>
                    No complete {modeShort[anchor.mode]} line around{" "}
                    {anchorDragon.name} matched your current filters.
                  </span>
                  {pool === "pit" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => chat.setPool("hatchery")}
                    >
                      Use All dragons
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {builtLines.map((line, index) => (
                    <CoachFormation
                      key={`built-${index}-${line.left}-${line.vanguard}-${line.right}`}
                      line={line}
                      state={state}
                      pool={pool}
                      onSeat={seat}
                    />
                  ))}
                </div>
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
                        ? `Ask about ${anchorDragon.name} (e.g. "without Malachite", "try rally", or name another dragon)…`
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
          <span className="inline-flex items-center gap-1">
            <TroopIcon troop={meta.troop} className="size-3.5" />
            {troopLabels[meta.troop]} · {modeLabels[meta.mode]}
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
  prompts: string[];
  anchorName: string | null;
  onPick: (text: string) => void;
}) {
  return (
    <div className="rounded-xl bg-black/25 px-3 py-3 ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">
        {anchorName
          ? `Ask Copilot for alternates around ${anchorName}, exclusions, or another mode.`
          : "Ask Copilot to build a team around any dragon:"}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {prompts.map((starter) => (
          <button
            key={starter}
            type="button"
            className="rounded-lg bg-card/60 px-2.5 py-1.5 text-left text-[12px] leading-snug ring-1 ring-foreground/15 hover:bg-muted"
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
    <div data-turn="assistant" className="space-y-2">
      <div className="w-fit max-w-[min(44rem,95%)] rounded-2xl bg-black/30 px-3 py-2 text-[13px] leading-snug break-words whitespace-pre-wrap ring-1 ring-foreground/10">
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
