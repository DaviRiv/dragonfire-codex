"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PitProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <PitProvider>
        {children}
        <Toaster theme="dark" position="top-center" />
      </PitProvider>
    </TooltipProvider>
  );
}
