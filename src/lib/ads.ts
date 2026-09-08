export const AD_SLOT_IDS = [
  "billboard",
  "sidebar",
  "sidebar-lower",
  "feed",
  "anchor",
] as const;

export type AdSlotId = (typeof AD_SLOT_IDS)[number];

export type AdMode = "adsense" | "gpt" | "house";

/** Wowhead-style IAB sizes: leaderboard, medium rectangle, half page, mobile banner. */
export const AD_SLOT_META: Record<
  AdSlotId,
  { label: string; sizes: [number, number][]; house: string; href: string }
> = {
  billboard: {
    label: "Leaderboard",
    sizes: [
      [728, 90],
      [320, 50],
    ],
    house: "Rate three-dragon lines on Boards — the pit table for what held in the field.",
    href: "/",
  },
  sidebar: {
    label: "Medium rectangle",
    sizes: [[300, 250]],
    house: "Talk is the hall for formations. Open a thread before the next rally.",
    href: "/talk",
  },
  "sidebar-lower": {
    label: "Half page",
    sizes: [[300, 250]],
    house: "Log stars in Hatchery so Suggest and Copilot (beta) can seat what you actually own.",
    href: "/hatchery",
  },
  feed: {
    label: "In-content",
    sizes: [[300, 250]],
    house: "Copilot is in beta. Register, pick a dragon, and seat a line — then discuss it in Talk.",
    href: "/coach",
  },
  anchor: {
    label: "Mobile banner",
    sizes: [[320, 50]],
    house: "Discuss teams in Talk",
    href: "/talk",
  },
};

export function adsenseClient(): string {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";
}

export function gptAdUnit(): string {
  return process.env.NEXT_PUBLIC_GPT_AD_UNIT?.trim() ?? "";
}

export function adMode(): AdMode {
  if (adsenseClient().startsWith("ca-pub-")) return "adsense";
  if (gptAdUnit().startsWith("/")) return "gpt";
  return "house";
}

export function adsenseSlot(slot: AdSlotId): string {
  const env: Record<AdSlotId, string | undefined> = {
    billboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BILLBOARD,
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
    "sidebar-lower": process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_LOWER,
    feed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED,
    anchor: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR,
  };
  return env[slot]?.trim() ?? "";
}
