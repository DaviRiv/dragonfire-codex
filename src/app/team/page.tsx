import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamPage } from "../team-page";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Seat Left, Vanguard, and Right. Complete threes update as you lock each name.",
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
