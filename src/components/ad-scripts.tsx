"use client";

import Script from "next/script";
import { useAds } from "@/components/ads-config";

export function AdScripts() {
  const ads = useAds();

  if (!ads.ready) return null;

  if (ads.mode === "gpt" && ads.gptAdUnit) {
    return (
      <Script
        id="gpt"
        src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
        strategy="afterInteractive"
      />
    );
  }

  return null;
}
