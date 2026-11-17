import {
  detectIntent,
  detectMode,
  detectOrdinal,
  detectRoleTarget,
  detectTroop,
  directNames,
  type TurnIntent,
} from "@/lib/ai/intent";
import type { AiLine } from "@/lib/ai/prompt";
import type { RosterCard } from "@/lib/ai/roster";
import type { CompRole } from "@/lib/roles";
import type { LineupMode, SlotId, TroopType } from "@/lib/types";

export const DEFAULT_TROOP: TroopType = "shieldbearers";
export const DEFAULT_MODE: LineupMode = "pvp";

export type ChatRole = "user" | "assistant";
export type TurnStatus = "pending" | "done" | "error" | "cancelled";

export type ChatErrorKind =
  | "network"
  | "server"
  | "timeout"
  | "invalid"
  | "rate-limit"
  | "auth"
  | "cancelled"
  | "unknown";

export type ChatError = {
  kind: ChatErrorKind;
  message: string;
  retryable: boolean;
};

export type TurnMeta = {
  troop: TroopType;
  mode: LineupMode;
  pool: "pit" | "hatchery";
  intent: TurnIntent;
  /** Dragon names this answer deliberately left out. */
  skipped: string[];
  anchorId?: string | null;
  anchorSlot?: SlotId | null;
};

export type ChatTurn = {
  id: string;
  /** Shared by the user turn and the assistant turn that answers it. */
  requestId: string;
  role: ChatRole;
  text: string;
  createdAt: number;
  status: TurnStatus;
  lines?: AiLine[];
  error?: ChatError;
  meta?: TurnMeta;
};

/** What the thread remembers going into the next question. */
export type ThreadMemory = {
  troop: TroopType;
  mode: LineupMode;
  /** Sticky "leave them out" ids the player asked for earlier. */
  excluded: string[];
  /** Lines the last answer offered — what "those" and "another" refer to. */
  lines: AiLine[];
};

export type TurnPlan = {
  question: string;
  intent: TurnIntent;
  troop: TroopType;
  mode: LineupMode;
  /** Ids to keep out of this answer. */
  excludeIds: string[];
  /** Lines the question is talking about. */
  referenced: AiLine[];
  ordinal: number | null;
  roleTarget: CompRole | null;
  /** True when earlier turns shaped this plan. */
  followUp: boolean;
  anchorId?: string | null;
  anchorSlot?: SlotId | null;
};

export function isUserTurn(turn: ChatTurn): boolean {
  return turn.role === "user";
}

function lineSeats(line: AiLine): string[] {
  return [line.left, line.vanguard, line.right];
}

export function lineSignature(line: AiLine): string {
  return `${line.left}|${line.vanguard}|${line.right}`;
}

/**
 * Replay the thread to find the troop, mode, exclusions, and lines still in
 * play. Derived from the turns themselves so a reload cannot desync it.
 */
export function threadMemory(
  turns: ChatTurn[],
  roster: { id: string; name: string }[],
): ThreadMemory {
  let troop = DEFAULT_TROOP;
  let mode = DEFAULT_MODE;
  let excluded: string[] = [];
  let lines: AiLine[] = [];

  for (const turn of turns) {
    if (turn.role === "assistant") {
      if (turn.status === "done" && turn.lines?.length) lines = turn.lines;
      continue;
    }
    if (detectIntent(turn.text) === "reset") {
      excluded = [];
      troop = DEFAULT_TROOP;
      mode = DEFAULT_MODE;
      continue;
    }
    troop = detectTroop(turn.text) ?? troop;
    mode = detectMode(turn.text) ?? mode;
    const named = directNames(turn.text, roster);
    if (named.exclude.length > 0) {
      excluded = [...new Set([...excluded, ...named.exclude])];
    }
    if (named.include.length > 0) {
      excluded = excluded.filter((id) => !named.include.includes(id));
    }
  }

  return { troop, mode, excluded, lines };
}

/**
 * Resolve one new question against the thread. History supplies troop, mode,
 * exclusions, and what "those" points at; the question overrides them.
 */
