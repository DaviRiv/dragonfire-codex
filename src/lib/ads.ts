/** AdSense publisher id (public; used in ads.txt and the ad script). */
export const ADSENSE_PUBLISHER_ID = "pub-9733653923474794";

/** AdSense customer id from the account page. */
export const ADSENSE_CUSTOMER_ID = "7154488834";

/** `ca-pub-…` client id the ad script expects. */
export function adsenseClientFromPublisher(publisher = ADSENSE_PUBLISHER_ID): string {
  const id = publisher.trim();
  if (id.startsWith("ca-pub-")) return id;
  if (id.startsWith("pub-")) return `ca-${id}`;
  return `ca-pub-${id}`;
}

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
    house: "Pick one dragon on Team — compare complete lines built around that name.",
    href: "/coach",
  },
  sidebar: {
    label: "Medium rectangle",
    sizes: [[300, 250]],
    house: "Forums are open for alliance recruiting, PvP cores, and rally talk.",
    href: "/forums",
  },
  "sidebar-lower": {
    label: "Half page",
    sizes: [[300, 250]],
    house: "Log stars in the pit so Suggest and Copilot (beta) can seat what you actually own.",
    href: "/pit",
  },
  feed: {
    label: "In-content",
    sizes: [[300, 250]],
    house: "Copilot (beta) builds complete lines around the dragon you select.",
    href: "/coach",
  },
  anchor: {
    label: "Mobile banner",
    sizes: [[320, 50]],
    house: "Recruit & discuss on Forums",
    href: "/forums",
  },
};

export type AdsPublicConfig = {
  mode: AdMode;
  adsenseClient: string;
  gptAdUnit: string;
  slots: Record<AdSlotId, string>;
};

/** Slot env names for app settings (also accepts legacy NEXT_PUBLIC_* locally). */
export const ADSENSE_ENV_NAMES = {
  client: "ADSENSE_CLIENT",
  slots: {
    billboard: "ADSENSE_SLOT_BILLBOARD",
    sidebar: "ADSENSE_SLOT_SIDEBAR",
    "sidebar-lower": "ADSENSE_SLOT_SIDEBAR_LOWER",
    feed: "ADSENSE_SLOT_FEED",
    anchor: "ADSENSE_SLOT_ANCHOR",
  },
} as const;
