"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiJson } from "@/lib/api";
import type { AdMode, AdSlotId, AdsPublicConfig } from "@/lib/ads";

type AdsContextValue = {
  ready: boolean;
  mode: AdMode;
  adsenseClient: string;
  gptAdUnit: string;
  slot: (id: AdSlotId) => string;
};

const HOUSE: AdsContextValue = {
  ready: true,
  mode: "house",
  adsenseClient: "",
  gptAdUnit: "",
  slot: () => "",
};

const AdsContext = createContext<AdsContextValue>(HOUSE);

function fromConfig(config: AdsPublicConfig): AdsContextValue {
  return {
    ready: true,
    mode: config.mode,
    adsenseClient: config.adsenseClient,
    gptAdUnit: config.gptAdUnit,
    slot: (id) => config.slots[id] ?? "",
  };
}

export function AdsConfigProvider({
  initial,
  children,
}: {
  initial?: AdsPublicConfig;
  children: ReactNode;
}) {
  const [value, setValue] = useState<AdsContextValue>(
    initial ? fromConfig(initial) : { ...HOUSE, ready: false },
  );

  useEffect(() => {
    let cancelled = false;
    void apiJson<AdsPublicConfig>("/api/ads/config")
      .then((config) => {
        if (!cancelled) setValue(fromConfig(config));
      })
      .catch(() => {
        if (!cancelled) setValue(HOUSE);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stable = useMemo(() => value, [value]);

  return <AdsContext.Provider value={stable}>{children}</AdsContext.Provider>;
}

export function useAds(): AdsContextValue {
  return useContext(AdsContext);
}