"use client";

import { AdsConfigProvider } from "@/components/ads-config";
import type { AdsPublicConfig } from "@/lib/ads";
import { IntroTutorial } from "@/components/intro-tutorial";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { PitProvider } from "@/lib/store";

export function Providers({
  ads,
  children,
}: {
  ads: AdsPublicConfig;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <AdsConfigProvider initial={ads}>
        <AuthProvider>
          <PitProvider>
            {children}
            <IntroTutorial />
            <Toaster theme="dark" position="top-center" />
          </PitProvider>
        </AuthProvider>
      </AdsConfigProvider>
    </TooltipProvider>
  );
}
