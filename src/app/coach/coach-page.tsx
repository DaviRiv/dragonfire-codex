"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CoachFormation } from "@/components/coach-formation";
import { MiniChip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { OpenAiLogin } from "@/components/openai-login";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { COACH_STARTERS, guessTroopMode, lineupFromAiLine } from "@/lib/ai/coach";
import type { AiLine } from "@/lib/ai/prompt";
import { collectRoster, type AiPool } from "@/lib/ai/roster";
import { useOpenAiSession } from "@/lib/ai/session";
import { newId, nowIso } from "@/lib/dragons";
import { emptySlots } from "@/lib/lineup";
import { rememberBuild } from "@/lib/build-session";
import { usePit } from "@/lib/store";
import type { Lineup } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { toast } from "sonner";

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  lines?: AiLine[];
  warning?: string;
};

function contextLineup(lineups: Lineup[], pool: AiPool): Lineup {
  const kind = pool === "pit" ? "pit" : "theory";
  const found = lineups.find((lineup) => lineup.kind === kind);
  if (found) return found;
  return {
    id: "coach-context",
    name: "Coach",
    kind,
    mode: "pvp",
    troop: "shieldbearers",
    notes: "",
    slots: emptySlots(),
    ignoreLevel: false,
    craftStars: 10,
    excludeUsed: kind === "pit",
    updatedAt: new Date().toISOString(),
  };
}

function turnId() {
  return `turn-${Math.random().toString(36).slice(2, 10)}`;
}

