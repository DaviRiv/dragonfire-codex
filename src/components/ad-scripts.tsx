"use client";

import Script from "next/script";
import { adMode, adsenseClient } from "@/lib/ads";

export function AdScripts() {
  const mode = adMode();

  if (mode === "adsense") {
    return (
      <Script
        id="adsense"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient()}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    );
  }

  if (mode === "gpt") {
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
