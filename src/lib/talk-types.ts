import type { LineupMode, TroopType } from "@/lib/types";

export const TALK_CATEGORIES = [
  "general",
  "pvp",
  "rally",
  "defense",
  "pve",
  "gathering",
] as const;

export type TalkCategory = (typeof TALK_CATEGORIES)[number];

export const talkCategoryLabels: Record<TalkCategory, string> = {
  general: "General",
  pvp: "PvP",
  rally: "Rally",
  defense: "Defense",
  pve: "PvE",
  gathering: "Gathering",
};

export type TalkLine = {
  name: string;
  troop: TroopType;
  mode: LineupMode;
  left: string;
  vanguard: string;
  right: string;
};

export type TalkReply = {
  id: string;
  username: string;
  text: string;
  createdAt: string;
};

export type TalkThreadSummary = {
  id: string;
  title: string;
  category: TalkCategory;
  author: string;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  lastReplyAt: string;
  lastReplyBy: string;
  line: TalkLine | null;
  boardId: string | null;
};

export type TalkThreadDetail = TalkThreadSummary & {
  body: string;
  replies: TalkReply[];
};

export function isTalkCategory(value: unknown): value is TalkCategory {
  return (
    typeof value === "string" &&
    (TALK_CATEGORIES as readonly string[]).includes(value)
  );
}
