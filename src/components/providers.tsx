"use client";

import { IntroTutorial } from "@/components/intro-tutorial";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { PitProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>
        <PitProvider>
          {children}
          <IntroTutorial />
          <Toaster theme="dark" position="top-center" />
        </PitProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}
