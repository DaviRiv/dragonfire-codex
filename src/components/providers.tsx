"use client";

import { AdsConfigProvider } from "@/components/ads-config";
import { IntroTutorial } from "@/components/intro-tutorial";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { PitProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AdsConfigProvider>
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
