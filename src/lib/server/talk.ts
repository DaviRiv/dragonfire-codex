import { getCatalogDragon } from "@/data/dragons";
import { randomBytes } from "node:crypto";
import {
  POST_MAX,
  postError,
  sanitizePost,
  sanitizeTitle,
  titleError,
} from "@/lib/talk";
import {
  isTalkCategory,
  talkLineHasDragon,
  type TalkCategory,
  type TalkLine,
  type TalkReply,
  type TalkThreadDetail,
  type TalkThreadSummary,
} from "@/lib/talk-types";
import { mutateJsonFile, readJsonFile } from "@/lib/server/json-store";
import { talkFile } from "@/lib/server/paths";
import type { SessionUser } from "@/lib/server/session";

export type TalkReplyRecord = TalkReply & { userId: string };

export type TalkThreadRecord = {
  id: string;
  title: string;
  body: string;
  category: TalkCategory;
  authorId: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  boardId: string | null;
  line: TalkLine | null;
  replies: TalkReplyRecord[];
};

type TalkFile = { threads: TalkThreadRecord[] };

const EMPTY: TalkFile = { threads: [] };

function toSummary(thread: TalkThreadRecord): TalkThreadSummary {
  const last = thread.replies[thread.replies.length - 1];
  return {
    id: thread.id,
    title: thread.title,
    category: thread.category,
    author: thread.author,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    replyCount: thread.replies.length,
    lastReplyAt: last?.createdAt ?? thread.createdAt,
    lastReplyBy: last?.username ?? thread.author,
    line: thread.line,
    boardId: thread.boardId,
  };
}

function toDetail(thread: TalkThreadRecord): TalkThreadDetail {
  return {
    ...toSummary(thread),
    body: thread.body,
    replies: thread.replies.map((row) => ({
      id: row.id,
      username: row.username,
      text: row.text,
      createdAt: row.createdAt,
    })),
  };
}

export async function listThreads(filter?: {
  category?: TalkCategory;
  dragonId?: string;
}): Promise<TalkThreadSummary[]> {
  const file = await readJsonFile(talkFile(), EMPTY);
  const dragonName = filter?.dragonId
    ? getCatalogDragon(filter.dragonId)?.name.toLowerCase()
    : undefined;
  const rows = file.threads.filter((thread) => {
    if (filter?.category && thread.category !== filter.category) return false;
    if (filter?.dragonId) {
      const onLine = talkLineHasDragon(thread.line, filter.dragonId);
      const inText = dragonName
        ? `${thread.title} ${thread.body}`.toLowerCase().includes(dragonName)
        : false;
      if (!onLine && !inText) return false;
    }
    return true;
  });
  return [...rows]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toSummary);
}

export async function getThread(id: string): Promise<TalkThreadDetail | null> {
  const file = await readJsonFile(talkFile(), EMPTY);
  const thread = file.threads.find((row) => row.id === id);
  return thread ? toDetail(thread) : null;
}

export async function createThread(
  user: SessionUser,
  input: {
    title: string;
    body: string;
    category: unknown;
    boardId?: string | null;
    line?: TalkLine | null;
  },
): Promise<TalkThreadDetail | { error: string }> {
  const titleErr = titleError(input.title);
  if (titleErr) return { error: titleErr };
  const bodyErr = postError(input.body);
  if (bodyErr) return { error: bodyErr };
  if (!isTalkCategory(input.category)) {
    return { error: "Pick a Talk category." };
  }
  const now = new Date().toISOString();
  const thread: TalkThreadRecord = {
    id: `tlk_${randomBytes(8).toString("hex")}`,
    title: sanitizeTitle(input.title),
    body: sanitizePost(input.body),
    category: input.category,
    authorId: user.id,
    author: user.username,
    createdAt: now,
    updatedAt: now,
    boardId: input.boardId?.trim() || null,
    line: input.line ?? null,
    replies: [],
  };
  await mutateJsonFile(talkFile(), EMPTY, (file) => ({
    threads: [thread, ...file.threads],
  }));
  return toDetail(thread);
}

export async function replyToThread(
  threadId: string,
  user: SessionUser,
  textRaw: string,
): Promise<TalkThreadDetail | { error: string }> {
  const err = postError(textRaw);
  if (err) return { error: err };
  const text = sanitizePost(textRaw);
  if (text.length > POST_MAX) return { error: postError(text) ?? "Too long." };
  const now = new Date().toISOString();
  let missing = false;
  const file = await mutateJsonFile(talkFile(), EMPTY, (current) => {
    const thread = current.threads.find((row) => row.id === threadId);
    if (!thread) {
      missing = true;
      return current;
    }
    thread.replies.push({
      id: `trp_${randomBytes(8).toString("hex")}`,
      userId: user.id,
      username: user.username,
      text,
      createdAt: now,
    });
    thread.updatedAt = now;
    return current;
  });
  if (missing) return { error: "That thread is gone." };
  const thread = file.threads.find((row) => row.id === threadId);
  if (!thread) return { error: "That thread is gone." };
  return toDetail(thread);
}
