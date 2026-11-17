import type { LineupMode, TroopType } from "@/lib/types";

export const TALK_CATEGORIES = [
  "recruitment",
  "lfa",
  "general",
  "pvp",
  "rally",
  "defense",
  "pve",
  "gathering",
] as const;

export type TalkCategory = (typeof TALK_CATEGORIES)[number];

export type ForumSectionId = "community" | "strategy";

export type ForumBoardMeta = {
  id: TalkCategory;
  section: ForumSectionId;
  label: string;
  shortLabel: string;
  description: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
};

export const FORUM_SECTIONS: { id: ForumSectionId; title: string }[] = [
  { id: "community", title: "Community & Recruiting" },
  { id: "strategy", title: "Strategy & Formations" },
];

export const FORUM_BOARDS: ForumBoardMeta[] = [
  {
    id: "recruitment",
    section: "community",
    label: "Alliance Recruitment",
    shortLabel: "Recruiting",
    description:
      "Recruit active players, announce alliance mergers, and post kingdom requirements.",
    titlePlaceholder:
      "e.g. [K42] Dragonstone Guard — recruiting active rally & KvK players",
    bodyPlaceholder:
      "Kingdom / server, power or activity expectations, rally schedule, and how to apply in-game or on Discord…",
  },
  {
    id: "lfa",
    section: "community",
    label: "Looking for Alliance",
    shortLabel: "LFA",
    description:
      "Solo players and small groups looking for an active alliance or rally crew.",
    titlePlaceholder:
      "e.g. [K42] Daily shield/spear player looking for an active rally alliance",
    bodyPlaceholder:
      "Current kingdom, main dragons & stars, timezone, and what kind of alliance you want to join…",
  },
  {
    id: "general",
    section: "community",
    label: "General Game Talk",
    shortLabel: "General",
    description:
      "Patch notes, events, progression tips, and everything Game of Thrones: Dragonfire.",
    titlePlaceholder:
      "e.g. Best use of star shards after maxing your first Vanguard?",
    bodyPlaceholder:
      "Share what you tested, event rewards, or questions for other players…",
  },
  {
    id: "pvp",
    section: "strategy",
    label: "PvP & Formations",
    shortLabel: "PvP",
    description:
      "Arena cores, open-field marches, counter picks, and three-dragon synergy.",
    titlePlaceholder:
      "e.g. Malachite / Vhagar / Venator on Shields — still the online core?",
    bodyPlaceholder:
      "Stars, troop type, who died first, and how the march held up…",
  },
  {
    id: "rally",
    section: "strategy",
    label: "Rallies & Bosses",
    shortLabel: "Rally",
    description:
      "Rally leads, joiner formations, boss clears, and damage optimization.",
    titlePlaceholder:
      "e.g. Spear rally lead vs Burn stack comps — which clears faster?",
    bodyPlaceholder:
      "Rally target, star levels, and joiner setups that worked…",
  },
  {
    id: "defense",
    section: "strategy",
    label: "Castle Defense",
    shortLabel: "Defense",
    description:
      "Keep garrisons, anti-rally walls, and keeping your frontline alive.",
    titlePlaceholder:
      "e.g. Best keep garrison soak when Vhagar is already out on a march",
    bodyPlaceholder:
      "Attacker comp, troop mix, and how long your wall held…",
  },
  {
    id: "pve",
    section: "strategy",
    label: "PvE & Campaign",
    shortLabel: "PvE",
    description:
      "Campaign stages, high-level tiles, and low-loss clearing.",
    titlePlaceholder:
      "e.g. Zero-healer vs double-healer for pushing campaign stages",
    bodyPlaceholder:
      "Stage or tile level, dragon stars, and troop losses…",
  },
  {
    id: "gathering",
    section: "strategy",
    label: "Gathering & Economy",
    shortLabel: "Economy",
    description:
      "Resource nodes, load capacity, stamina efficiency, and pit economy.",
    titlePlaceholder:
      "e.g. Best siege / gathering trio for overnight node clears",
    bodyPlaceholder:
      "Node tier, march speed, and carry capacity…",
  },
];

export const talkCategoryLabels: Record<TalkCategory, string> = Object.fromEntries(
  FORUM_BOARDS.map((board) => [board.id, board.label]),
) as Record<TalkCategory, string>;

export function forumBoardMeta(category: TalkCategory): ForumBoardMeta {
  return (
    FORUM_BOARDS.find((board) => board.id === category) ?? FORUM_BOARDS[2]
  );
}

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

export function talkLineHasDragon(
  line: TalkLine | null | undefined,
  dragonId: string,
): boolean {
  if (!line) return false;
  return (
    line.left === dragonId ||
    line.vanguard === dragonId ||
    line.right === dragonId
  );
}
