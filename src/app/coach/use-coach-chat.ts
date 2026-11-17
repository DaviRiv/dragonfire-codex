"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { answerPlan } from "@/lib/ai/coach";
import {
  historyForContext,
  parseStoredTurns,
  planTurn,
  turnsForStorage,
  type ChatError,
  type ChatErrorKind,
  type ChatTurn,
  type TurnMeta,
} from "@/lib/ai/conversation";
import { makeSuggestRequest, type AiLine } from "@/lib/ai/prompt";
import { collectRoster, type AiPool, type RosterCard } from "@/lib/ai/roster";
import { findDragon } from "@/lib/dragons";
import { emptySlots } from "@/lib/lineup";
import { readPitSnapshot } from "@/lib/store";
import type { Lineup, LineupMode, PitState, SlotId, TroopType } from "@/lib/types";

export const COACH_STORAGE_KEY = "dragonfire-pit.coach.v2";

/** A single answer should never outrun this. Real work, no padding. */
const TURN_TIMEOUT_MS = 15_000;

/**
 * Copilot ranks against a saved formation when there is one, so seats already
 * in use are visible to the ranker. Otherwise it uses a scratch line.
 */
export function contextLineup(lineups: Lineup[], pool: AiPool): Lineup {
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
    // Fixed so an unsaved context line keeps a stable identity between renders.
    updatedAt: "1970-01-01T00:00:00.000Z",
  };
}

export type CoachAnchor = {
  dragonId: string | null;
  slot: SlotId | "auto";
  troop: TroopType | "auto";
  mode: LineupMode;
};

const DEFAULT_ANCHOR: CoachAnchor = {
  dragonId: null,
  slot: "auto",
  troop: "auto",
  mode: "pvp",
};

type State = {
  turns: ChatTurn[];
  restored: boolean;
  pool: AiPool;
  anchor: CoachAnchor;
};

type Action =
  | { type: "restore"; turns: ChatTurn[]; pool: AiPool; anchor: CoachAnchor }
  | { type: "pool"; pool: AiPool }
  | { type: "anchor"; anchor: CoachAnchor }
  | { type: "submit"; requestId: string; question: string; at: number }
  | {
      type: "resolve";
      requestId: string;
      reply: string;
      lines: AiLine[];
      meta: TurnMeta;
    }
  | { type: "fail"; requestId: string; error: ChatError }
  | { type: "retry"; requestId: string }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restore":
      return {
        turns: action.turns,
        pool: action.pool,
        anchor: action.anchor,
        restored: true,
      };
    case "pool":
      return { ...state, pool: action.pool };
    case "anchor":
      return { ...state, anchor: action.anchor };
    case "submit":
      return {
        ...state,
        turns: [
          ...state.turns,
          {
            id: `${action.requestId}-u`,
            requestId: action.requestId,
            role: "user",
            text: action.question,
            createdAt: action.at,
            status: "done",
          },
          {
            id: `${action.requestId}-a`,
            requestId: action.requestId,
            role: "assistant",
            text: "",
            createdAt: action.at,
            status: "pending",
          },
        ],
      };
    case "resolve":
      return {
        ...state,
        // Match on the request id, so a late answer can only ever land in the
        // slot that asked for it.
        turns: state.turns.map((turn) =>
          turn.role === "assistant" && turn.requestId === action.requestId
            ? {
                ...turn,
                status: "done",
                text: action.reply,
                lines: action.lines,
                meta: action.meta,
                error: undefined,
              }
            : turn,
        ),
      };
    case "fail":
      return {
        ...state,
        turns: state.turns.map((turn) =>
          turn.role === "assistant" &&
          turn.requestId === action.requestId &&
          turn.status === "pending"
            ? {
                ...turn,
                status:
                  action.error.kind === "cancelled" ? "cancelled" : "error",
                error: action.error,
              }
            : turn,
        ),
      };
    case "retry":
      return {
        ...state,
        turns: state.turns.map((turn) =>
          turn.role === "assistant" && turn.requestId === action.requestId
            ? { ...turn, status: "pending", error: undefined }
            : turn,
        ),
      };
    case "reset":
      return { ...state, turns: [] };
    default:
      return state;
  }
}

function newRequestId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `req-${Date.now().toString(36)}-${rand}`;
}

const ERROR_COPY: Record<ChatErrorKind, string> = {
  network: "Lost the connection while building that answer. Try again.",
  server: "Something went wrong while generating the answer. Try again.",
  timeout: "That answer took too long to build. Try again.",
  invalid: "Copilot could not read your pit. Fix that dragon, then ask again.",
  "rate-limit": "Too many questions at once. Wait a moment, then try again.",
  auth: "Your session expired. Sign in again to keep using Copilot.",
  cancelled: "You stopped that answer.",
  unknown: "Something went wrong while generating the answer. Try again.",
};

export function coachError(kind: ChatErrorKind): ChatError {
  return { kind, message: ERROR_COPY[kind], retryable: kind !== "auth" };
}

class RosterError extends Error {}
class TimeoutError extends Error {}
class ForcedError extends Error {
  constructor(readonly kind: ChatErrorKind) {
    super(kind);
  }
}

