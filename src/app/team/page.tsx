import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamPage } from "../team-page";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Pick one dragon. Compare complete three-dragon lines built around that name, with kit pros and cons.",
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
