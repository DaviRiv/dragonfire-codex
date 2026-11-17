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
  const pushed = useRef(false);
  const ads = useAds();
  const slotId = ads.slot(slot);
  const liveAdsense =
    ads.ready && ads.mode === "adsense" && Boolean(ads.adsenseClient) && Boolean(slotId);
  const liveGpt = ads.ready && ads.mode === "gpt";
  const meta = AD_SLOT_META[slot];

  useEffect(() => {
    if (pushed.current) return;
    if (liveAdsense) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch {
        // Slot stays empty; house chrome still labels it.
      }
      return;
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

  if (!liveAdsense && !liveGpt) {
    return (
      <aside aria-label="Advertisement" className={cn("w-full", className)}>
        <p className="mb-1 text-center text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          Advertisement
        </p>
        <HouseAd slot={slot} />
      </aside>
    );
  }

  return (
    <aside aria-label="Advertisement" className={cn("w-full", className)}>
      <p className="mb-1 text-center text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        Advertisement
      </p>
      {liveAdsense ? (
        <ins
          className="adsbygoogle mx-auto block"
          style={{ display: "block" }}
          data-ad-client={ads.adsenseClient}
          data-ad-slot={slotId}
          data-ad-format={slot === "billboard" || slot === "anchor" ? "horizontal" : "rectangle"}
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
