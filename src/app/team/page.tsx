import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamPage } from "../team-page";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Pick a dragon, read community three-dragon lines and reviews, then build your own formation.",
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
