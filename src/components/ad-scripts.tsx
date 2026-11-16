"use client";

import Script from "next/script";
import { useAds } from "@/components/ads-config";

export function AdScripts() {
  const ads = useAds();

  if (!ads.ready) return null;

  if (ads.mode === "adsense" && ads.adsenseClient) {
    return (
      <Script
        id="adsense"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ads.adsenseClient)}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    );
  }

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
