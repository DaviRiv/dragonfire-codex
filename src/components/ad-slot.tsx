"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { useAds } from "@/components/ads-config";
import { AD_SLOT_META, type AdSlotId } from "@/lib/ads";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    googletag?: {
      cmd: Array<() => void>;
      defineSlot: (
        path: string,
        sizes: [number, number] | [number, number][],
        id: string,
      ) => {
        addService: (svc: unknown) => {
          defineSizeMapping: (map: unknown) => unknown;
        };
      };
      pubads: () => {
        enableSingleRequest: () => void;
        collapseEmptyDivs: () => void;
      };
      sizeMapping: () => {
        addSize: (
          viewport: [number, number],
          sizes: [number, number][] | [number, number],
        ) => {
          addSize: (
            viewport: [number, number],
            sizes: [number, number][] | [number, number],
          ) => { build: () => unknown };
          build: () => unknown;
        };
      };
      enableServices: () => void;
      display: (id: string) => void;
    };
  }
}

function HouseAd({
  slot,
  className,
}: {
  slot: AdSlotId;
  className?: string;
}) {
  const meta = AD_SLOT_META[slot];
  const [w, h] = meta.sizes[0];
  const mobile = slot === "billboard" || slot === "anchor";
  return (
    <Link
      href={meta.href}
      className={cn(
        "flex flex-col items-center justify-center bg-card/70 text-center ring-1 ring-foreground/15 hover:bg-muted/60",
        mobile ? "h-[50px] w-full sm:h-[90px]" : "w-full",
        className,
      )}
      style={mobile ? undefined : { minHeight: h, maxWidth: w }}
    >
      <span
        className={cn(
          "max-w-[90%] px-2 leading-snug text-amber-100/90",
          mobile ? "line-clamp-1 text-[11px]" : "mt-0.5 text-[12px]",
        )}
      >
        {meta.house}
      </span>
    </Link>
  );
}

export function AdSlot({
  slot,
  className,
}: {
  slot: AdSlotId;
  className?: string;
}) {
  const reactId = useId().replace(/:/g, "");
  const elementId = `df-ad-${slot}-${reactId}`;
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const ads = useAds();
  const slotId = ads.slot(slot);
  const liveAdsense =
    ads.ready && ads.mode === "adsense" && Boolean(ads.adsenseClient) && Boolean(slotId);
  const liveGpt = ads.ready && ads.mode === "gpt";
  const showHouse = ads.ready && ads.mode === "house";
  const meta = AD_SLOT_META[slot];
  const [defaultW, defaultH] = meta.sizes[0];

  useEffect(() => {
    if (pushed.current) return;
    if (liveAdsense) {
      const el = insRef.current;
      if (!el) return;
      const pushAd = () => {
        if (pushed.current || el.offsetWidth <= 0) return false;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushed.current = true;
          return true;
        } catch {
          return false;
        }
      };
      if (pushAd()) return;
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => {
        if (pushAd()) observer.disconnect();
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
    if (!liveGpt) return;
    const existing = window.googletag;
    const g = (existing ?? {
      cmd: [] as Array<() => void>,
    }) as unknown as NonNullable<Window["googletag"]>;
    window.googletag = g;
    g.cmd.push(() => {
      if (pushed.current) return;
      const unit = `${ads.gptAdUnit}/${slot}`;
      const defined = g.defineSlot(unit, meta.sizes, elementId);
      if (!defined) return;
      defined.addService(g.pubads());
      g.pubads().enableSingleRequest();
      g.pubads().collapseEmptyDivs();
      g.enableServices();
      g.display(elementId);
      pushed.current = true;
    });
  }, [ads.gptAdUnit, elementId, liveAdsense, liveGpt, meta.sizes, slot]);

  if (!liveAdsense && !liveGpt && !showHouse) {
    return null;
  }

  if (showHouse) {
    return (
      <aside aria-label="Advertisement" className={cn("w-full", className)}>
        <p className="mb-1 text-center text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          Advertisement
        </p>
        <HouseAd slot={slot} />
      </aside>
    );
  }

  const banner = slot === "billboard" || slot === "anchor";

  return (
    <aside aria-label="Advertisement" className={cn("w-full", className)}>
      <p className="mb-1 text-center text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        Advertisement
      </p>
      {liveAdsense ? (
        <ins
          ref={insRef}
          className="adsbygoogle mx-auto block w-full"
          style={{
            display: "block",
            minHeight: defaultH,
            ...(banner ? {} : { maxWidth: defaultW }),
          }}
          data-ad-client={ads.adsenseClient}
          data-ad-slot={slotId}
          data-ad-format={banner ? "horizontal" : "rectangle"}
          data-full-width-responsive="true"
        />
      ) : (
        <div
          id={elementId}
          className="mx-auto min-h-[50px] bg-card/40 ring-1 ring-foreground/10"
        />
      )}
    </aside>
  );
}
