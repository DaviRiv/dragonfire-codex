import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamPage } from "../team-page";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Pick one dragon. Highlight a three-dragon line to compare kit pros and cons on the right.",
};

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Opening team…</p>}
    >
      <TeamPage />
    </Suspense>
  );
}