export function CoachPage() {
  const { ready, state, loadSample, addLineup } = usePit();
  const { session } = useOpenAiSession();
  const [pool, setPool] = useState<AiPool>("pit");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const lineup = useMemo(
    () => contextLineup(state.lineups, pool),
    [state.lineups, pool],
  );
  const roster = useMemo(
    () => collectRoster(state, lineup, pool),
    [state, lineup, pool],
  );
  const latestLines = [...turns]
    .reverse()
    .find((turn) => turn.role === "assistant" && (turn.lines?.length ?? 0) > 0)
    ?.lines;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [turns, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    if (roster.length < 3) {
      toast.error("Need at least three dragons in this pool.");
      return;
    }
    const guess = guessTroopMode(question);
    const userTurn: ChatTurn = { id: turnId(), role: "user", text: question };
    const history = turns.slice(-8).map((turn) => ({
      role: turn.role,
      content:
        turn.role === "assistant" && turn.lines
          ? JSON.stringify({ reply: turn.text, lines: turn.lines })
          : turn.text,
    }));
    setTurns((prev) => [...prev, userTurn]);
    setDraft("");
    setBusy(true);
    try {
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.apiKey
            ? { Authorization: `Bearer ${session.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          pool,
          skipUsed: lineup.kind === "pit" && lineup.excludeUsed !== false,
          troop: guess.troop,
          mode: guess.mode,
          lineupName: lineup.name,
          question,
          history,
          roster,
        }),
      });
      const json = (await response.json()) as {
        reply?: string;
        lines?: AiLine[];
        warning?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error || "Coach failed.");
      }
      setTurns((prev) => [
        ...prev,
        {
          id: turnId(),
          role: "assistant",
          text: json.reply || "Here is a line from the roster.",
          lines: json.lines ?? [],
          warning: json.warning,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Coach failed.";
      toast.error(message);
      setTurns((prev) => [
        ...prev,
        {
          id: turnId(),
          role: "assistant",
          text: message,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function seat(line: AiLine) {
    const ids = [line.left, line.vanguard, line.right];
    const missing = ids.find(
      (id) => !state.owned.some((owned) => owned.dragonId === id),
    );
    if (missing && pool === "pit") {
      toast.error(
        "That combination includes a dragon not in your pit. Switch to Hatchery for theory goals.",
      );
      return;
    }
    const filled = lineupFromAiLine(line, state, pool);
    if (!filled.slots.left || !filled.slots.vanguard || !filled.slots.right) {
      toast.error("Could not fill all three seats.");
      return;
    }
    const created = {
      ...filled,
      id: newId("lineup"),
      updatedAt: nowIso(),
    };
    addLineup(created);
    rememberBuild(created.kind, created.id);
    toast.success(`Seated ${line.name} on Team.`);
  }

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Opening coach…</p>;
  }

  const pitTooSmall = pool === "pit" && roster.length < 3;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-heading text-xl tracking-wide sm:text-3xl">
          Coach
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Talk about three-dragon lines. Boards appear here as the coach
          picks them.
        </p>
      </div>
      <OpenAiLogin />
      <div className="flex flex-wrap gap-1">
        <MiniChip
          active={pool === "pit"}
          onClick={() => setPool("pit")}
        >
          Pit · {state.owned.length}
        </MiniChip>
        <MiniChip
          active={pool === "hatchery"}
          onClick={() => setPool("hatchery")}
        >
          Hatchery
        </MiniChip>
      </div>

      {pitTooSmall ? (
        <EmptyState
          title="Log dragons first"
          description="Coach needs at least three names in the pit, or switch the pool to Hatchery."
          action={
            <div className="grid w-full max-w-sm gap-2">
              <Button onClick={loadSample}>Load sample pit</Button>
              <Button variant="outline" onClick={() => setPool("hatchery")}>
                Use Hatchery
              </Button>
            </div>
          }
        />
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(22rem,34rem)_minmax(0,1fr)] lg:items-start lg:gap-5">
          <section className="hidden space-y-2 lg:sticky lg:top-[calc(3.5rem+env(safe-area-inset-top))] lg:block">
            <p className="text-label">Selected formations</p>
            {latestLines && latestLines.length > 0 ? (
              latestLines.map((line) => (
                <CoachFormation
                  key={`${line.left}-${line.vanguard}-${line.right}`}
                  line={line}
                  state={state}
                  pool={pool}
                  onSeat={seat}
                />
              ))
            ) : (
              <p className="rounded-2xl bg-card/40 px-3 py-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
                Ask for a core, a rally, or a soak. The boards land here.
              </p>
            )}
          </section>

          <section className="mt-3 flex min-h-[24rem] flex-col lg:mt-0">
            <div className="flex flex-1 flex-col gap-2">
              {turns.length === 0 ? (
                <div className="rounded-2xl bg-card/40 px-3 py-4 ring-1 ring-foreground/10">
                  <p className="text-sm text-muted-foreground">
                    Try one of these, or type your own.
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {COACH_STARTERS.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        className="rounded-xl px-3 py-2 text-left text-[13px] leading-snug ring-1 ring-foreground/15 hover:bg-muted"
                        onClick={() => void send(starter)}
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                turns.map((turn) => (
                  <div
                    key={turn.id}
                    className={cn(
                      "max-w-[40rem] rounded-2xl px-3 py-2 text-[13px] leading-snug",
                      turn.role === "user"
                        ? "ml-auto bg-amber-500/20 text-amber-50"
                        : "bg-card/70 ring-1 ring-foreground/10",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{turn.text}</p>
                    {turn.warning ? (
                      <p className="mt-1 text-amber-100">{turn.warning}</p>
                    ) : null}
                    {turn.role === "assistant" && turn.lines?.length ? (
                      <div className="mt-2 space-y-2 lg:hidden">
                        {turn.lines.map((line) => (
                          <CoachFormation
                            key={`${turn.id}-${line.vanguard}`}
                            line={line}
                            state={state}
                            pool={pool}
                            onSeat={seat}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              {busy ? (
                <p className="text-[13px] text-muted-foreground">
                  Reading the roster…
                </p>
              ) : null}
              <div ref={bottomRef} />
            </div>
            <form
              className="sticky bottom-[calc(3.6rem+env(safe-area-inset-bottom))] mt-3 flex gap-2 bg-background/90 py-2 md:bottom-0"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about a formation…"
                className="min-h-12 flex-1"
                rows={2}
                maxLength={800}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !draft.trim() || roster.length < 3}
                aria-label="Send"
              >
                <Send />
              </Button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