function toChatError(error: unknown): ChatError {
  if (error instanceof ForcedError) return coachError(error.kind);
  if (error instanceof TimeoutError) return coachError("timeout");
  if (error instanceof RosterError) {
    return {
      ...coachError("invalid"),
      message: `Copilot could not read your pit: ${error.message}. Fix that dragon in Pit, then ask again.`,
    };
  }
  if (
    typeof navigator !== "undefined" &&
    "onLine" in navigator &&
    navigator.onLine === false
  ) {
    return coachError("network");
  }
  return coachError("unknown");
}

/** Roster rows the ranker would choke on. Never let one through silently. */
function rosterProblem(roster: RosterCard[]): string | null {
  for (const card of roster) {
    if (!card.id || typeof card.name !== "string" || card.name.trim() === "") {
      return "a dragon with no name";
    }
    if (!Number.isFinite(card.stars) || card.stars < 1 || card.stars > 10) {
      return `${card.name} has an unreadable star rank`;
    }
    if (!Number.isFinite(card.reign) || card.reign < 0) {
      return `${card.name} has an unreadable reign level`;
    }
  }
  return null;
}

function yieldToPaint(): Promise<void> {
  // Let the question and the thinking bubble paint before the ranker takes
  // the thread. Not a delay — a single turn of the event loop.
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError()), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type CoachSnapshot = {
  state: PitState;
  lineup: Lineup;
  roster: RosterCard[];
};

/** Everything the ranker needs, read fresh at the moment the answer runs. */
function liveSnapshot(pool: AiPool): CoachSnapshot {
  const state = readPitSnapshot();
  const lineup = contextLineup(state.lineups, pool);
  return { state, lineup, roster: collectRoster(state, lineup, pool) };
}