export function planTurn(
  question: string,
  history: ChatTurn[],
  roster: RosterCard[],
  anchor?: {
    dragonId?: string | null;
    slot?: SlotId | null;
    troop?: TroopType;
    mode?: LineupMode;
  },
): TurnPlan {
  const text = question.trim();
  const memory = threadMemory(history, roster);
  const intent = detectIntent(text);
  const ordinal = detectOrdinal(text);
  const roleTarget = detectRoleTarget(text);
  const named = directNames(text, roster);
  const anchorId = anchor?.dragonId ?? null;
  const anchorSlot = anchor?.slot ?? null;

  if (intent === "reset") {
    return {
      question: text,
      intent,
      troop: detectTroop(text) ?? anchor?.troop ?? DEFAULT_TROOP,
      mode: detectMode(text) ?? anchor?.mode ?? DEFAULT_MODE,
      excludeIds: [],
      referenced: [],
      ordinal,
      roleTarget,
      followUp: false,
      anchorId,
      anchorSlot,
    };
  }

  const hasUser = history.some(isUserTurn);
  const troop =
    detectTroop(text) ?? (hasUser ? memory.troop : (anchor?.troop ?? memory.troop));
  const mode =
    detectMode(text) ?? (hasUser ? memory.mode : (anchor?.mode ?? memory.mode));

  let excludeIds = [...new Set([...memory.excluded, ...named.exclude])];
  if (named.include.length > 0) {
    excludeIds = excludeIds.filter((id) => !named.include.includes(id));
  }
  if (anchorId) {
    excludeIds = excludeIds.filter((id) => id !== anchorId);
  }

  const referenced =
    ordinal != null && memory.lines[ordinal]
      ? [memory.lines[ordinal]]
      : memory.lines;

  // "Replace the healer" points at a seat in the line we just offered.
  if (roleTarget && /\b(replace|swap|change|another|different)\b/i.test(text)) {
    const head = memory.lines[0];
    if (head) {
      const seat = seatForRole(head, roleTarget, roster);
      if (seat && seat !== anchorId) excludeIds = [...new Set([...excludeIds, seat])];
    }
  }

  // "Give me another one" must not hand back the same three names.
  if (intent === "another") {
    const head = ordinal != null ? memory.lines[ordinal] : memory.lines[0];
    if (head) {
      const seats = lineSeats(head).filter((id) => id !== anchorId);
      excludeIds = [...new Set([...excludeIds, ...seats])];
    }
  }

  const followUp =
    hasUser &&
    (intent !== "formation" ||
      memory.excluded.length > 0 ||
      detectTroop(text) == null ||
      detectMode(text) == null);

  return {
    question: text,
    intent,
    troop,
    mode,
    excludeIds,
    referenced,
    ordinal,
    roleTarget,
    followUp,
    anchorId,
    anchorSlot,
  };
}

function seatForRole(
  line: AiLine,
  role: CompRole,
  roster: RosterCard[],
): string | null {
  const short = { healing: "Heal", tanking: "Tank", damage: "DPS", control: "CC" }[
    role
  ];
  for (const id of lineSeats(line)) {
    const card = roster.find((row) => row.id === id);
    if (card?.jobs.includes(short)) return id;
  }
  return null;
}

/**
 * History to hand the ranker and the ChatGPT paste. Keeps recent turns and
 * caps characters so a long thread cannot grow the context without limit.
 */
export function historyForContext(
  turns: ChatTurn[],
  opts?: { maxTurns?: number; maxChars?: number },
): ChatTurn[] {
  const maxTurns = opts?.maxTurns ?? 12;
  const maxChars = opts?.maxChars ?? 4000;
  const settled = turns.filter(
    (turn) => turn.role === "user" || turn.status === "done",
  );
  const kept: ChatTurn[] = [];
  let chars = 0;
  for (let i = settled.length - 1; i >= 0; i--) {
    const turn = settled[i];
    const cost = turn.text.length + 12;
    if (kept.length >= maxTurns || chars + cost > maxChars) break;
    kept.unshift(turn);
    chars += cost;
  }
  // Never open the trimmed window on a dangling answer.
  while (kept.length > 0 && kept[0].role === "assistant") kept.shift();
  return kept;
}

/** Turns to persist. Pending work never survives a reload. */
export function turnsForStorage(
  turns: ChatTurn[],
  maxTurns = 40,
): ChatTurn[] {
  const settled = turns.filter(
    (turn) =>
      turn.role === "user" ||
      turn.status === "done" ||
      turn.status === "error" ||
      turn.status === "cancelled",
  );
  const trimmed = settled.slice(-maxTurns);
  while (trimmed.length > 0 && trimmed[0].role === "assistant") trimmed.shift();
  return trimmed;
}

export function isChatTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as Partial<ChatTurn>;
  if (typeof turn.id !== "string" || typeof turn.requestId !== "string") {
    return false;
  }
  if (turn.role !== "user" && turn.role !== "assistant") return false;
  if (typeof turn.text !== "string") return false;
  if (typeof turn.createdAt !== "number") return false;
  return (
    turn.status === "pending" ||
    turn.status === "done" ||
    turn.status === "error" ||
    turn.status === "cancelled"
  );
}

/** Drop anything a hand-edited or older save could have left behind. */
export function parseStoredTurns(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  const turns = value.filter(isChatTurn).map((turn) =>
    turn.status === "pending"
      ? {
          ...turn,
          status: "error" as TurnStatus,
          error: {
            kind: "cancelled" as ChatErrorKind,
            message: "That answer was interrupted by a reload.",
            retryable: true,
          },
        }
      : turn,
  );
  return turnsForStorage(turns);
}
