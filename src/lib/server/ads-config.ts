import {
  AD_SLOT_IDS,
  adsenseClientFromPublisher,
  type AdMode,
  type AdSlotId,
  type AdsPublicConfig,
} from "@/lib/ads";

function envPair(primary: string, legacy: string): string {
  return (process.env[primary] ?? process.env[legacy] ?? "").trim();
}

function asAdsenseClient(value: string): string {
  if (!value) return "";
  return value.startsWith("ca-pub-") || value.startsWith("pub-")
    ? adsenseClientFromPublisher(value)
    : value;
}

export function serverAdsConfig(): AdsPublicConfig {
  const configured = asAdsenseClient(
    envPair("ADSENSE_CLIENT", "NEXT_PUBLIC_ADSENSE_CLIENT"),
  );
  const gptAdUnit = envPair("GPT_AD_UNIT", "NEXT_PUBLIC_GPT_AD_UNIT");
  const slots = Object.fromEntries(
    AD_SLOT_IDS.map((slot) => {
      const key = slot.toUpperCase().replace(/-/g, "_");
      const legacy = `NEXT_PUBLIC_ADSENSE_SLOT_${key}`;
      const primary = `ADSENSE_SLOT_${key}`;
      return [slot, envPair(primary, legacy)] as const;
    }),
  ) as Record<AdSlotId, string>;

  let mode: AdMode = "house";
  let adsenseClient = configured;
  if (configured.startsWith("ca-pub-")) mode = "adsense";
  else if (gptAdUnit.startsWith("/")) mode = "gpt";
  else {
    mode = "adsense";
    adsenseClient = adsenseClientFromPublisher();
  }

  return { mode, adsenseClient, gptAdUnit, slots };
}

/** Numeric pub id for ads.txt (without ca-pub- prefix). */
export function adsensePublisherId(): string | null {
  const client = serverAdsConfig().adsenseClient;
  if (!client.startsWith("ca-pub-")) return null;
  return client.slice("ca-pub-".length);
}