export function useCoachChat() {
  const [state, dispatch] = useReducer(reducer, {
    turns: [],
    restored: false,
    pool: "hatchery",
    anchor: DEFAULT_ANCHOR,
  });

  const turnsRef = useRef(state.turns);
  const poolRef = useRef(state.pool);
  const anchorRef = useRef(state.anchor);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const abortRef = useRef(new Map<string, AbortController>());
  const failOnceRef = useRef<ChatErrorKind | null>(null);

  // Mirrors of the reduced state for the async pipeline. `send`, `reset`, and
  // `setPool` also write them so work started in the same tick is not stale.
  useEffect(() => {
    turnsRef.current = state.turns;
  }, [state.turns]);

  useEffect(() => {
    poolRef.current = state.pool;
  }, [state.pool]);

  useEffect(() => {
    anchorRef.current = state.anchor;
  }, [state.anchor]);

  useEffect(() => {
    let stored: unknown = null;
    try {
      const raw = window.localStorage.getItem(COACH_STORAGE_KEY);
      stored = raw ? JSON.parse(raw) : null;
    } catch {
      stored = null;
    }
    const record =
      stored && typeof stored === "object"
        ? (stored as { turns?: unknown; pool?: unknown; anchor?: unknown })
        : {};
    const rawAnchor =
      record.anchor && typeof record.anchor === "object"
        ? (record.anchor as Partial<CoachAnchor>)
        : {};
    const anchor: CoachAnchor = {
      dragonId:
        typeof rawAnchor.dragonId === "string" && rawAnchor.dragonId
          ? rawAnchor.dragonId
          : null,
      slot:
        rawAnchor.slot === "left" ||
        rawAnchor.slot === "vanguard" ||
        rawAnchor.slot === "right"
          ? rawAnchor.slot
          : "auto",
      troop: rawAnchor.troop ?? DEFAULT_ANCHOR.troop,
      mode: rawAnchor.mode ?? DEFAULT_ANCHOR.mode,
    };
    const savedPool = record.pool === "pit" ? "pit" : "hatchery";
    dispatch({
      type: "restore",
      turns: parseStoredTurns(record.turns),
      pool: savedPool,
      anchor,
    });
  }, []);

  useEffect(() => {
    if (!state.restored) return;
    const pending = state.turns.some(
      (turn) => turn.role === "assistant" && turn.status === "pending",
    );
    if (pending) return;
    try {
      window.localStorage.setItem(
        COACH_STORAGE_KEY,
        JSON.stringify({
          turns: turnsForStorage(state.turns),
          pool: state.pool,
          anchor: state.anchor,
        }),
      );
    } catch {
      // Full or blocked storage must not break the conversation in memory.
    }
  }, [state.restored, state.turns, state.pool, state.anchor]);

  useEffect(() => {
    const controllers = abortRef.current;
    return () => {
      for (const controller of controllers.values()) controller.abort();
      controllers.clear();
    };
  }, []);

  const run = useCallback((requestId: string, question: string) => {
    const controller = new AbortController();
    abortRef.current.set(requestId, controller);
    // One at a time, so each answer can see the ones before it.
    queueRef.current = queueRef.current.then(async () => {
      if (controller.signal.aborted) return;
      try {
        const answer = await withTimeout(
          (async () => {
            await yieldToPaint();
            const pool = poolRef.current;
            const live = liveSnapshot(pool);
            const problem = rosterProblem(live.roster);
            if (problem) throw new RosterError(problem);
            const forced = failOnceRef.current;
            if (forced) {
              failOnceRef.current = null;
              throw new ForcedError(forced);
            }
            const anchor = anchorRef.current;
            const allCatalogRoster = collectRoster(
              live.state,
              live.lineup,
              "hatchery",
            );
            const history = historyForContext(
              turnsRef.current.filter((turn) => turn.requestId !== requestId),
            );
            const plan = planTurn(
              question,
              history,
              allCatalogRoster,
              anchor.dragonId
                ? {
                    dragonId: anchor.dragonId,
                    slot: anchor.slot === "auto" ? null : anchor.slot,
                    troop: anchor.troop,
                    mode: anchor.mode,
                  }
                : {
                    troop: anchor.troop,
                    mode: anchor.mode,
                  },
            );
            // If the prompt named a dragon to build around, use the full
            // dragon catalog unless that dragon + partners exist in the pit.
            const effectivePool =
              plan.anchorId && pool === "pit" && live.roster.length < 3
                ? "hatchery"
                : pool;
            const effectiveRoster =
              effectivePool === "hatchery" ? allCatalogRoster : live.roster;
            const request = makeSuggestRequest(
              { ...live.lineup, troop: plan.troop, mode: plan.mode },
              live.state,
              effectivePool,
              effectiveRoster,
            );
            const result = answerPlan(plan, request, live.state, live.lineup);
            const meta: TurnMeta = {
              troop: plan.troop,
              mode: plan.mode,
              pool: effectivePool,
              intent: plan.intent,
              skipped: plan.excludeIds.map(
                (id) => findDragon(id, live.state.customDragons)?.name ?? id,
              ),
              anchorId: plan.anchorId ?? null,
              anchorSlot: plan.anchorSlot ?? null,
            };
            return { ...result, meta };
          })(),
          TURN_TIMEOUT_MS,
        );
        if (controller.signal.aborted) return;
        if (answer.meta.anchorId && answer.meta.anchorId !== anchorRef.current.dragonId) {
          const synced: CoachAnchor = {
            ...anchorRef.current,
            dragonId: answer.meta.anchorId,
            slot: answer.meta.anchorSlot ?? "auto",
          };
          anchorRef.current = synced;
          dispatch({ type: "anchor", anchor: synced });
        }
        dispatch({
          type: "resolve",
          requestId,
          reply: answer.reply,
          lines: answer.lines,
          meta: answer.meta,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({ type: "fail", requestId, error: toChatError(error) });
      } finally {
        abortRef.current.delete(requestId);
      }
    });
  }, []);

  const send = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return false;
      const requestId = newRequestId();
      const submit: Action = {
        type: "submit",
        requestId,
        question: text,
        at: Date.now(),
      };
      dispatch(submit);
      // Keep the ref in step now, so a second question in the same tick still
      // plans against the first one.
      turnsRef.current = reducer(
        {
          turns: turnsRef.current,
          restored: true,
          pool: poolRef.current,
          anchor: anchorRef.current,
        },
        submit,
      ).turns;
      run(requestId, text);
      return true;
    },
    [run],
  );

  const retry = useCallback(
    (requestId: string) => {
      const asked = turnsRef.current.find(
        (turn) => turn.role === "user" && turn.requestId === requestId,
      );
      if (!asked) return;
      dispatch({ type: "retry", requestId });
      run(requestId, asked.text);
    },
    [run],
  );

  const cancel = useCallback((requestId?: string) => {
    const ids = requestId
      ? [requestId]
      : turnsRef.current
          .filter(
            (turn) => turn.role === "assistant" && turn.status === "pending",
          )
          .map((turn) => turn.requestId);
    for (const id of ids) {
      abortRef.current.get(id)?.abort();
      abortRef.current.delete(id);
      dispatch({ type: "fail", requestId: id, error: coachError("cancelled") });
    }
  }, []);

  const reset = useCallback(() => {
    for (const controller of abortRef.current.values()) controller.abort();
    abortRef.current.clear();
    turnsRef.current = [];
    dispatch({ type: "reset" });
  }, []);

  const setPool = useCallback((pool: AiPool) => {
    poolRef.current = pool;
    dispatch({ type: "pool", pool });
  }, []);

  const setAnchor = useCallback((anchor: CoachAnchor) => {
    anchorRef.current = anchor;
    dispatch({ type: "anchor", anchor });
  }, []);

  /** Dev-only seam so the error and retry path can be exercised for real. */
  const failNext = useCallback((kind: ChatErrorKind) => {
    failOnceRef.current = kind;
  }, []);

  const pending = useMemo(
    () =>
      state.turns.filter(
        (turn) => turn.role === "assistant" && turn.status === "pending",
      ),
    [state.turns],
  );

  return {
    turns: state.turns,
    restored: state.restored,
    pool: state.pool,
    anchor: state.anchor,
    pending,
    busy: pending.length > 0,
    send,
    retry,
    cancel,
    reset,
    setPool,
    setAnchor,
    failNext,
  };
}
